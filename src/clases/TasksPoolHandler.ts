import {TaskStatus} from "../enums/TaskStatus";

import Hero, {BlockedResourceType, ConnectionToHeroCore} from '@ulixee/hero';
import Core from '@ulixee/hero-core';
import {TransportBridge} from '@ulixee/net';

import Task from "./Task";
import * as OS from "os";
import {bytesToMegabytes} from "../helpers/OSHelper";
import {envBool, envInt, envString} from "../helpers/EnvHelper";
import {IpLookupServices} from "@ulixee/default-browser-emulator/lib/helpers/lookupPublicIp";
import TimeoutError from "@ulixee/commons/interfaces/TimeoutError";
import Logger from "./Logger";
import {clearTimeout} from "timers";

export default class TasksPoolHandler {
    private readonly maxConcurrency: number;
    private readonly queueTimeout: number;
    private readonly initTimeout: number;
    private readonly sessionTimeout: number;
    private readonly upstreamProxyUrl: string|null;
    private readonly blockedResourceTypes: BlockedResourceType[];
    private isRunning: boolean = false;
    private readonly timer?: NodeJS.Timer;
    private readonly connectionToCore: ConnectionToHeroCore;
    private pool: Task[] = [];
    private queue: Task[] = [];
    private counter = {
        resolve: 0,
        reject: 0,
        throw: 0,
        init_error: 0,
        bad_args: 0,
        queue_timeout: 0,
        init_timeout: 0,
        session_timeout: 0,
    };
    public constructor(
        maxConcurrency: number,
        queueTimeout: number = 30000,
        initTimeout: number = 15000,
        sessionTimeout: number = 60000,
        upstreamProxyUrl: string | null = null,
        blockedResourceTypes: BlockedResourceType[] = []
    ) {
        this.maxConcurrency = envInt('MAX_CONCURRENCY') ?? maxConcurrency;

        //Timeouts
        this.queueTimeout = envInt('QUEUE_TIMEOUT') ?? queueTimeout;
        this.initTimeout = envInt('INIT_TIMEOUT') ?? initTimeout;
        this.sessionTimeout = envInt('SESSION_TIMEOUT') ?? sessionTimeout;

        this.upstreamProxyUrl = envString('UPSTREAM_PROXY_URL') ?? upstreamProxyUrl;
        this.blockedResourceTypes = blockedResourceTypes;

        const bridge = new TransportBridge();
        this.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore, {
            instanceTimeoutMillis: this.sessionTimeout,
            maxConcurrency: this.maxConcurrency * 4
        });
        this.connectionToCore.on('disconnected', () => this.onDisconnected())
        Core.onShutdown = () => this.onDisconnected();

        Core.addConnection(bridge.transportToClient);

        this.isRunning = true;
        this.timer = setInterval(() => this.tick(), 10);
    }

    public push(task: Task): void {
        task.status = TaskStatus.QUEUE;

        //QUEUE_TIMEOUT Watchdog
        task.timer = setTimeout(async () => {
            const isInPool = this.pool.includes(task);
            const message = `TaskPool: ${isInPool ? 'Init' : 'Queue'} Timeout, pool: ${this.pool.length}, queue: ${this.queue.length}`;
            console.warn(message);
            task.fulfill(TaskStatus.QUEUE_TIMEOUT, null, message);
            this.counter.queue_timeout++;

            clearTimeout(task.timer!);
        }, this.queueTimeout);

        this.queue.push(task);
    }

    private execute(task: Task): void {
        task.status = TaskStatus.RUNNING;

        //INIT_TIMEOUT Watchdog
        clearTimeout(task.timer!);
        task.timer = setTimeout(async () => {
            task.fulfill(TaskStatus.INIT_TIMEOUT, null, 'TaskPool: Agent: Too long Hero init');
            this.counter.init_timeout++;
            clearTimeout(task.timer!);
        }, this.initTimeout);

        const instance = new Hero({
            blockedResourceTypes: this.blockedResourceTypes,
            upstreamProxyUrl: this.upstreamProxyUrl ?? undefined,
            upstreamProxyIpMask: {
                ipLookupService: IpLookupServices.aws,
            },
            ...task.options,
            showChrome: envBool('SHOW_CHROME'),
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

                //SESSION_TIMEOUT Watchdog
                task.timer = setTimeout(async () => {
                    this.counter.session_timeout++;
                    task.fulfill(TaskStatus.SESSION_TIMEOUT, null, 'Task: Script: Session Timeout');
                    clearTimeout(task.timer!);
                }, this.sessionTimeout);

                //@ts-ignore we have Omit<Hero, "then">, but to reduce complexity we represent as Hero
                task.promise(agent)
                    .then(async () => {
                        this.counter.resolve++;
                    })
                    .catch(async (error) => {
                        if (!task.getIsFulfilled()) {
                            (error instanceof Error && error.name === 'TaskOuterCatch') ? this.counter.throw++ : this.counter.reject++;
                        }
                    })
                    .finally(async () => {
                        clearTimeout(task.timer!);
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
                //Socks5ProxyConnectError, same as HttpProxyConnectError above
                else if (error instanceof Error && error.name == 'Socks5ProxyConnectError') {
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
        this.pool = this.pool.filter((task) => [TaskStatus.RUNNING, TaskStatus.QUEUE].includes(task.status))
        this.queue = this.queue.filter((task) => TaskStatus.QUEUE_TIMEOUT !== task.status);

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
                this.pool = this.pool.filter((task) => [TaskStatus.RUNNING, TaskStatus.QUEUE].includes(task.status))
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
        return Object.values(this.counter).reduce((a, b) => a + b, 0);
    }

    public getIsRunning(): boolean {
        return this.isRunning;
    }

    public incrementCounterBadArgs() : void {
        this.counter.bad_args++;
    }

}