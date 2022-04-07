export default interface Config {
    "AUTH_KEY": string|null,
    "SERVER_PORT": number,
    "MAX_CONCURRENCY": number,
    "DEFAULT_SESSION_TIMEOUT": number,
    "REPLAY_SERVER_PORT": number,
    "DEFAULT_UPSTREAM_PROXY": string|null,
    "DEFAULT_BLOCKED_RESOURCE_TYPES": string[],
    "OUTDATED_REPLAYS_CLEANER": boolean
}