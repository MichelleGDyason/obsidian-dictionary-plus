export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseJson(text: string): unknown {
    const value: unknown = JSON.parse(text);
    return value;
}

export function toError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);

    try {
        return new Error(JSON.stringify(error));
    } catch {
        return new Error(String(error));
    }
}
