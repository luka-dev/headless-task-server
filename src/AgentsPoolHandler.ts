import IAgentCreateOptions from "@secret-agent/client/interfaces/IAgentCreateOptions";
import {BlockedResourceType, Handler} from "secret-agent";
import AgentTaskResult from "./types/AgentTaskResult";
import AsyncFunction from "./helpers/AsyncFuncion";
import {TaskStatus} from "./enum/TaskStatus";
import TaskTimings from "./TaskTimings";
import Config from "./types/Config";

export default class AgentsPoolHandler {
    private handler: Handler;
    private config: Config;

    public constructor(config: Config) {
        this.config = config;

        this.handler = new Handler({
            maxConcurrency: this.config.MAX_CONCURRENCY,
            agentTimeoutMillis: this.config.DEFAULT_SESSION_TIMEOUT,
        });
    }

    public async process(script: string, options: IAgentCreateOptions): Promise<AgentTaskResult> {
        if (options.blockedResourceTypes === undefined) {
            let blockedResourceTypes: BlockedResourceType[] = [];

            this.config.DEFAULT_BLOCKED_RESOURCE_TYPES.forEach((blockedResName: string) => {
                blockedResourceTypes.push(<BlockedResourceType>blockedResName)
            });

            options.blockedResourceTypes = blockedResourceTypes;
        }

        if (options.upstreamProxyUrl === undefined && process.env.UPSTREAM_PROXY !== undefined) {
            options.upstreamProxyUrl = process.env.UPSTREAM_PROXY;
        }

        const taskResult: AgentTaskResult = {
            timings: new TaskTimings(),
            session: null,
            status: TaskStatus.INIT_ERROR,
            output: null
        }

        const agent = await this.handler.createAgent(options);

        try {
            taskResult.session = await agent.sessionId;
            taskResult.status = TaskStatus.CREATED;

            const watcher = new Promise<void>((resolve, reject) => {
                const context = new AsyncFunction('agent', script);

                setTimeout(() => {
                    reject(new Error('Script Session Timeout'));
                }, this.config.DEFAULT_SESSION_TIMEOUT);

                taskResult.timings.begin();

                const runtime = context(agent);

                runtime
                    .then(resolve)
                    .catch(reject);
            });

            watcher
                .then(() => {
                    taskResult.status = TaskStatus.DONE;
                })
                .catch((exception: any) => {
                    taskResult.status = TaskStatus.FAILED;
                    taskResult.error = exception instanceof Error ? exception.stack : String(exception);
                })
                .finally(async () => {
                    taskResult.output = agent.output;
                    taskResult.timings.end();
                    agent?.close();
                });

            await Promise.allSettled([watcher]);
        } catch (exception) {
            taskResult.error = exception instanceof Error ? exception.stack : String(exception);
        }

        return taskResult;
    }

}