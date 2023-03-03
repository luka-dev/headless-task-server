import FormData from "form-data";
import axios from "axios";

export default class Logger {
    private static rows: string[] = [];

    private static refLog: ((message?: any, ...optionalParams: any[]) => void) | undefined = undefined;
    private static refWarn: ((message?: any, ...optionalParams: any[]) => void) | undefined = undefined;
    private static refError: ((message?: any, ...optionalParams: any[]) => void) | undefined = undefined;

    private static onMessage(ref: (message?: any, ...optionalParams: any[]) => void, ...messages: any[]): void {
        ref(...messages);
        for (const message of messages) {
            if (message instanceof Error) {
                Logger.rows.push(message.stack?.toString() ?? message.toString());
            } else {
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

    public static sendLogs(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (process.env.TELEGRAM_TOKEN !== undefined && process.env.TELEGRAM_CHAT_ID !== undefined) {
                const form = new FormData();
                form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
                form.append('caption', '#HERO CRASHED');
                form.append('document', Buffer.from(Logger.rows.join('\n'), 'utf-8'), {filename: 'crash.log'});

                axios.post(
                    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendDocument`,
                    form,
                    {
                        headers: {
                            ...form.getHeaders(),
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                )
                    .then(() => {
                        console.log('Log sent');
                        resolve();
                    })
                    .catch((error) => {
                        console.error('Error sending log', error);
                        reject();
                    });
            } else {
                reject();
            }
        });
    }

    public static getRows(): string[] {
        return Logger.rows;
    }
}