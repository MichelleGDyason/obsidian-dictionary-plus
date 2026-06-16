export function isNotFoundRequestError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /\bstatus\s*404\b/i.test(message);
}
