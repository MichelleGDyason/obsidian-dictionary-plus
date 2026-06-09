export const CONTEXT_MENU_TERM_MAX_AGE_MS = 2_000;

export function claimLookupMenu<T extends object>(menu: T, seen: WeakSet<T>): boolean {
    if (seen.has(menu)) return false;
    seen.add(menu);
    return true;
}

export function isRecentContextMenuTerm(capturedAt: number, now = Date.now()): boolean {
    return now - capturedAt < CONTEXT_MENU_TERM_MAX_AGE_MS;
}
