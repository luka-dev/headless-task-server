export class ISODate extends Date
{
    toJSON(key?: any): string {
        return this.toString()
    }

    toString(): string {
        return this.toISOString().split('.')[0];
    }
}