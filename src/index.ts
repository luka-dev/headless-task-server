import {WebServer} from "./WebServer";
import {readFileSync} from "fs";
import * as OS from "os";
import IAgentCreateOptions from "@secret-agent/client/interfaces/IAgentCreateOptions";
import AgentsPoolHandler from "./AgentsPoolHandler";
import Config from "./types/Config";
import {ISODate} from "./helpers/ISODate";

const config: Config = JSON.parse(readFileSync(__dirname + '/../config.json',  'utf8'));

const webServer = new WebServer(config.SERVER_PORT);
webServer.setAuthKey(config.AUTH_KEY);

const agentsHandler = new AgentsPoolHandler(config);

const buildTimeStamp: string | null = readFileSync('buildtimestamp', 'utf8').trim() ?? null;
const runTimeStamp: string | null = (new ISODate()).toString();

webServer.get('/', async (request, response) => {
    response.json({
        health: 'ok',
    });
});

webServer.get('/stats', async (request, response) => {
    response.json({
        build_timestamp: buildTimeStamp,
        run_timestamp: runTimeStamp,
        server: {
            uptime: OS.uptime(),
            platform: OS.platform(),
            arch: OS.arch()
        },
        hardware: {
            cpus: OS.cpus(),
            ram: {
                total: OS.totalmem(),
                current: OS.totalmem() - OS.freemem(),
            }
        }
    });
});

webServer.post(`/task`, async (request, response) => {
    if (typeof request.body.script === 'string' && (typeof request.body.options === 'undefined' || typeof request.body.options === 'object')) {
        const script = request.body.script;
        const options: IAgentCreateOptions = request.body.options ?? {};

        try {
            const taskResult = await agentsHandler.process(script, options);
            response.json(taskResult);
        }
        catch (e: any) {
            response.json({
                status: 'INIT_ERROR',
                error: e.toString()
            });
        }

    } else {
        response.json({
            status: 'WRONG_INPUT'
        })
    }
});

//os.tmpdir()\.secret-agent

webServer.start();