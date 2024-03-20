# Headless Task Server

A headless browser task server based on [Hero](https://github.com/ulixee/hero).

- Hero is a web browser that's built for scraping.
- This task server allow you to process multiple task simultaneously on single server instance
- Has [Helper](https://github.com/luka-dev/headless-task-server-php#helpers) for PHP to make request easy

# Install

- Install dependencies

```bash
npm install
```

- Make build

```bash
npm run build
```

- Now we can run it directly on machine
> NOTE: Viewing browser and replays will work only on machine

- Docker way
> 
> - Build Docker image
> ```bash
> docker build -t headless-task-server:latest . 
> ```
> - Run Docker image
> ```bash
> docker run -p 8080:8080 headless-task-server:latest
> ```

- Directly on machine way
> - Run task server
>
> ```bash
> npm run start
> ```

- #### Enjoy

### Additional ENVs:
- `AUTH_KEY` - Auth key for requests, default `null`
- `SERVER_PORT` - Server port, default `8080`
- `UPSTREAM_PROXY_URL` - Default proxy for script, default `null`, also can be set personally for each task in options `upstreamProxyUrl`
- `QUEUE_TIMEOUT` - Max queue waiting time. Ends when task moved from `queue` to `pool`, default `30000` (30 sec)
- `INIT_TIMEOUT` - Max waiting time, to launch new chrome context for task. Runs when task moved to `pool`, default `15000` (15 sec)
- `SESSION_TIMEOUT` - Max task script execution time inside `pool`/ Counts only after context created, default `60000` (1 min)
- `MAX_CONCURRENCY` - Limit of concurrent tasks, default `5`
> NOTE: If you want to calculate custom value, you can use this formula `MAX_CONCURRENCY = (FREE_RAM - 1.5GB) / 0.5GB`, also to prevent stuttering avg formula for CPU is `MAX_CONCURRENCY = CPU_CORES_COUNT * 2`
- `CONCURRENCY_DISABLE_MEM_LIMITER` - Memory limiter for concurrency, can be disabled with `true`.
> NOTE: If free memory less than 500MB, new task wouldn't be runned until memory will be free.\
> For example, when chrome instance will be closed after finishing tasks, memory will be free.\
> Due to chrome/chromium specific behavior, memory can't be freed immediately, so we need to wait for it.
- `TELEGRAM_TOKEN` & `TELEGRAM_CHAT_ID` - Telegram bot token and chat id for sending logs on crash or restart, default `null`
- `DEBUG` & `ULX_DEBUG` - Enable debug mode, default `false`
- `SHOW_CHROME` - Show browser window, default `false`. Works only on systems with GUI
> NOTE: On non GUI systems will crash! If you want to see browser window, you need to set `SHOW_CHROME` to `true` and run server directly on machine, not in Docker.



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
> ```jsonc
> {
>     "timestamp": {
>         "build": "2023-02-23T11:22:04",
>         "run": "2023-02-23T11:22:07"
>     },
>     "task": {
>         "timeout": {
>             "session": 60000, //timeout task script execution
>             "queue": 30000, //max time waiting in queue
>             "init": 15000 //timeout for waiting for new chrome context
>         },
>         "concurrency": 1,
>         "pool": 0,
>         "queue": 0,
>         "counter": {
>             "total": 4,
>             "resolve": 1, //reports when script passed successfully
>             "reject": 2, //if task script find thats it's not possible to continue, script will report reject
>             "throw": 1, //thrown by task script, but not catched inside. For example, goto timeout
>             "init_error": 0, //if chrome context throw error. Usualy, proxy is not valid or dead
>             "bad_args": 0 //if post params is not valid
>             "queue_timeout": 0,
>             "init_timeout": 0,
>             "session_timeout": 0
>         }
>     },
>     "server": {
>         "uptime": 316034,
>         "platform": "darwin",
>         "arch": "x64",
>         "cores": 8,
>         "ram": {
>             "total": 8192,
>             "free": 98,
>             "used": 8093
>         }
>     }
> }


- Last 1000 logs
> ```http request
> Authorization: MySecretAuthKey_IfNoKey_RemoveThisHeader
> GET http://127.0.0.1:8080/logs
> ```
>
>
> ```json
> [
>   "Runned on port:8080",
>   "APP Runned in InSecure mode!",
>   "Browser Handler runned"
> ]
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
>   "script": "await agent.goto('https://example.com/'); resolve(await agent.document.title);"
> }
> ```
> > NOTE: Example proxy `upstreamProxyUrl` didn't work, you can use any proxy that support HTTP/SOCKS5 protocol, or you can remove this option to use without proxy.
> - Contain next script
> ```js
> await agent.goto('https://example.com/');
> resolve(await agent.document.title);
> ```
> - Expected Output
> ```jsonc
> "Example Domain"
> ```
> - Whole Response
> ```jsonc
> {
>   "status": "RESOLVE",  //Look at TaskStatus.ts
>   "timings": {
>     "begin_at": "2022-01-31T12:46:54",
>     "end_at": "2022-01-31T12:46:56",
>     "created_at": "2022-01-31T12:46:52"
>   },
>   "options": {}, //Options that you provided
>   "profile": {   //Profile of faked user and browser, can be saved for future use as same user.
>    "cookies": [],
>    "storage": {
>      "https://example.com": {
>        "indexedDB": [],
>        "localStorage": [],
>        "sessionStorage": []
>      }
>    },
>    "userAgentString": "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
>    "deviceProfile": {
>      "deviceMemory": 4,
>      "videoDevice": {
>        "deviceId": "b77e4f6d9c9949f7941d53eb325ed152449b0941ba9268d75cae92f181f4995c",
>        "groupId": "ea79bf7882892b623152146391861a55a91a3269f74d1bfd09eaaf316669cb1e"
>      },
>      "maxHeapSize": 2172649472,
>      "webGlParameters": {
>        "37445": "Intel Inc.",
>        "37446": "Intel Iris OpenGL Engine"
>      }
>    }
>   },
>   "output": "Example Domain", //Output from script
>   "error": null //Error if any
> }
> ```

# How to write custom script?
Welcome to official [DOCS of Hero](https://ulixee.org/docs/hero/basic-client/hero), your script should be in payload, property `script` as a `string`.\
In payload, you can provide any [options](https://ulixee.org/docs/hero/basic-client/hero#constructor) for `Hero`.\
Script starts in isolated `async` context, with const named `agent`, its your per-request `Hero` instance.\
All output from script should be passed into `resolve` function.\
If you want to pass error, use `reject` function.