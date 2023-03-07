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
import TimeoutError from "@ulixee/commons/interfaces/TimeoutError";
import Logger from "./Logger";

export default class TasksPoolHandler {
    private readonly maxConcurrency: number;
    private readonly sessionTimeout: number;
    private readonly queueTimeout: number;
    private readonly upstreamProxyUrl: string|null;
    private readonly blockedResourceTypes: BlockedResourceType[];

    private isRunning: boolean = false;
    private readonly timer?: NodeJS.Timer;
    private readonly connectionToCore: ConnectionToHeroCore;
    private pool: Task[] = [];
    private queue: Task[] = [];
    private counter = {
        done: 0,
        failed: 0,
        session_timeout: 0,
        queue_timeout: 0,
        init_error: 0,
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

        this.isRunning = true;
        this.timer = setInterval(() => this.tick(), 10);
    }

    public push(task: Task): void {

        task.status = TaskStatus.QUEUE;
        task.timer = setTimeout(async () => {
            const message = 'TaskPool: Queue: Timeout';
            console.warn(message);
            task.fulfill(TaskStatus.TIMEOUT, null, message);
            this.counter.queue_timeout++;

            clearTimeout(task.timer!);
            task.timer = null;
        }, this.queueTimeout);

        this.queue.push(task);
    }

    private execute(task: Task): void {
        task.status = TaskStatus.RUNNING;

        // clearTimeout(task.timer!);
        // task.timer = setInterval(async () => {
        //     //TODO: Timer for agent creation
        //     task.fulfill(TaskStatus.INIT_ERROR, null, 'TaskPool: Agent: Too long Hero init');
        // }, 30000);

        const instance = new Hero({
            blockedResourceTypes: this.blockedResourceTypes,
            upstreamProxyUrl: this.upstreamProxyUrl ?? undefined,
            upstreamProxyIpMask: {
                ipLookupService: IpLookupServices.aws,
            },
            ...task.options,
            showChrome: false,
            userProfile: task.profile,
            connectionToCore: this.connectionToCore
        });

        instance
            .then(async (agent) => {
                clearTimeout(task.timer!);
                if (task.getIsFulfilled()) {
                    await agent.close();
                    return;
                }

                task.timer = setInterval(async () => {
                    task.fulfill(TaskStatus.TIMEOUT, null, 'Task: Script: Session Timeout');
                }, this.sessionTimeout);

                //@ts-ignore we have Omit<Hero, "then">, but to reduce complexity we are using Hero
                task.promise(agent)
                    .then(async (output: any) => {
                        this.counter.done++;
                    })
                    .catch(async (error: any) => {
                        this.counter.failed++;
                    })
                    .finally(async () => {
                        clearInterval(task.timer!);
                        await agent.close();
                    });
            })
            .catch(async (error) => {
                clearTimeout(task.timer!);

                //TimeoutError while connecting IpLookupServices for proxy check
                //Possible error in proxy or target is down
                if (error instanceof TimeoutError && error.message.includes('Timeout connecting to')) {
                    task.fulfill(TaskStatus.INIT_ERROR, null, `TaskPool: Agent: Proxy: ${error.name}: ${error.message}`);
                    await instance.close();
                }
                //HttpProxyConnectError: Http Proxy Connect Error connection refused (404)
                //form "@ulixee/unblocked-agent-mitm-socket" not exported
                else if (error instanceof Error && error.name == 'HttpProxyConnectError') {
                    task.fulfill(TaskStatus.INIT_ERROR, null, `TaskPool: Agent: Proxy: ${error.name}: ${error.message}`);
                    await instance.close();
                }
                //handle fatal error, recommend to close all agents and restart app
                else {
                    console.error(`TaskPool: Hero Core Init Error:  ${error.name}: ${error.message}`);
                    task.fulfill(TaskStatus.INIT_ERROR, null, `TaskPool: Agent: ${error.name}: ${error.message}`);
                    this.close();
                    await instance.close();
                    console.warn('TaskPool: Hero Core Shutdown, waiting for pool to finish');
                    this.onDisconnected()
                }
            });
    }

    private tick(): void {
        this.pool = this.pool.filter((task) => [TaskStatus.CREATED, TaskStatus.RUNNING, TaskStatus.QUEUE].includes(task.status))
        this.queue = this.queue.filter((task) => TaskStatus.TIMEOUT !== task.status);

        if (this.pool.length < this.maxConcurrency && this.queue.length > 0) {
            const freeMemory = bytesToMegabytes(OS.freemem());
            //Hard limit to avoid crash
            if (freeMemory < 500 && !envBool('CONCURRENCY_DISABLE_MEM_LIMITER')) {
                console.warn(`TaskPool: Tick: Low on free memory alert ${freeMemory}MB`);
                return;
            }

            const task = this.queue.shift()!;
            this.pool.push(task);
            this.execute(task);
        }
    }

    public close(): void {
        clearInterval(this.timer);
        this.isRunning = false;

        console.warn('TaskPool: Queue: Stopped');
        console.warn('TaskPool: Queue: Clearing queue');

        this.queue.forEach((task: Task) => {
            task.fulfill(TaskStatus.INIT_ERROR, null, 'TaskPool: Queue: Hero Core Shutdown');
        });

    }

    public onDisconnected() {
        new Promise<void>((resolve) => {
            setInterval(() => {
                if (this.pool.length === 0) {
                    resolve();
                }
            }, 10);
        })
            .finally(() => {
                console.warn('TaskPool: Hero Core Shutdown, pool finished');
                Logger.sendLogs()
                    .finally(() => {
                        console.warn('TaskPool: Logger: Hero Core Shutdown, logs sent');
                        process.exit(1);
                    });
            })
    }

    public poolLength(): number {
        return this.pool.length;
    }
    public queueLength(): number {
        return this.queue.length;
    }
    public getCounter() {
        return this.counter;
    }
    public getCounterTotal(): number {
        return this.counter.done + this.counter.failed + this.counter.session_timeout + this.counter.queue_timeout + this.counter.init_error;
    }

    public getIsRunning(): boolean {
        return this.isRunning;
    }
}