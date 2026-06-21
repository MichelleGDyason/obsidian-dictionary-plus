import { request } from 'obsidian';
import type { Synonym, SynonymProvider } from "src/integrations/types";
import { toError } from "src/safeTypes";

export class SynonymoSynonymAPI implements SynonymProvider {

    public name = "Synonymo";
    public url = "http://www.synonymo.fr/";
    public supportedLanguages: string[] = ["fr"];
    offline = false;

    API_END_POINT = 'http://www.synonymo.fr/synonyme/';

    /**
     * @param query - The term you want to look up
     * @returns Returns the URL in REST schema
     */
    constructRequest(query: string): string {
        return this.API_END_POINT + query;
        //SCHEMA: http://www.synonymo.fr/synonyme/<QUERY>
    }

    async requestSynonyms(query: string): Promise<Synonym[]> {
        const synonyms: Synonym[] = [];
        let result: string;
        try {
            result = await request({url: this.constructRequest(query)});
        } catch (error) {
            throw toError(error);
        }

        if(!result){
            throw new Error("Word doesnt exist in this Dictionary");
        }

        const parser = new DOMParser();

        const doc = parser.parseFromString(result, 'text/html');

        const fiche = doc.body.getElementsByClassName("fiche").item(0);
        if (!fiche) {
            throw new Error("Word doesnt exist in this Dictionary");
        }

        const x = fiche.getElementsByClassName("word");

        for(let i = 0; i < x.length; i++){
            const word = x.item(i)?.textContent;
            if (word) {
                synonyms.push({word});
            }
        }
        
        return synonyms;
    }
}
