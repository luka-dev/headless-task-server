import express, {Express, Request, Response, NextFunction} from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";

export interface RouteCallback {
    (request: Request, response: Response, next: NextFunction): void;
}

export class WebServer {

    private authKey: string | null = null;

    private readonly port: number | null;
    private app: Express;

    private server: http.Server | null = null;

    public constructor(port: number = 8080, useCors: boolean = true) {
        let envPort: number|null = null;

        if (process.env.SERVER_PORT !== undefined && !isNaN(Number(process.env.SERVER_PORT))) {
            envPort = parseInt(process.env.SERVER_PORT);
        }

        this.port = envPort ?? port;

        this.app = express();

        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: true}));

        if (useCors) {
            this.app.use(cors())
        }
    }

    public setAuthKey(key: string | null = null): void {
        this.authKey = process.env.AUTH_KEY ?? key;
    }

    public checkAuth(request: Request): boolean {
        if (this.authKey === null) {
            return true;
        }

        return request.get('Authorization') === this.authKey;
    }

    public start(): http.Server {
        if (this.server === null) {
            this.server = this.app.listen(this.port);
            console.log(`Runned on port:${this.port}`);
            if (this.authKey === null) {
                console.log('APP Runned in InSecure mode!');
            } else {
                this.app.all('*', (request, response, next) => {
                    if (request.url !== '/' && !this.checkAuth(request)) {
                        response.send(401);
                    }
                    return next();
                });
            }
        }

        return this.server;
    }

    public stop(): void {
        if (this.server !== null) {
            this.server.close();
            this.server = null;
        }
    }

    public all(route: string, callback: RouteCallback): void {
        this.app.all(route, callback)
    }

    public get(route: string, callback: RouteCallback): void {
        this.app.get(route, callback)
    }

    public post(route: string, callback: RouteCallback): void {
        this.app.post(route, callback)
    }

    public put(route: string, callback: RouteCallback): void {
        this.app.put(route, callback)
    }

    public delete(route: string, callback: RouteCallback): void {
        this.app.delete(route, callback)
    }

    public patch(route: string, callback: RouteCallback): void {
        this.app.patch(route, callback)
    }

    public options(route: string, callback: RouteCallback): void {
        this.app.options(route, callback)
    }

    public head(route: string, callback: RouteCallback): void {
        this.app.head(route, callback)
    }

}
