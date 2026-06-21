import { requestUrl } from "obsidian";
import { PartOfSpeech, PartOfSpeechProvider } from "./types";
import { isRecord, toError } from "src/safeTypes";

const langMap: Record<string, string> = {
    ar: "ar",
    de: "de",
    en_US: "en",
    en_GB: "en",
    es: "es",
    fr: "fr",
    ru: "ru",
    it: "it",
    ko: "ko",
    pt: "pt",
    pt_BR: "pt",
    hi: "hi",
};

interface POSResponse {
    partsOfSpeech: Array<{
        start: number;
        end: number;
        text: string;
        pos: string;
    }>;
}

/**
 * Systran is used to determine the part of speech of a particular word
 * More languages are supported than listed, but I'm unable to retrieve the entire
 * list at the moment
 */
export class SystranPOSProvider implements PartOfSpeechProvider {
    API_END_POINT =
        "https://systran-systran-platform-for-language-processing-v1.p.rapidapi.com/nlp/morphology/extract/pos";
    // This is a free endpoint but still requires a key.
    // The key is encoded to thwart bots, not humans.
    key = "NWUxYWZmNGE4ZG1zaDI5ZTZlZmJkMGE2NmUwZXAxYzliNTVqc24zMWI3ODRlMTVhMTc";

    public name = "Systran API";
    public url =
        "https://systran-systran-platform-for-language-processing-v1.p.rapidapi.com/";
    offline = false;

    public supportedLanguages = [
        "ar",
        "de",
        "en_US",
        "en_GB",
        "es",
        "fr",
        "ru",
        "it",
        "ko",
        "pt",
        "pt-BR",
        "hi",
    ];

    /**
     * @param lang - The language defined in settings
     * @returns A language code systran supports
     */
    private mapLanguage(lang: string): string {
        return langMap[lang] ?? "en";
    }

    /**
     * @param word - Target word
     * @param leftContext - The sentence content before the word
     * @param rightContext - The sentence content after the word
     * @param lang - The host language
     * @returns - The PartOfSpeech of the word, or null
     */
    async requestPartOfSpeech(
        word: string,
        leftContext: string,
        rightContext: string,
        lang: string
    ): Promise<PartOfSpeech> {
        let result: unknown;
        try {
            const response = await requestUrl({
                url: this.constructRequest(leftContext + word + rightContext, lang),
                method: "GET",
                headers: {
                    "x-rapidapi-key": atob(this.key),
                    "x-rapidapi-host":
                        "systran-systran-platform-for-language-processing-v1.p.rapidapi.com",
                },
            });
            result = response.json;
        } catch (error) {
            throw toError(error);
        }

        const words = toPOSResponse(result);
        let match = words.partsOfSpeech?.find(
            (pos) => pos.start === leftContext.length
        );

        if (!match && words.partsOfSpeech) {
            match = words.partsOfSpeech.find(pos => {
                return pos.text.includes(word);
            })
        }

        if (match) {
            const posStr = match.pos.split("/")[1];

            if (posStr.startsWith("noun")) return PartOfSpeech.Noun;
            if (posStr.startsWith("verb")) return PartOfSpeech.Verb;
            if (posStr.startsWith("adj")) return PartOfSpeech.Adjective;
            if (posStr.startsWith("adv")) return PartOfSpeech.Adverb;
        }

        throw new Error("Could not determine part of speech");
    }

    constructRequest(input: string, lang: string): string {
        return (
            this.API_END_POINT +
            `?input=${encodeURIComponent(input)}&lang=${this.mapLanguage(lang)}`
        );
    }
}

function toPOSResponse(value: unknown): POSResponse {
    if (!isRecord(value) || !Array.isArray(value.partsOfSpeech)) {
        return { partsOfSpeech: [] };
    }

    return {
        partsOfSpeech: value.partsOfSpeech.flatMap((entry) => {
            if (
                !isRecord(entry)
                || typeof entry.start !== "number"
                || typeof entry.end !== "number"
                || typeof entry.text !== "string"
                || typeof entry.pos !== "string"
            ) {
                return [];
            }

            return [{
                start: entry.start,
                end: entry.end,
                text: entry.text,
                pos: entry.pos,
            }];
        }),
    };
}
