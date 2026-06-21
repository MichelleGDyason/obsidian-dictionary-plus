import { request } from 'obsidian';
import type { Synonym, SynonymProvider } from "src/integrations/types";
import { isRecord, parseJson, toError } from "src/safeTypes";

export class OpenThesaurusSynonymAPI implements SynonymProvider {
    API_END_POINT = "https://www.openthesaurus.de/synonyme/search?q=";

    public name = "OpenThesaurus";
    public url = "https://www.openthesaurus.de/";
    public supportedLanguages: string[] = ["de"];
    offline = false;

    /**
     * @param query - The term you want to look up
     * @returns Returns the URL in REST schema
     */
    constructRequest(query: string): string {
        return this.API_END_POINT + query + "&format=application/json";
        //SCHEMA: https://www.openthesaurus.de/synonyme/search?q=<QUERY>&format=application/json
    }

    async requestSynonyms(query: string): Promise<Synonym[]> {
        let result: string;
        try {
            result = await request({url: this.constructRequest(query)});
        } catch (error) {
            throw toError(error);
        }

        if(!result){
            throw new Error("Word doesnt exist in this Dictionary");
        }

        const response = parseJson(result);

        if(!isRecord(response) || !Array.isArray(response.synsets)){
            throw new Error("Word doesnt exist in this Dictionary");
        }
        
        if (response.synsets.length <= 0) {
            throw new Error("No Synonym found");
        }

        const firstSynset: unknown = response.synsets[0];
        if (!isRecord(firstSynset) || !Array.isArray(firstSynset.terms)) {
            throw new Error("No Synonym found");
        }

        const synonyms: Synonym[] = [];
        firstSynset.terms.forEach((synonym) => {
            if (!isRecord(synonym) || typeof synonym.term !== "string") {
                return;
            }
            const word = synonym.term;
            if (query != word) {
                synonyms.push({ word: word });
            }
        });
        return synonyms;
    }
}
