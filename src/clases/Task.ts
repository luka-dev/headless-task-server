import {TaskStatus} from "../enums/TaskStatus";
import Timings from "./Timings";
import ITaskOptions from "../types/ITaskOptions";
import IUserProfile from "@ulixee/hero-interfaces/IUserProfile";
export default class Task {
    public readonly script: string;
    public readonly options: ITaskOptions;
    public profile: IUserProfile;
    public readonly timings: Timings;
    public status: TaskStatus;
    public output: any = null;
    public error?: any;
    public promise: (() => Promise<void>) | null = null;
    public isFulfilled: boolean = false;

    public constructor(script: string, options: ITaskOptions = {}, profile: IUserProfile = {}) {
        this.script = script;
        this.options = options;
        this.profile = profile;
        this.timings = new Timings();
        this.status = TaskStatus.CREATED;
    }
}