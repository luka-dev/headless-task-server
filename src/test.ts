import CommandLineArgs from "command-line-args";
import MakeTaskRequest from "./helpers/MakeTaskRequest";
import {readFileSync} from "fs";
import fs from "fs";

const optionDefinitions = [
    {name: 'help', alias: 'h'},
    {name: 'all', alias: 'a'},
    {name: 'exact', alias: 'e', type: String, multiple: true},
]

const args = CommandLineArgs(optionDefinitions);

if (args.help !== undefined || Object.keys(args).length === 0) {
    console.log(`
SecretAgent Task-Server Test Suit

Arguments:
    -h, --help      Show this help message
    -a, --all       Run all tests
    -e, --exact     Run exact test by name
    
Examples:
    npm run test -- -e "example" -e "another"
    npm run test -- --all 
`);
} else if (args.exact !== undefined && args.exact.length) {
    const config = JSON.parse(readFileSync(__dirname + '/../config.json', 'utf8'));
    args.exact.forEach((testName: string) => {
        MakeTaskRequest(testName, config.SERVER_PORT);
    });
} else if (args.all !== undefined) {
    const config = JSON.parse(readFileSync(__dirname + '/../config.json', 'utf8'));
    const dir = __dirname + '/../test/';
    fs.readdir(dir, (err, files) => {
        files.forEach(fileName => {
            console.log('Running:' + fileName);
            MakeTaskRequest(fileName, config.SERVER_PORT);
            //todo make better output
        });
    });
}
