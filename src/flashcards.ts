import type { DictionaryWord } from "./integrations/types";

export interface FlashcardEntry {
    marker: string;
    markdown: string;
}

export function buildFlashcardEntry(content: DictionaryWord, language: string): FlashcardEntry | null {
    const word = content.word.trim();
    const answers: string[] = [];

    for (const meaning of content.meanings ?? []) {
        for (const item of meaning.definitions ?? []) {
            const definition = item.definition?.trim();
            if (!definition) continue;

            const answer = `${meaning.partOfSpeech?.trim() ? `${meaning.partOfSpeech.trim()}: ` : ''}${definition}`
                .replace(/\s+/g, ' ')
                .replace(/::/g, ':')
                .trim();
            if (answer) answers.push(answer);
        }
    }

    if (!word || !answers.length) return null;

    const marker = `<!-- obsidian-dictionary:${encodeURIComponent(language)}:${encodeURIComponent(word.toLocaleLowerCase())} -->`;
    return {
        marker,
        markdown: `${word}::${answers.join(' | ')}\n${marker}\n\n`,
    };
}

export function upsertFlashcardEntry(markdown: string, entry: FlashcardEntry): string {
    if (!markdown.includes(entry.marker)) {
        const separator = markdown.endsWith('\n') ? '\n' : '\n\n';
        return `${markdown}${separator}${entry.markdown}`;
    }

    const blocks = markdown.split(/\n{2,}/);
    const blockIndex = blocks.findIndex((block) => block.includes(entry.marker));
    if (blockIndex < 0) return markdown;

    blocks[blockIndex] = entry.markdown.trimEnd();
    return `${blocks.join('\n\n').replace(/\s+$/u, '')}\n\n`;
}
