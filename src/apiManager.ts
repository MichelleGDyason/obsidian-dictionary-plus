import { OfflineDictionary } from './integrations/offlineDic';
import type {
    DefinitionProvider,
    DictionaryWord,
    PartOfSpeech,
    PartOfSpeechProvider,
    Synonym,
    SynonymProvider,
} from "src/integrations/types";

import {
    FreeDictionaryDefinitionProvider,
    FreeDictionarySynonymProvider,
} from "src/integrations/freeDictionaryAPI";
import { OpenThesaurusSynonymAPI as OpenThesaurusSynonymProvider } from "src/integrations/openThesaurusAPI";
// import { SynonymoSynonymAPI as SynonymoSynonymProvider } from "src/integrations/synonymoAPI";
import { AltervistaSynonymProvider } from "src/integrations/altervistaAPI";
import type DictionaryPlugin from "src/main";
import { GoogleScraperDefinitionProvider, GoogleScraperSynonymProvider } from 'src/integrations/googleScraperAPI';
import { JishoDefinitionProvider } from "src/integrations/jishoAPI";
import { normalizeLookupTerm } from "./selection";

/*
HOW TO ADD A NEW API:

1. Add a new class that implements DefinitionProvider or
SynonymProvider (or both) and put the file in /src/api/
2. Push the new Provider to the right list in the
APIManager, as seen below
3. Test the Solution
4. Create a new Pull Request on GitHub
*/

export default class APIManager {
    plugin: DictionaryPlugin;

    // Adds new API's to the Definition Providers
    definitionProvider: DefinitionProvider[] = [
        new FreeDictionaryDefinitionProvider(),
        new OfflineDictionary(this),
        new GoogleScraperDefinitionProvider(),
        new JishoDefinitionProvider(),
    ];
    // Adds new API's to the Synonym Providers
    synonymProvider: SynonymProvider[] = [
        new FreeDictionarySynonymProvider(),
        new OpenThesaurusSynonymProvider(),
        // new SynonymoSynonymProvider(), see #44
        new AltervistaSynonymProvider(),
        new GoogleScraperSynonymProvider(),
    ];
    // Adds new API's to the Part Of Speech Providers
    partOfSpeechProvider: PartOfSpeechProvider[] = [
        //new SystranPOSProvider(), See Issue #46
    ];

    constructor(plugin: DictionaryPlugin) {
        this.plugin = plugin;
    }

    /**
     * Sends a request with the passed query to the chosen API and returns the Result
     *
     * @param query - The term you want to look up
     * @returns The API Response of the chosen API as Promise<DictionaryWord>
     */
    public async requestDefinitions(query: string): Promise<DictionaryWord> {
        //Get the currently enabled API
        const api = this.getDefinitionAPI();
        const { cache, settings } = this.plugin;
        if (!api) {
            const previousDefinition = await this.findPreviousDefinition(query);
            if (previousDefinition) {
                await this.plugin.localDictionary.recordLookup(previousDefinition);
                return previousDefinition;
            }
            throw new Error(`No definition provider is available for ${settings.defaultLanguage}`);
        }

        if (settings.useCaching && !api.name.toLowerCase().includes("offline")) {
            const cachedDefinition = this.findCachedDefinition(query, api.name, settings.defaultLanguage);
            //If cachedDefiniton exists return it as a Promise
            if (cachedDefinition) {
                await this.plugin.localDictionary.recordLookup(cachedDefinition.content);
                return cachedDefinition.content;
            } else {
                //If it doesnt exist request a new Definition
                const awaitedResult = await this.requestDefinitionsWithFallback(api, query);
                if (awaitedResult) {
                    cache.cachedDefinitions.push({ content: awaitedResult, api: api.name, lang: settings.defaultLanguage });
                    await this.plugin.saveCache();
                    await this.plugin.localDictionary.recordLookup(awaitedResult);
                }

                return awaitedResult;
            }
        } else {
            const result = await this.requestDefinitionsWithFallback(api, query);
            await this.plugin.localDictionary.recordLookup(result);
            return result;
        }
    }

    private async requestDefinitionsWithFallback(api: DefinitionProvider, query: string): Promise<DictionaryWord> {
        try {
            return await api.requestDefinitions(query, this.plugin.settings.defaultLanguage);
        } catch (error) {
            const previousDefinition = await this.findPreviousDefinition(query);
            if (previousDefinition) {
                return previousDefinition;
            }

            throw error;
        }
    }

