import { request } from "obsidian";
import type{ PartOfSpeech, Synonym, SynonymProvider } from "src/integrations/types";
import { isRecord, parseJson, toError } from "src/safeTypes";

export class AltervistaSynonymProvider implements SynonymProvider {
    name = "Altervista";
    url = "http://thesaurus.altervista.org/";
    offline = false;
    //Look up more later
    supportedLanguages: string[] = [
        "es",
        "it",
        "fr",
        "de",
    ];

    languageCodes: Record<string, string> = {
        "es": "es_ES",
        "it": "it_IT",
        "fr": "fr_FR",
        "de": "de_DE",
    }

    //This is limited to 5000 queries/day
    TOKEN = "P4QAmqYIN1DY6XjlQJht"

    async requestSynonyms(query: string, lang: string, _?: PartOfSpeech): Promise<Synonym[]> {
        const synonyms: Synonym[] = [];
        let result: string;
        try {
            result = await request({url: this.constructRequest(encodeURIComponent(query), lang)});
        } catch (error) {
            throw toError(error);
        }

        if(!result){
            throw new Error("Word doesnt exist in this Dictionary");
        }

        const json = parseJson(result);
        if (!isRecord(json) || !Array.isArray(json.response)) {
            throw new Error("Invalid response from Altervista");
        }

        for(const c of json.response){
            if (!isRecord(c) || !isRecord(c.list) || typeof c.list.synonyms !== "string") {
                continue;
            }
            const words = c.list.synonyms.split('|');
            words.forEach((word: string) => {
                synonyms.push({word: word});
            });
        }

        return synonyms;
    }

    constructRequest(query: string, lang: string): string {
        return `http://thesaurus.altervista.org/thesaurus/v1?word=${query}&key=${this.TOKEN}&language=${this.languageCodes[lang]}&output=json`;
    }

}
