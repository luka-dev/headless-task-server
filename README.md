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
>   "script": "await agent.goto('https://example.com/'); resolve(await agent.document.title);"
> }
> ```
> - Contain next script
> ```js
> await agent.goto('https://example.com/');
> resolve(await agent.document.title);
> ```
> - Expected Output
> ```json
> "Example Domain"
> ```
> - Whole Response
> ```json
> {
>   "status": "DONE",  //DONE, FAILED, INIT_ERROR, TIMEOUT, BAD_ARGS
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

# How to write any script?
Welcome to official [DOCS of Hero](https://ulixee.org/docs/hero/basic-client/hero).
In payload, you can provide any [options](https://ulixee.org/docs/hero/basic-client/hero#constructor) for `Hero`.
Script interacting start directly with `agent` key word, its your `Hero`.
All output from script should be passed into `resolve` function. 
If you want to pass error, use `reject` function.