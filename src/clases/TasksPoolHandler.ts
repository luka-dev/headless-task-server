import AsyncFunction from "../helpers/AsyncFuncion";
import {TaskStatus} from "../enums/TaskStatus";

import Hero, { ConnectionToHeroCore } from '@ulixee/hero';
import Core from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';

import Task from "./Task";

export default class TasksPoolHandler {
    private readonly threads: number;
    private readonly sessionTimeout: number;
    private readonly timer?: NodeJS.Timer;
    private readonly connectionToCore: ConnectionToHeroCore;
    private pool: Task[] = [];
    private queue: Task[] = [];

    public constructor(threads: number, sessionTimeout: number = 60000) {
        this.threads = threads;
        this.sessionTimeout = sessionTimeout;
        const bridge = new TransportBridge();
        this.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore, {
            instanceTimeoutMillis: sessionTimeout,
            maxConcurrency: threads,
        });
        Core.addConnection(bridge.transportToClient);

        this.timer = setInterval(() => this.tick(), 10);
    }

    public process(task: Task, callback: (task:Task) => any): void {
        task.promise = () => {
            const promise = new Promise<void>(async (resolve, reject) => {
                task.timings.begin();
                task.status = TaskStatus.RUNNING;

                const context = (function (agent: Hero) {
                    return new Promise<any>((resolve, reject) => (new AsyncFunction('resolve', 'reject', 'agent', `${task.script};resolve();`))(resolve, reject, agent));
                });

                new Hero({
                    ...task.options,
                    userProfile: task.profile,
                    connectionToCore: this.connectionToCore
                }).then((agent) => {
                        if (!(agent instanceof Hero)) {
                            console.error('Agent is not instance of Hero');
                            task.timings.end();
                            task.status = TaskStatus.INIT_ERROR;
                            task.error = 'Agent is not instance of Hero';
                            reject();
                            return;
                        }

                        setTimeout(async () => {
                            task.timings.end();
                            task.status = TaskStatus.TIMEOUT;
                            task.error = new Error('Session Timeout');
                            reject();
                            await agent.close();
                        }, this.sessionTimeout);

                        const runtime = context(agent);

                        runtime
                            .then(async (output: any) => {
                                task.timings.end();
                                task.status = TaskStatus.DONE;
                                task.output = output;
                                task.profile = await agent.exportUserProfile();
                                resolve();
                            })
                            .catch(async (error: any) => {
                                task.timings.end();
                                task.status = TaskStatus.FAILED;
                                task.error = error?.toString();
                                reject();
                            })
                            .finally(async () => {
                                await agent?.close();
                            })
                }, (error) => {
                    console.error('Agent(Hero) init error', error);
                    task.timings.end();
                    task.status = TaskStatus.INIT_ERROR;
                    task.error = error;
                    reject();
                });
            });
            promise.finally(() => {callback(task)});
            return promise;
        }

        task.status = TaskStatus.QUEUE;
        this.queue.push(task);

    }

    private tick(): void {
        this.pool = this.pool.filter((task) => ![TaskStatus.TIMEOUT, TaskStatus.DONE, TaskStatus.FAILED].includes(task.status))
        if (this.pool.length < this.threads && this.queue.length > 0) {
            const task = this.queue.shift()!;
            this.pool.push(task);
            task.promise!();
        }
    }

    public close(): void {
        clearInterval(this.timer);
    }

}