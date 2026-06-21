import { DefinitionProvider, DictionaryWord } from "src/integrations/types";
import { requestUrl } from "obsidian";
import { isRecord, isStringArray } from "src/safeTypes";

class Base {
    name = "Jisho";
    base_url = "https://jisho.org/api/v1/search/words?keyword=";
    API_END_POINT = "https://jisho.org/api/v1/search/words?keyword=";
    offline = false;
    supportedLanguages = ["ja"];

    static LANGUAGES = {
        ja: "Japanese",
    };
}

interface JishoDefinition {
    slug: string;
    is_common: boolean;
    tags: string[];
    jlpt: string[];
    japanese: {
        word: string;
        reading: string;
    }[];
    senses: {
        english_definitions: string[];
        parts_of_speech: string[];
    }[];
}

export class JishoDefinitionProvider
    extends Base
    implements DefinitionProvider {
    requestDefinitions: (query: string, lang: string) => Promise<DictionaryWord> =
        async (query: string, lang: string) => {
            const result = await requestUrl({
                url: `${this.base_url}/search/words?keyword=${query}`,
            });

            const json: unknown = result.json;
            const data = toJishoDefinitions(json);
            const word = data[0];
            if (!word) {
                throw new Error("Word doesnt exist in Jisho");
            }

            const definition: DictionaryWord = {
                word: word.japanese[0].word,
                meanings: word.senses.map((eng) => ({
                    partOfSpeech: eng.parts_of_speech.join("\n"),
                    definitions: eng.english_definitions.map((def) => ({
                        definition: def,
                    })),
                })),
                phonetics: [
                    ...new Set(
                        word.japanese.map(
                            (japanese_word) =>
                                `${japanese_word.word} 「${japanese_word.reading}」`
                        )
                    ),
                ].map((unique) => ({
                    text: unique,
                })),
            };

            return definition;
        };
}

function toJishoDefinitions(value: unknown): JishoDefinition[] {
    if (!isRecord(value) || !Array.isArray(value.data)) {
        return [];
    }

    return value.data.flatMap((entry) => {
        if (!isRecord(entry)) return [];

        const japanese = Array.isArray(entry.japanese)
            ? entry.japanese.flatMap((japaneseEntry) => {
                if (
                    !isRecord(japaneseEntry)
                    || typeof japaneseEntry.word !== "string"
                    || typeof japaneseEntry.reading !== "string"
                ) {
                    return [];
                }

                return [{
                    word: japaneseEntry.word,
                    reading: japaneseEntry.reading,
                }];
            })
            : [];

        const senses = Array.isArray(entry.senses)
            ? entry.senses.flatMap((sense) => {
                if (
                    !isRecord(sense)
                    || !isStringArray(sense.english_definitions)
                    || !isStringArray(sense.parts_of_speech)
                ) {
                    return [];
                }

                return [{
                    english_definitions: sense.english_definitions,
                    parts_of_speech: sense.parts_of_speech,
                }];
            })
            : [];

        if (
            typeof entry.slug !== "string"
            || typeof entry.is_common !== "boolean"
            || !isStringArray(entry.tags)
            || !isStringArray(entry.jlpt)
            || !japanese.length
            || !senses.length
        ) {
            return [];
        }

        return [{
            slug: entry.slug,
            is_common: entry.is_common,
            tags: entry.tags,
            jlpt: entry.jlpt,
            japanese,
            senses,
        }];
    });
}
