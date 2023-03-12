export function findEvalDetailsFromError(error: Error): string   {
    const stack = (error.stack ?? '').split('\n');
    const evalLines = stack.filter(line => line.includes('eval at <anonymous>') && line.includes('Task.js'));
    return evalLines.map((line) => {
            line = line.trim();
            line = line.replace(/<anonymous> \(.+\), <anonymous>/gm, '<anonymous>');

            //Change line numbers t o prevent line number mismatch due to try/catch overhead
            const number = [...line.matchAll(/(\d+):(\d+)/gm)][0] ?? [];
            if (number.length == 3) {
                line = line.replace(number[0], `${parseInt(number[1]) - 3}:${number[2]}`);
            }

            return line;
        }
    ).join('\n');
}