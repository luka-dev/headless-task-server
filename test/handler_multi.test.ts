import {describe, expect, test} from '@jest/globals';
import TasksPoolHandler from "../src/clases/TasksPoolHandler";
import Hero from "@ulixee/hero";
import Task from "../src/clases/Task";
import {TaskStatus} from "../src/enums/TaskStatus";
describe('Hero multi thread', () => {
    let handler: TasksPoolHandler;
    beforeAll(() => {
        handler = new TasksPoolHandler(10);
    });

    afterAll(() => {
        handler.close();
    });

    test('example domain title equal threads', (done) => {
        let promises = [];

        const script = async (agent: Hero, resolve: (output?: any) => void, reject: (error?: any) => void) => {
            await agent.goto('https://example.com/');
            resolve(await agent.document.title)
        };

        for (let i = 0; i < 10; i++) {
            promises.push(new Promise<void>((resolve) => {
                handler.process(
                    new Task(script
                        .toString()
                        .substring(
                            script.toString().indexOf('{') + 1,
                            script.toString().length - 1
                        )
                        .trim()
                    ),
                    (task: Task) => {
                        if (task.status !== TaskStatus.DONE) {
                            console.error(task.error);
                        }
                        expect(task.status).toBe(TaskStatus.DONE);
                        expect(task.output).toBe('Example Domain');
                        resolve();
                    });
            }));
        }

        Promise.allSettled(promises).finally(() => done());
    }, 20000);

    test('example domain title overflow threads', (done) => {
        let promises = [];

        const script = async (agent: Hero, resolve: (output?: any) => void, reject: (error?: any) => void) => {
            await agent.goto('https://example.com/');
            resolve(await agent.document.title)
        };

        for (let i = 0; i < 100; i++) {
            promises.push(new Promise<void>((resolve) => {
                handler.process(
                    new Task(script
                        .toString()
                        .substring(
                            script.toString().indexOf('{') + 1,
                            script.toString().length - 1
                        )
                        .trim()
                    ),
                    (task: Task) => {
                        if (task.status !== TaskStatus.DONE) {
                            console.error(task.error);
                        }
                        expect(task.status).toBe(TaskStatus.DONE);
                        expect(task.output).toBe('Example Domain');
                        resolve();
                    });
            }));
        }

        Promise.allSettled(promises).finally(() => done());
    }, 60000);
});