import type { Definition, DictionaryWord } from "./integrations/types";

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

export function dictionaryWordFromFlashcardHistory(markdown: string, word: string): DictionaryWord | null {
    const normalizedWord = word.trim();
    if (!normalizedWord) return null;

    const encodedWord = encodeURIComponent(normalizedWord.toLocaleLowerCase());
    const markerPattern = new RegExp(
        `<!--\\s*obsidian-dictionary:[^:>]+:${escapeRegExp(encodedWord)}\\s*-->`,
        'u'
    );
    const markerMatch = markerPattern.exec(markdown);
    if (!markerMatch) return null;

    const beforeMarker = markdown.slice(0, markerMatch.index);
    const blockStart = beforeMarker.lastIndexOf('\n\n');
    const block = beforeMarker.slice(blockStart >= 0 ? blockStart + 2 : 0).trim();
    const cardLine = block.split(/\r?\n/u).find((line) => line.includes('::'));
    if (!cardLine) return null;

    const [question, ...answerParts] = cardLine.split('::');
    const historyWord = question.trim();
    const answer = answerParts.join('::').trim();
    if (!historyWord || !answer) return null;

    const groupedDefinitions = new Map<string, Definition[]>();
    for (const part of answer.split(/\s+\|\s+/u)) {
        const parsed = parseFlashcardAnswer(part);
        if (!parsed) continue;

        const definitions = groupedDefinitions.get(parsed.partOfSpeech) ?? [];
        definitions.push({ definition: parsed.definition });
        groupedDefinitions.set(parsed.partOfSpeech, definitions);
    }

    if (!groupedDefinitions.size) return null;

    return {
        word: historyWord,
        phonetics: [],
        meanings: Array.from(groupedDefinitions, ([partOfSpeech, definitions]) => ({
            partOfSpeech,
            definitions,
        })),
    };
}

function parseFlashcardAnswer(answer: string): { partOfSpeech: string; definition: string } | null {
    const trimmed = answer.trim();
    if (!trimmed) return null;

    const partOfSpeechMatch = /^([A-Za-z][A-Za-z -]{0,40}):\s+(.+)$/u.exec(trimmed);
    if (!partOfSpeechMatch) {
        return {
            partOfSpeech: 'saved lookup',
            definition: trimmed,
        };
    }

    return {
        partOfSpeech: partOfSpeechMatch[1].trim(),
        definition: partOfSpeechMatch[2].trim(),
    };
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
