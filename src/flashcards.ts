import type { DictionaryWord } from "./integrations/types";

export interface FlashcardEntry {
    marker: string;
    markdown: string;
}

export function buildFlashcardEntry(content: DictionaryWord, language: string): FlashcardEntry | null {
    for (const meaning of content.meanings ?? []) {
        for (const item of meaning.definitions ?? []) {
            const definition = item.definition?.trim();
            if (!definition) continue;

            const word = content.word.trim();
            const marker = `<!-- obsidian-dictionary:${encodeURIComponent(language)}:${encodeURIComponent(word.toLocaleLowerCase())} -->`;
            const answer = `${meaning.partOfSpeech?.trim() ? `${meaning.partOfSpeech.trim()}: ` : ''}${definition}`
                .replace(/\s+/g, ' ')
                .replace(/::/g, ':')
                .trim();

            return {
                marker,
                markdown: `${word}::${answer}\n${marker}\n\n`,
            };
        }
    }

    return null;
}
