import CommandLineArgs from "command-line-args";
import MakeTaskRequest from "./helpers/MakeTaskRequest";
import Config from "./types/Config";
import {readFileSync} from "fs";
import fs from "fs";

const optionDefinitions = [
    {name: 'help', alias: 'h'},
    {name: 'all', alias: 'a'},
    {name: 'exact', alias: 'e', type: String, multiple: true},
    {name: 'remote', alias: 'r'},
    {name: 'key', alias: 'k'},
];

const args = CommandLineArgs(optionDefinitions);
const config: Config = JSON.parse(readFileSync(__dirname + '/../config.json', 'utf8'));

let address = 'http://127.0.0.1:' + (process.env.SERVER_PORT ?? config.SERVER_PORT);
let authkey = process.env.AUTH_KEY ?? config.AUTH_KEY;

if (args.help !== undefined || (args.exact === undefined && args.all === undefined)) {
    console.log(`
SecretAgent Task-Server Test Suit

Arguments:
    -h, --help      Show this help message
    -a, --all       Run all tests
    -e, --exact     Run exact test by name
    -r, --remote    Set target server (default: http://127.0.0.1:8080)
    -k, --key       Override AUTH_KEY in requests
    
Examples:
    npm run test -- -e "example" -e "another"
    npm run test -- --all 
`);
} else {
    if (args.remote !== undefined) {
        address = args.remote;
    }
    if (args.key !== undefined) {
        authkey = args.key;
    }

    if (args.exact !== undefined && args.exact.length) {
        console.log('Running exact tests');
        args.exact.forEach((testName: string) => {
            MakeTaskRequest(testName, address, authkey);
        });
    } else if (args.all !== undefined) {
        console.log('Running all tests');
        const dir = __dirname + '/../test/';
        fs.readdir(dir, (err, files) => {
            files.forEach(fileName => {
                console.log('Running:' + fileName);
                MakeTaskRequest(fileName, address, authkey);
            });
        });
    }
}

