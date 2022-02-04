import * as http from "http";
import * as fs from "fs";

export default function (testName: string, port: number) {
    try {
        if (fs.existsSync(__dirname + '/../../test/' + testName + '/payload.js')) {

            let options = {};
            try {
                if (fs.existsSync(__dirname + '/../../test/' + testName + '/options.json')) {
                    options = JSON.parse(fs.readFileSync(__dirname + '/../../test/' + testName + '/options.json', 'utf8'));
                }
            } catch (error) {
                console.error(error);
                options = {};
            }

            const script = fs.readFileSync(__dirname + '/../../test/' + testName + '/payload.js', 'utf8');

            const data = JSON.stringify({
                options: options,
                script: script,
            })

            const connection = {
                hostname: 'localhost',
                port: port,
                path: '/task',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }

            const req = http.request(connection, res => {
                console.log(`Status Code: ${res.statusCode}`)

                res.on('data', d => {
                    process.stdout.write(d)
                })
            })

            req.on('error', error => {
                console.error(error)
            })

            req.write(data);
            req.end();
        } else {
            console.error(testName + '- Test Doesnt Exist');
        }
    } catch (error) {
        console.error(error);
    }
}