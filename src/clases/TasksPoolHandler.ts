import AsyncFunction from "../helpers/AsyncFuncion";
import {TaskStatus} from "../enums/TaskStatus";

import Hero, {BlockedResourceType, ConnectionToHeroCore} from '@ulixee/hero';
import Core from '@ulixee/hero-core';
import {TransportBridge} from '@ulixee/net';

import Task from "./Task";
import * as OS from "os";
import {bytesToMegabytes} from "../helpers/OSHelper";
import {envBool, envInt} from "../helpers/EnvHelper";
import {IpLookupServices} from "@ulixee/default-browser-emulator/lib/helpers/lookupPublicIp";

export default class TasksPoolHandler {
    private readonly maxConcurrency: number;
    private readonly sessionTimeout: number;
    private readonly queueTimeout: number;
    private readonly upstreamProxyUrl: string|null;
    private readonly blockedResourceTypes: BlockedResourceType[];
    private readonly timer?: NodeJS.Timer;
    private readonly connectionToCore: ConnectionToHeroCore;
    private pool: Task[] = [];
    private queue: Task[] = [];
    private counter = {
        done: 0,
        error: 0,
        session_timeout: 0,
        queue_timeout: 0,
    };
    public constructor(
        maxConcurrency: number,
        sessionTimeout: number = 60000,
        queueTimeout: number = 30000,
        upstreamProxyUrl: string | null = null,
        blockedResourceTypes: BlockedResourceType[] = []
    ) {
        this.maxConcurrency = envInt('MAX_CONCURRENCY') ?? maxConcurrency;
        this.sessionTimeout = envInt('SESSION_TIMEOUT') ?? sessionTimeout;
        this.queueTimeout = envInt('QUEUE_TIMEOUT') ?? queueTimeout;
        this.upstreamProxyUrl = process.env.upstreamProxyUrl ?? upstreamProxyUrl;
        this.blockedResourceTypes = blockedResourceTypes;

        const bridge = new TransportBridge();
        this.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore, {
            instanceTimeoutMillis: this.sessionTimeout,
            maxConcurrency: this.maxConcurrency * 2,
        });

        this.connectionToCore.on('disconnected', this.onDisconnected)
        Core.onShutdown = this.onDisconnected;

        Core.addConnection(bridge.transportToClient);

        this.timer = setInterval(() => this.tick(), 10);
    }

    public process(task: Task, callback: (task:Task) => any): void {
        const queueTimer = setTimeout(async () => {
            task.isFulfilled = true;
            task.timings.end();
            console.warn('Task Queue Timeout');
            task.status = TaskStatus.TIMEOUT;
            this.counter.queue_timeout++;
            task.error = new Error('Queue Timeout');
            callback(task);
        }, this.queueTimeout);

        task.promise = () => {
            const promise = new Promise<void>(async (resolve, reject) => {

                const context = (function (agent: Hero) {
                    return new Promise<any>((resolve, reject) => (
                            new AsyncFunction(
                                'resolve',
                                'reject',
                                'agent',
                                `try{${task.script};resolve();}catch(e){reject(e);}`
                            )
                        )
                        (resolve, reject, agent)
                    );
                });

                new Hero({
                    blockedResourceTypes: this.blockedResourceTypes,
                    upstreamProxyUrl: this.upstreamProxyUrl ?? undefined,
                    upstreamProxyIpMask: {
                      ipLookupService: IpLookupServices.ipify,
                    },
                    ...task.options,
                    showChrome: false,
                    userProfile: task.profile,
                    connectionToCore: this.connectionToCore
                })
                    .then(
                        async (agent) => {
                            const agentClose = async () => {
                                if (agent instanceof Hero) {
                                    try {
                                        await agent.close();
                                    } catch (error) {
                                        console.error('Error closing agent', error);
                                    }
                                } else {
                                    console.warn('Wierd agent', agent);
                                }
                            }

                            if (!(agent instanceof Hero)) {
                                console.error('Agent is not instance of Hero');
                                task.timings.end();
                                task.status = TaskStatus.INIT_ERROR;
                                task.error = 'Agent is not instance of Hero';
                                await agentClose();
                                reject();
                                return;
                            }

                            if (task.isFulfilled) {
                                await agentClose();
                                reject();
                                return;
                            }

                            clearInterval(queueTimer);
                            task.timings.begin();
                            task.status = TaskStatus.RUNNING;

                            setTimeout(async () => {
                                if (!task.isFulfilled) {
                                    task.isFulfilled = true;
                                    task.timings.end();
                                    console.warn('Task Execution Session Timeout');
                                    task.status = TaskStatus.TIMEOUT;
                                    this.counter.session_timeout++;
                                    task.error = new Error('Execution Session Timeout');
                                    await agentClose();
                                    reject();
                                }
                            }, this.sessionTimeout);

                            const runtime = context(agent);

                            runtime
                                .then(async (output: any) => {
                                    if (!task.isFulfilled) {
                                        task.isFulfilled = true;
                                        task.timings.end();
                                        task.status = TaskStatus.DONE;
                                        this.counter.done++;
                                        task.output = output;
                                        task.profile = await agent.exportUserProfile();
                                        await agentClose();
                                        resolve();
                                    }
                                })
                                .catch(async (error: any) => {
                                    if (!task.isFulfilled) {
                                        task.isFulfilled = true;
                                        task.timings.end();
                                        console.warn('Task Error', error);
                                        task.status = TaskStatus.FAILED;
                                        this.counter.error++;
                                        task.error = error;
                                        await agentClose();
                                        reject();
                                    }
                                });
                        },
                        (error) => {
                            console.error('Agent(Hero) init error', error);
                            task.timings.end();
                            task.status = TaskStatus.INIT_ERROR;
                            task.error = error;
                            reject();
                            this.onDisconnected();
                        }
                    );
            });
            promise.finally(() => {callback(task)});
            return promise;
        }

        task.status = TaskStatus.QUEUE;
        this.queue.push(task);
    }
    private tick(): void {
        this.pool = this.pool.filter((task) => [TaskStatus.CREATED, TaskStatus.RUNNING, TaskStatus.QUEUE].includes(task.status))
        this.queue = this.queue.filter((task) => TaskStatus.TIMEOUT !== task.status);

        if (this.pool.length < this.maxConcurrency && this.queue.length > 0) {
            const freeMemory = bytesToMegabytes(OS.freemem());
            //Hard limit to avoid crash
            if (freeMemory < 500 && !envBool('CONCURRENCY_DISABLE_MEM_LIMITER')) {
                console.warn(`Low memory alert: ${freeMemory}MB, tasks queue: ${this.queue.length}, tasks pool: ${this.pool.length}, new task run prevented to avoid crash.`);
                return;
            }

            const task = this.queue.shift()!;
            this.pool.push(task);
            task.promise!();
        }
    }

    private onDisconnected(): void {
        this.close();
        console.error('Hero Core Shutdown');
        this.queue.forEach((task: Task) => {
            task.isFulfilled = true;
            task.timings.end();
            task.status = TaskStatus.FAILED;
            task.error = new Error('Hero Core Shutdown');
            this.counter.error++;
        });
        process.exit(1);
    }

    public close(): void {
        clearInterval(this.timer);
    }
    public getPoolLength(): number {
        return this.pool.length;
    }
    public getQueueLength(): number {
        return this.queue.length;
    }
    public getCounter() {
        return this.counter;
    }
    public getCounterTotal(): number {
        return this.counter.done + this.counter.error + this.counter.session_timeout + this.counter.queue_timeout;
    }
}