export class ISODate extends Date
{
    toString(): string {
        return this.toISOString().split('.')[0];
    }
}