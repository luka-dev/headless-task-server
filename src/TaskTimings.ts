import {ISODate} from "./helpers/ISODate";

export default class TaskTimings {
    public readonly CREATED_AT: Date;
    public BEGIN_AT: Date | null = null;
    public END_AT: Date | null = null;

    public constructor() {
        this.CREATED_AT = new ISODate();
    }

    public begin(): void {
        this.BEGIN_AT = new ISODate();
    }

    public end(): void {
        this.END_AT = new ISODate();
    }
}