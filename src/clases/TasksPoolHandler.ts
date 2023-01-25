import AsyncFunction from "../helpers/AsyncFuncion";
import {TaskStatus} from "../enums/TaskStatus";

import Hero from '@ulixee/hero';
import Core from '@ulixee/hero-core';
import Miner from '@ulixee/miner';
import Task from "./Task";
import {log} from "util";

export default class TasksPoolHandler {
    private readonly threads: number;
    private readonly sessionTimeout: number;
    private timer?: NodeJS.Timer;
    private readonly miner: Miner;
    private address?: string;
    private pool: Task[] = [];
    private queue: Task[] = [];

    public constructor(threads: number, sessionTimeout: number = 60000) {
        this.threads = threads;
        this.sessionTimeout = sessionTimeout;
        this.miner = new Miner();
        this.miner.listen()
            .then(() => {
                this.miner.address
                    .then((address: string) => {
                        this.address = address;
                        this.timer = setInterval(() => this.tick(), 10);
                    })
            })
            .catch((error: Error) => {
                console.error(error);
                process.exit(0);
            });

    }

    public process(task: Task, callback: (task:Task) => any): void {
        task.promise = () => {
            const promise = new Promise<void>(async (resolve, reject) => {
                task.timings.begin();
                task.status = TaskStatus.RUNNING;

                setTimeout(() => {
                    task.timings.end();
                    task.status = TaskStatus.TIMEOUT;
                    task.error = new Error('Session Timeout');
                    reject();
                }, this.sessionTimeout);

                const context = (function (agent: Hero) {
                    return new Promise<any>((resolve, reject) => (new AsyncFunction('resolve', 'reject', 'agent', task.script))(resolve, reject, agent));
                });

                try {

                    const agent = new Hero({
                        ...task.options,
                        userProfile: task.profile,
                        connectionToCore: {host: this.address}
                    });

                    const runtime = context(agent);

                    runtime
                        .then(async (output: any) => {
                            task.timings.end();
                            task.status = TaskStatus.DONE;
                            task.output = output;
                            task.profile = await agent.exportUserProfile();
                            await agent.close();
                            resolve();
                        })
                        .catch(async (error: any) => {
                            task.timings.end();
                            task.status = TaskStatus.FAILED;
                            task.error = error?.toString();
                            await agent.close();
                            reject();
                        })
                } catch (error) {
                    task.timings.end();
                    task.status = TaskStatus.INIT_ERROR;
                    task.error = error;
                    reject();
                }
            });
            promise.finally(() => {callback(task)});
            return promise;
        }

        task.status = TaskStatus.QUEUE;
        this.queue.push(task);

    }

    private tick(): void {
        this.pool = this.pool.filter((task) => ![TaskStatus.TIMEOUT, TaskStatus.DONE, TaskStatus.FAILED].includes(task.status))
        // console.log(this.pool.length, this.queue.length);
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