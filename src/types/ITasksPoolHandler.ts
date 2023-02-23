import {BlockedResourceType} from "@ulixee/hero";

export default interface ITasksPoolHandler {
    DEFAULT_MAX_CONCURRENCY: number;
    DEFAULT_SESSION_TIMEOUT: number;
    DEFAULT_QUEUE_TIMEOUT: number;
    DEFAULT_UPSTREAM_PROXY_URL: string|null;
    DEFAULT_BLOCKED_RESOURCE_TYPES: BlockedResourceType[];
}