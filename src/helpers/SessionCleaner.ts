import * as os from "os";
import * as fs from "fs";

export function sessionCleaner() {
    const appTempDir = os.tmpdir() + '/.secret-agent';
    const specialFiles = [
        'ca.der',
        'caKey.der',
        'network.db',
        'privKey.der',
        'sessions.db',
    ];

    fs.readdir(appTempDir, (err, files) => {

        files.forEach(fileName => {
            const pathToFile = appTempDir + '/' + fileName;
            if (!specialFiles.includes(fileName)) {
                fs.unlink(pathToFile, () => {});
            }
        });
    });

    console.log('Session Files Cleaned');
}

