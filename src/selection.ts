const WORD_CHARACTER = /[\p{L}\p{M}\p{N}'’-]/u;
const WORD_EDGE = /^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu;
const LOOKUP_TERM = /^[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*$/u;

export function normalizeLookupTerm(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim().replace(WORD_EDGE, "");
    if (!normalized || !LOOKUP_TERM.test(normalized)) {
        return null;
    }

    return normalized;
}

export function replaceLookupTermInSelection(selection: string, replacement: string): string {
    const term = normalizeLookupTerm(selection);
    if (!term) {
        return selection;
    }

    const termOffset = selection.indexOf(term);
    if (termOffset < 0) {
        return replacement;
    }

    return selection.slice(0, termOffset)
        + replacement
        + selection.slice(termOffset + term.length);
}

export function getWordAtOffset(text: string, offset: number): string | null {
    if (!text || offset < 0 || offset > text.length) {
        return null;
    }

    let cursor = Math.min(offset, text.length - 1);
    while (cursor >= 0 && !WORD_CHARACTER.test(text[cursor] ?? "")) {
        cursor -= 1;
    }

    if (cursor < 0 || !WORD_CHARACTER.test(text[cursor] ?? "")) {
        return null;
    }

    let start = cursor;
    let end = cursor + 1;

    while (start > 0 && WORD_CHARACTER.test(text[start - 1])) {
        start -= 1;
    }
    while (end < text.length && WORD_CHARACTER.test(text[end])) {
        end += 1;
    }

    return normalizeLookupTerm(text.slice(start, end));
}

export function getWordFromTextNode(node: Node | null, offset: number): string | null {
    return node?.nodeType === Node.TEXT_NODE
        ? getWordAtOffset(node.textContent ?? "", offset)
        : null;
}
