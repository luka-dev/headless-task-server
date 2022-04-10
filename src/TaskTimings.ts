import {ISODate} from "./helpers/ISODate";

export default class TaskTimings {
    public readonly created_at: Date;
    public begin_at: Date | null = null;
    public end_at: Date | null = null;

    public constructor() {
        this.created_at = new ISODate();
    }

    public begin(): void {
        this.begin_at = new ISODate();
    }

    public end(): void {
        this.end_at = new ISODate();
    }
}