export function findEvalDetailsFromError(error: Error): string   {
    const stack = (error.stack ?? '').split('\n');
    const evalLines = stack.filter(line => line.includes('eval at <anonymous>') && line.includes('Task.js'));
    return evalLines.map(line => line.trim().replace(/> \(.+\),/, '>')).join('\n');
}