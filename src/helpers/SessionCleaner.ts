import * as os from "os";
import * as fs from "fs";
import {ISODate} from "./ISODate";

export function sessionCleaner(whitelist: string[] = [], olderThan: number | null = null): void {
    const appTempDir = os.tmpdir() + '/.secret-agent';

    fs.readdir(appTempDir, (err, files) => {

        files.forEach(fileName => {
            const pathToFile = appTempDir + '/' + fileName;

            if (!whitelist.includes(fileName)) {
                if (olderThan !== null) {
                    const stats = fs.statSync(pathToFile);
                    if (stats.mtime.getTime() < Date.now() - (olderThan * 2)) {
                        fs.unlink(pathToFile, () => {});
                    }
                } else {
                    fs.unlink(pathToFile, () => {});
                }
            }
        });
    });

    console.log(`${(new ISODate()).toString()} Previous Session Files Cleaned`);
}

export function outdatedSessionsWatcher(interval: number = 60000): NodeJS.Timer {
    console.log('Session Watcher Created');
    return setInterval(() => {
        sessionCleaner([
                'ca.der',
                'caKey.der',
                'network.db',
                'privKey.der',
                'sessions.db',
            ],
            interval * 2);
    }, interval)
}

