# Headless Task Server

A headless browser task server based on [SecretAgent](https://github.com/ulixee/secret-agent).

- SecretAgent is a web browser that's built for scraping.
- This task server allow you to process multiple task simultaneously on single server instance

# Install

- Install dependencies

```bash
npm install
```

- Make build

```bash
npm run build
```

- Now we can run it with Docker OR directly on machine
> NOTE: Viewing browser and replays will work only on machine

- Docker way
> 
> - Build Docker image
> ```bash
> docker build -t headless-task-server . 
> ```
> - Run Docker image
> ```bash
> docker run -p 8080:8080 headless-task-server
> ```

- Directly on machine way
> - Run task server
>
> ```bash
> npm run start
> ```

- #### Enjoy

# Usage

> Example IP `127.0.0.1`.
>
> Auth work via header `Authorization`.
>
> Auth key loading from `config.json` and overwriting with env `AUTH_KEY`

- Health Check

> ```http request 
> GET http://127.0.0.1:8080/
> ```
>
> ```json
> {"health": "ok"}
> ```

- Stats info
> ```http request
> Authorization: MySecretAuthKey_IfNoKey_RemoveThisHeader
> GET http://127.0.0.1:8080/stats
> ```
>
> 
> ```json
> {
>   "build_timestamp": "2022-01-28T15:45:22", //When this build was created
>   "run_timestamp": "2022-01-31T08:38:03", //When was runned
>   "server": {
>     "uptime": 421169,
>     "platform": "darwin",
>     "arch": "arm64"
>   },
>   "hardware": {
>     "cpus": [
>       {
>         "model": "Some CPU name",
>         "speed": 24,
>         "times": {
>           "user": 7719370,
>           "nice": 0,
>           "sys": 8422510,
>           "idle": 37147300,
>           "irq": 0
>         }
>       }
>     ],
>     "ram": {
>       "total": 17179869184,
>       "current": 16645472256
>     }
>   }
> }
> ```
- Create Task
> ```http request
> Authorization: MySecretAuthKey_IfNoKey_RemoveThisHeader
> Content-Type: application/json
> POST http://127.0.0.1:8080/task
> 
> {
>   "options": {
>     "upstreamProxyUrl": "http://username:password@proxy.com:80"
>   },
>   "script": "await agent.goto('https://example.com/'); agent.output.title = (await agent.document.title);"
> }
> ```
> - Contain next script
> ```js
> await agent.goto('https://example.com/');
> agent.output.title = (await agent.document.title);
> ```
> - Expected Output
> ```json
> {"title": "Example Domain"}
> ```
> - Whole Response
> ```json
> {
>   "timigs": {
>     "BEGIN_AT": "2022-01-31T12:46:54",
>     "END_AT": "2022-01-31T12:46:56",
>     "CREATED_AT": "2022-01-31T12:46:52"
>   },
>   "session": "dd3d53b0-8293-11ec-8e51-af88f0928944",
>   "status": "DONE",
>   "output": {
>     "title": "Example Domain"
>   }
> }
> ```

# How to write any script?
Welcome to official [DOCS of Secret-Agent](https://secretagent.dev/docs/).
In payload, you can provide any [options](https://secretagent.dev/docs/basic-interfaces/agent#constructor-1) for `Agent`.
Script interacting start directly with `agent`.
All output from script should be saved into `agent.output`.

# How to test?
Create in `test` folder your own folder, folder name - will be test name.
Inside folder, script `payload.js` and optionally `options.json` that following [this](https://secretagent.dev/docs/basic-interfaces/agent/#constructor-1) specification.

To run specified test:
> npm run test -- -e example 

To run all test:
> npm run test -- -a

ENVs:
> `SA_SHOW_BROWSER` If true, will show you whole browser 

> `SA_SHOW_REPLAY` If true, will show you replay system

> `AUTH_KEY` Overwrite AUTH_KEY from config.json that used for HTTP Authorization 

> `SERVER_PORT` Overwrite port from config.json 

> `UPSTREAM_PROXY` Set global proxy for all browsers instances

# TODO
- [ ] Migrate from SA to Hero. 
- [ ] Your ideas. 