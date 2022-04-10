import * as os from "os";
import * as fs from "fs";

export function sessionCleaner() {
    const appTempDir = os.tmpdir() + '/.secret-agent';

    fs.readdir(appTempDir, (err, files) => {

        files.forEach(fileName => {
            const pathToFile = appTempDir + '/' + fileName;
            fs.unlink(pathToFile, () => {
            });
        });
    });

    console.log('Previous Session Files Cleaned');
}

