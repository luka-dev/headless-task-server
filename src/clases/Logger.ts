export default class Logger {
    private static rows: string[] = [];

    private static refLog: ((message?: any, ...optionalParams: any[]) => void)|undefined = undefined;
    private static refWarn: ((message?: any, ...optionalParams: any[]) => void)|undefined = undefined;
    private static refError: ((message?: any, ...optionalParams: any[]) => void)|undefined = undefined;

    private static onMessage(ref: (message?: any, ...optionalParams: any[]) => void, ...messages: any[]): void {
        ref(...messages);
        for (const message of messages) {
            if (message instanceof Error) {
                Logger.rows.push(message.stack?.toString() ?? message.toString());
            }
            else {
                Logger.rows.push(message?.toString());
            }
        }
        Logger.rows.slice(-1000);
    }

    public static hook(): void {
        Logger.refLog = console.log;
        Logger.refWarn = console.warn;
        Logger.refError = console.error;
        console.log = (...messages: any[]) => {
            Logger.onMessage(Logger.refLog!, ...messages);
        }
        console.warn = (...messages: any[]) => {
            Logger.onMessage(Logger.refWarn!, ...messages);
        }
        console.error = (...messages: any[]) => {
            Logger.onMessage(Logger.refError!, ...messages);
        }
    }

    public static unhook(): void {
        console.log = Logger.refLog!;
        console.warn = Logger.refWarn!;
        console.error = Logger.refError!;
    }

    public static getRows(): string[] {
        return Logger.rows;
    }
}