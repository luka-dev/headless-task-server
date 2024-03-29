import {TaskStatus} from "../enums/TaskStatus";
import Timings from "./Timings";
import ITaskOptions from "../types/ITaskOptions";
import IUserProfile from "@ulixee/hero-interfaces/IUserProfile";
import Hero from "@ulixee/hero";
import AsyncFunction from "../helpers/AsyncFuncion";
import {findEvalDetailsFromError} from "../helpers/ErrorHelper";
import TaskSessionTimeout from "../exceptions/TaskSessionTimeout";

export default class Task {
    private readonly script: string;
    public readonly options: ITaskOptions;
    public profile: IUserProfile;
    public readonly timings: Timings;
    public status: TaskStatus;
    public output: any = null;
    public error: any = null;
    private isFulfilled: boolean = false;
    public timer: NodeJS.Timeout|null = null;
    public promise: (agent: Hero) => Promise<any>;
    private readonly callback: (task: Task) => void;
    public constructor(script: string, options: ITaskOptions = {}, profile: IUserProfile = {}, callback: (task: Task) => void) {
        this.script = script;
        this.options = options;
        this.profile = profile;
        this.timings = new Timings();
        this.status = TaskStatus.CREATED;
        this.callback = callback;

        this.promise = (agent: Hero) => {
            let fulfilledCheckInterval: NodeJS.Timer|null = null;

            const exportProfile = async (): Promise<IUserProfile> => {
                try {
                    return await agent.exportUserProfile();
                } catch (error) {
                    if (error instanceof Error) {
                        console.warn('Task: Script: exportUserProfile: ' + error.name + ': ' + error.message);
                    } else {
                        console.warn('Task: Script: exportUserProfile: ' + error)
                    }
                }
                return this.profile;
            }

            const promise = new Promise<any>((resolve, reject) => {
                    fulfilledCheckInterval = setInterval(() => {
                        if (this.isFulfilled) {
                            reject(new TaskSessionTimeout());
                            clearInterval(fulfilledCheckInterval!);
                        }
                    }, 10);

                    //TODO: suppress console.log in user scripts
                    return new AsyncFunction(
                        'resolve', 'reject', 'agent',
                        `try {\n` +
                        `${this.script};\n` +
                        `resolve(); } catch(e) { e.name = 'TaskOuterCatch' ; reject(e); }`
                    )
                    (resolve, reject, agent)
                }
            );

            promise
                .finally(() => {
                    clearInterval(fulfilledCheckInterval!);
                })
                .then(async (output) => {
                    this.fulfill(TaskStatus.RESOLVE, output, null, await exportProfile());
                })
                .catch(async (error) => {
                    if (error instanceof Error) {
                        console.warn(('Task: Script: ' + error.name + ': ' + error.message + '\n' + findEvalDetailsFromError(error)).trim());
                    } else {
                        console.warn('Task: Script: ' + error);
                    }
                    this.fulfill(
                        (error instanceof Error && error.name === 'TaskOuterCatch') ? TaskStatus.THROW : TaskStatus.REJECT,
                        null,
                        error,
                        await exportProfile()
                    );
                });

            return promise;
        }
    }

    public fulfill(status: TaskStatus, output: any = null, error: any = null, profile: IUserProfile|null = null): void {
        if (this.isFulfilled) {
            console.warn('Task: already fulfilled');
            return;
        }

        this.isFulfilled = true;
        this.timings.end();
        this.status = status;
        this.output = output;
        this.error = error;
        this.profile = profile ?? this.profile;

        this.callback(this);
    }

    public getIsFulfilled(): boolean {
        return this.isFulfilled;
    }

}