export default class TaskSessionTimeout extends Error {
    constructor() {
        super('Execution: fulfilled before execution ended, aborting.');
        this.name = 'TaskSessionTimeout';
    }
}