export function envInt(key: string): number | null {
    const value = parseInt(process.env[key] ?? '');
    return isNaN(value) ? null : value;
}

export function envBool(key: string): boolean {
    return process.env[key] === 'true' || process.env[key] === '1';
}