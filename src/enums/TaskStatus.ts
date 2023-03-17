export enum TaskStatus {
    //Under processing statuses
    CREATED = 'CREATED',
    QUEUE = 'QUEUE',
    RUNNING = 'RUNNING',

    //Final statuses
    RESOLVE = 'RESOLVE',
    REJECT = 'REJECT',
    THROW = 'THROW',
    INIT_ERROR = 'INIT_ERROR',
    BAD_ARGS = 'BAD_ARGS',
    QUEUE_TIMEOUT = 'QUEUE_TIMEOUT',
    INIT_TIMEOUT = 'INIT_TIMEOUT',
    SESSION_TIMEOUT = 'SESSION_TIMEOUT',
}