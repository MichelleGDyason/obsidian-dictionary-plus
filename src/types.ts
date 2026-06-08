import type { DictionaryWord, Synonym } from "src/integrations/types";

export interface DictionarySettings {
	defaultLanguage: keyof APISettings;
	normalLang: keyof APISettings;
	getLangFromFile: boolean;
	apiSettings: APISettings;
	partOfSpeechApiName: string;
	shouldShowSynonymPopover: boolean;
		contextMenuLookup: boolean;
	advancedSynonymAnalysis: boolean;
		useCaching: boolean;
		saveLookupHistory: boolean;
		lookupHistoryPath: string;
		folder: string;
	languageSpecificSubFolders: boolean,
	capitalizedFileName: boolean;
	suffix: string;
	prefix: string;
	template: string;
}

export interface APISettings {
	en_US: APIPair;
	hi: APIPair;
	es: APIPair;
	fr: APIPair;
	ja: APIPair;
	ru: APIPair;
	en_GB: APIPair;
	de: APIPair;
	it: APIPair;
	ko: APIPair;
	pt_BR: APIPair;
	ar: APIPair;
	tr: APIPair;
	cn: APIPair;
}

export interface APIPair {
	definitionApiName: string | null;
	synonymApiName: string | null;
}

export interface DictionaryCache {
	cachedDefinitions: CachedDictionaryWord[];
	cachedSynonyms: CachedSynonymCollection[];
}

export interface CachedDictionaryWord {
	content: DictionaryWord;
	lang: string;
	api: string;
}

export interface CachedSynonymCollection {
	content: Synonym[];
	word: string;
	lang: string;
	api: string;
}
