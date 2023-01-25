import TasksPoolHandler from "./clases/TasksPoolHandler";
import {TaskStatus} from "./enums/TaskStatus";
import {ISODate} from "./helpers/ISODate";
import WebServer from "./clases/WebServer";
import {readFileSync} from "fs";
import * as OS from "os";
import ITasksPoolHandler from "./types/ITasksPoolHandler";
import IWebServerConfig from "./types/IWebServerConfig";
import Task from "./clases/Task";


process.on('warning', e => console.warn(e.stack));
process.on('uncaughtException', e => console.warn(e.stack))

const config: IWebServerConfig & ITasksPoolHandler = JSON.parse(readFileSync(__dirname + '/../config.json', 'utf8'));

const webServer = new WebServer(config.SERVER_PORT);
webServer.setAuthKey(config.AUTH_KEY);
webServer.start()
    .on('listening', () => {

        const tasksHandler = new TasksPoolHandler(config.MAX_CONCURRENCY, config.DEFAULT_SESSION_TIMEOUT)
        console.log('Browser Handler runned');

        const buildTimeStamp: string | null = readFileSync('./dist/buildtimestamp', 'utf8').trim() ?? null;
        const runTimeStamp: string | null = (new ISODate()).toString();

        webServer.get('/', (request, response) => {
            response.json({
                health: 'ok',
            });
        });

        webServer.get('/stats', (request, response) => {
            response.json({
                build_timestamp: buildTimeStamp,
                run_timestamp: runTimeStamp,
                task_timeout: config.DEFAULT_SESSION_TIMEOUT,
                server: {
                    uptime: OS.uptime(),
                    platform: OS.platform(),
                    arch: OS.arch()
                },
                hardware: {
                    cpus: OS.cpus(),
                    ram: {
                        total: OS.totalmem(),
                        current: OS.totalmem() - OS.freemem(),
                    }
                }
            });
        });

        webServer.post(`/task`, async (request, response) => {
            if (typeof request.body.script === 'string'
                && (typeof request.body.options === 'undefined' || typeof request.body.options === 'object')
                && (typeof request.body.profile === 'undefined' || typeof request.body.profile === 'object')
            ) {
                tasksHandler.process(new Task(
                    request.body.script,
                    request.body.options ?? {},
                    request.body.profile ?? {}
                ), (task) => {
                    if (task.status === TaskStatus.DONE) {
                        response
                            .status(200)
                            .json({
                                status: task.status,
                                timings: task.timings,
                                options: task.options,
                                profile: task.profile,
                                output: task.output,
                                error: task.error ?? null
                            });
                    }
                    else {
                        response
                            .status(500)
                            .json({
                                status: task.status,
                                timings: task.timings,
                                options: task.options,
                                profile: task.profile,
                                output: task.output,
                                error: task.error ?? null
                            });
                    }
                });
            } else {
                response
                    .status(500)
                    .json({
                        status: TaskStatus.BAD_ARGS,
                        timings: null,
                        options: null,
                        profile: null,
                        output: null,
                        error: 'Bad arguments'
                    })
            }
        });
    })
    .on('error', () => {
        console.error('Process stopped, port is busy.');
        process.exit(1);
    })

