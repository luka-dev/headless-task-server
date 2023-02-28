import {describe, expect, test} from '@jest/globals';
import TasksPoolHandler from "../src/clases/TasksPoolHandler";
import Hero from "@ulixee/hero";
import Task from "../src/clases/Task";
import {TaskStatus} from "../src/enums/TaskStatus";

describe('Hero single thread', () => {
    let handler: TasksPoolHandler;
    beforeAll(() => {
        handler = new TasksPoolHandler(1);
    });

    afterAll(() => {
        handler.close();
    });

    test('example domain title', (done) => {
        const script = async (agent: Hero, resolve: (output?: any) => void, reject: (error?: any) => void) => {
           await agent.goto('https://example.com/');
           resolve(await agent.document.title)
        };

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
                expect(task.status).toBe(TaskStatus.DONE);
                expect(task.output).toBe('Example Domain');
                done();
            });
    });

    test('creepjs test', (done) => {
        const script = async (agent: Hero, resolve: (output?: any) => void, reject: (error?: any) => void) => {
            await agent.goto('https://abrahamjuliot.github.io/creepjs/');
            await agent.waitForPaintingStable();
            resolve(
                parseFloat((
                        await agent.document
                            .querySelector('#fingerprint-data > div.visitor-info > div > div:nth-child(2) > div:nth-child(2) > span')
                            .textContent
                    )
                        ?.replace('%', '').trim()
                    ??
                    '0'
                )
            )
        };

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
                console.log(task.output);
                expect(task.status).toBe(TaskStatus.DONE);
                expect(task.output).toBeGreaterThan(50);
                done();
            });
    })
});