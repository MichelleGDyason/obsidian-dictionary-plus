import { request } from 'obsidian';
import { DefinitionProvider, DictionaryWord, Meaning, PartOfSpeech, Synonym, SynonymProvider } from "src/integrations/types";
import { isNotFoundRequestError } from "src/requestErrors";
import { isRecord, isStringArray, parseJson, toError } from "src/safeTypes";

abstract class Base {
    API_END_POINT = "https://api.dictionaryapi.dev/api/v2/entries/";

    public name = "Free Dictionary API";
    public url = "https://dictionaryapi.dev/";
    offline = false;

    languageCodes: Record<string, string> = {
        "en_US": "en",
        "hi": "hi",
        "es": "es",
        "fr": "fr",
        "ja": "ja",
        "ru": "ru",
        "en_GB": "en",
        "de": "de",
        "it": "it",
        "ko": "ko",
        "pt_BR": "pt-BR",
        "ar": "ar",
        "tr": "tr",
    }

    /**
     * @param query - The term you want to look up
     * @returns Returns the URL in REST schema
     */
    protected constructRequest(query: string, lang: string): string {
        return this.API_END_POINT + lang + '/' + query;
        //SCHEMA: https://api.dictionaryapi.dev/api/v2/entries/<language_code>/<word>
    }
}

export class FreeDictionaryDefinitionProvider extends Base implements DefinitionProvider {
    public supportedLanguages: string[] = [
        "en_US",
        // "hi",
        // "es",
        // "fr",
        // "ja",
        // "ru",
        "en_GB",
        // "de",
        // "it",
        // "ko",
        // "pt_BR",
        // "ar",
        // "tr",
    ];

    /**
     * Sends a request with the passed query to the End Point and returns the Result
     *
     * @param query - The term you want to look up
     * @param lang - The language to use
     * @param _ - For now unused parameter, debouncing mechanism planned
     * @returns The API Response of the API as Promise<DictionaryWord>
     */
    async requestDefinitions(query: string, lang: string, _ = true): Promise<DictionaryWord> {
        let result: string;
        try {
            const url = this.constructRequest(encodeURIComponent(query), this.languageCodes[lang]);
            result = await request({url});
        } catch (error) {
            throw toError(error);
        }

        return parseFreeDictionaryWord(result);
    }
}

export class FreeDictionarySynonymProvider extends Base implements SynonymProvider {
    public supportedLanguages: string[] = [
        "en_US",
        "en_GB",
    ];

    /**
     * @param meaning - The Meaning to compare the POS to
     * @param pos - The part of speech of the target word
     * @returns True if the meaning is the same part of speech as pos
     */
    getDoesPosMatch(meaning: Meaning, pos: PartOfSpeech): boolean {
        switch (pos) {
        case PartOfSpeech.Noun:
            return meaning.partOfSpeech.toLowerCase().includes('noun');
        case PartOfSpeech.Verb:
            return meaning.partOfSpeech.toLowerCase().includes('verb');
        case PartOfSpeech.Adjective:
            return meaning.partOfSpeech.toLowerCase().includes('adjective');
        case PartOfSpeech.Adverb:
            return meaning.partOfSpeech.toLowerCase().includes('adverb');
        }
    }

    /**
     *
     * @param query - The word to look up synonyms for
     * @param lang - The host language
     * @param pos - The part of speech of the target word
     * @returns A list of Synonyms
     */
    async requestSynonyms(query: string, lang: string, pos?: PartOfSpeech): Promise<Synonym[]> {
        let result: string;
        try {
            const url = this.constructRequest(encodeURIComponent(query), this.languageCodes[lang]);
            result = await request({url});
        } catch (error) {
            if (isNotFoundRequestError(error)) {
                return [];
            }
            throw toError(error);
        }
        
        if(!result){
            throw new Error("Word doesnt exist in this Dictionary");
        }

        const meanings = parseFreeDictionaryWord(result).meanings;
        const synonyms: Synonym[] = [];

        // The default POS provider seems pretty wonky at the moment,
        // so let's include non-matches in the results as well
        const nonPOSMatch: Synonym[] = [];

        meanings.forEach(meaning => {
            if (typeof pos === 'number' && !this.getDoesPosMatch(meaning, pos)) {
                meaning.definitions.forEach(def => {
                    if (def.synonyms) {
                        def.synonyms.forEach(synonym => {
                            nonPOSMatch.push({
                                word: synonym,
                            })
                        })
                    }
                })
                return;
            }

            meaning.definitions.forEach(def => {
                if (def.synonyms) {
                    def.synonyms.forEach(synonym => {
                        synonyms.push({
                            word: synonym,
                        })
                    })
                }
            })
        })

        return synonyms.concat(nonPOSMatch);
    }
}

function parseFreeDictionaryWord(result: string): DictionaryWord {
    const json = parseJson(result);

    if (isRecord(json)) {
        const title = json.title;
        throw new Error(typeof title === "string" ? title : "Word doesnt exist in this Dictionary");
    }

    if (!Array.isArray(json)) {
        throw new Error("Invalid response from Free Dictionary API");
    }

    const word = toDictionaryWord(json[0]);
    if (!word) {
        throw new Error("Invalid response from Free Dictionary API");
    }

    return word;
}

function toDictionaryWord(value: unknown): DictionaryWord | null {
    if (!isRecord(value) || typeof value.word !== "string" || !Array.isArray(value.meanings)) {
        return null;
    }

    const meanings = value.meanings.map(toMeaning).filter((meaning): meaning is Meaning => Boolean(meaning));
    if (!meanings.length) return null;

    const dictionaryWord: DictionaryWord = {
        word: value.word,
        phonetics: Array.isArray(value.phonetics)
            ? value.phonetics.flatMap((phonetic) => {
                if (!isRecord(phonetic) || typeof phonetic.text !== "string") return [];
                return [{
                    text: phonetic.text,
                    audio: typeof phonetic.audio === "string" ? phonetic.audio : undefined,
                }];
            })
            : [],
        meanings,
    };

    if (typeof value.origin === "string") {
        dictionaryWord.origin = value.origin;
    }

    return dictionaryWord;
}

function toMeaning(value: unknown): Meaning | null {
    if (!isRecord(value) || typeof value.partOfSpeech !== "string" || !Array.isArray(value.definitions)) {
        return null;
    }

    return {
        partOfSpeech: value.partOfSpeech,
        definitions: value.definitions.flatMap((definition) => {
            if (!isRecord(definition) || typeof definition.definition !== "string") return [];

            return [{
                definition: definition.definition,
                example: typeof definition.example === "string" ? definition.example : undefined,
                synonyms: isStringArray(definition.synonyms) ? definition.synonyms : undefined,
                antonyms: isStringArray(definition.antonyms) ? definition.antonyms : undefined,
            }];
        }),
    };
}
