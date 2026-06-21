import type { Phonetic, Meaning, Definition, OfflineDic } from './types';
import type APIManager from 'src/apiManager';
import { normalizePath, request } from 'obsidian';
import type { DefinitionProvider, DictionaryWord } from "src/integrations/types";
import { isRecord, parseJson } from "src/safeTypes";

export class OfflineDictionary implements DefinitionProvider {
    public name = "Offline Dictionary";
    public supportedLanguages: string[] = ["en_US", "en_GB", "cn"];
    offlineDic: Record<string, OfflineDic>
    offline = true;
    manager: APIManager;

    constructor(manager: APIManager) {
        this.manager = manager;
    }

    async requestDefinitions(query: string, lang: string): Promise<DictionaryWord> {
        const data = (await this.getOfflineDictionary())[query.toLowerCase()];
        if(!data){
            throw new Error("Word doesnt exist in Offline Dictionary");
        }
        const phonetics: Phonetic[] = [];
        data.readings.forEach(element => {
            phonetics.push({text: element});
        });
        const meanings: Meaning[]= [];
        data.defs.forEach(element => {
            const definition: Definition[] = [];
            definition.push({
                definition: lang === "cn" ? element.def_cn : element.def_en,
                example: lang === "cn" ? element.ext?.[0]?.ext_cn : element.ext?.[0]?.ext_en ?? ""
            });
            meanings.push({
                partOfSpeech: lang === "cn" ? element.pos_cn : element.pos_en,
                definitions: definition
            });
        });
        const dictionaryWord: DictionaryWord = {
            word: query,
            phonetics: phonetics,
            meanings: meanings
        }
        return dictionaryWord;
    }

    async getOfflineDictionary(): Promise<Record<string, OfflineDic>> {
        const { plugin } = this.manager;
        const { adapter } = plugin.app.vault;
        const path = normalizePath(`${plugin.manifest.dir}/offlineDictionary.json`);
        if (!this.offlineDic) {
            if (!await adapter.exists(path)) {
                const data = await request({ url: `https://raw.githubusercontent.com/MichelleGDyason/obsidian-dictionary-plus/${plugin.manifest.version}/dictionary.json` });
                await adapter.write(path, data);
            }
            const dictionary = parseJson(await adapter.read(path));
            if (!isRecord(dictionary)) {
                throw new Error("Invalid offline dictionary data");
            }
            this.offlineDic = dictionary as Record<string, OfflineDic>;
        }
        return this.offlineDic;
    }

}