    private async findPreviousDefinition(query: string): Promise<DictionaryWord | null> {
        const cachedDefinition = this.findCachedDefinition(query);
        if (cachedDefinition) {
            return cachedDefinition.content;
        }

        return this.plugin.localDictionary.findRecordedLookup(query);
    }

    private findCachedDefinition(
        query: string,
        preferredApi?: string,
        preferredLanguage?: string
    ): { content: DictionaryWord; api: string; lang: string } | null {
        const normalizedQuery = normalizeLookupTerm(query) ?? query.trim();
        if (!normalizedQuery) return null;

        const candidates = this.plugin.cache.cachedDefinitions.filter((cachedDefinition) => {
            return cachedDefinition.content.word.toLowerCase() === normalizedQuery.toLowerCase();
        });
        if (!candidates.length) return null;

        return candidates.sort((a, b) => {
            return scoreCachedDefinition(b, preferredApi, preferredLanguage)
                - scoreCachedDefinition(a, preferredApi, preferredLanguage);
        })[0];
    }

    /**
     * Sends a request with the passed query to the chosen API and returns the resulting Synonyms
     *
     * @param query - The term you want to look up
     * @param pos - The part of speech of the target word
     * @returns The API Response of the chosen API as Promise<Synonym[]>
     */
    public async requestSynonyms(query: string, pos?: PartOfSpeech): Promise<Synonym[]> {
        const normalizedQuery = normalizeLookupTerm(query);
        if (!normalizedQuery) {
            return [];
        }
        query = normalizedQuery;

        const api = this.getSynonymAPI();
        if (!api) {
            return [];
        }
        const { cache, settings } = this.plugin;
        if (settings.useCaching && !api.name.toLowerCase().includes("offline")) {
            const cachedSynonymCollection = cache.cachedSynonyms.find((s) => { return s.word.toLowerCase() == query.toLowerCase() && s.lang == settings.defaultLanguage && s.api == api.name });
            if (cachedSynonymCollection) {
                return cachedSynonymCollection.content;
            } else {
                const result = api.requestSynonyms(query, settings.defaultLanguage);
                const awaitedResult = await result;
                if (awaitedResult) {
                    cache.cachedSynonyms.push({ content: awaitedResult, api: api.name, word: query, lang: settings.defaultLanguage });
                    await this.plugin.saveCache();
                }
                return result;
            }
        } else {
            return api.requestSynonyms(query, this.plugin.settings.defaultLanguage, pos);
        }
    }

    public hasSynonymProvider(): boolean {
        return Boolean(this.getSynonymAPI());
    }

    /**
     * Sends a request with the passed word to the chosen API and returns the detected part of speech
     *
     * @param word - The word you want to look up
     * @param leftContext - The sentence content before the word
     * @param rightContext - The sentence content after the word
     * @returns The API Response of the chosen API as Promise<PartOfSpeech>
     */
    public requestPartOfSpeech(
        word: string,
        leftContext: string,
        rightContext: string
    ): Promise<PartOfSpeech> {
        const api = this.getPartOfSpeechAPI();
        if (!api) {
            throw new Error("No part of speech provider is available");
        }

        return api.requestPartOfSpeech(
            word,
            leftContext,
            rightContext,
            this.plugin.settings.defaultLanguage
        );
    }

    /**
     * @returns Returns the currently selected Definition API
     */
    private getDefinitionAPI(): DefinitionProvider {
        const lang = this.plugin.settings.defaultLanguage;
        return this.definitionProvider.find(
            (api) => api.name == this.plugin.settings.apiSettings[lang].definitionApiName
        );
    }

    /**
     * @returns Returns the currently selected Synonym API
     */
    private getSynonymAPI(): SynonymProvider {
        const lang = this.plugin.settings.defaultLanguage;
        return this.synonymProvider.find(
            (api) => api.name == this.plugin.settings.apiSettings[lang].synonymApiName
        );
    }

    /**
     * @returns Returns the currently selected part of speech API
     */
    private getPartOfSpeechAPI(): PartOfSpeechProvider | null {
        return this.plugin.settings.advancedSynonymAnalysis
            ? this.partOfSpeechProvider.find((api) => api.name == this.plugin.settings.partOfSpeechApiName)
            : null;
    }
}

function scoreCachedDefinition(
    cachedDefinition: { api: string; lang: string },
    preferredApi?: string,
    preferredLanguage?: string
): number {
    return (cachedDefinition.api === preferredApi ? 2 : 0)
        + (cachedDefinition.lang === preferredLanguage ? 1 : 0);
}
