import {ISODate} from "../helpers/ISODate";

export default class Timings {
    public readonly created_at: ISODate;
    public begin_at: ISODate | null = null;
    public end_at: ISODate | null = null;

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