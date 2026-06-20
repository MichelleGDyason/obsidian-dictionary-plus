import type DictionaryPlugin from "src/main";

import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS, LANGUAGES } from "src/_constants";
import InfoModalComponent from './infoModal.svelte'
import t from "src/l10n/helpers";

export default class SettingsTab extends PluginSettingTab {
    plugin: DictionaryPlugin;

    constructor(app: App, plugin: DictionaryPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl, plugin } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName(t('Dictionary Settings'))
            .setHeading();

        new Setting(containerEl)
            .setName(t('Language'))
            .setDesc(t('The Language the Plugin will use to search for Definitions and Pronunciations.'))
            .addDropdown((dropdown) => {
                for (const language in LANGUAGES) {
                    dropdown.addOption(language, LANGUAGES[language]);
                }
                dropdown.setValue(plugin.settings.normalLang)
                    .onChange(async (value) => {
                        plugin.settings.defaultLanguage = value as keyof typeof LANGUAGES;
                        plugin.settings.normalLang = value as keyof typeof LANGUAGES;
                        await this.save();
                        this.display();
                    });
            });
        new Setting(containerEl)
            .setName('Get Language from File')
            .setDesc('Use the lang or language key in the frontmatter to set the Language dependent on your open File. Example: lang: "en_US" or language: "de".')
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.getLangFromFile).onChange(async value => {
                    this.plugin.settings.getLangFromFile = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t('Definition Provider'))
            .setDesc(t('The API the Plugin will use to search for Definitions.'))
            .addDropdown((dropdown) => {
                const list: Record<string, string> = {};
                for (const api of plugin.manager.definitionProvider) {
                    if (api.supportedLanguages.includes(plugin.settings.defaultLanguage)) {
                        list[api.name] = api.name;
                    }
                }
                dropdown.addOptions(list)
                    .setValue(plugin.settings.apiSettings[plugin.settings.defaultLanguage].definitionApiName ?? Object.keys(list)[0])
                    .onChange(async (value) => {
                        plugin.settings.apiSettings[plugin.settings.defaultLanguage].definitionApiName = value;
                        await this.save();
                    });
            });
        new Setting(containerEl)
            .setName(t('Synonym Provider'))
            .setDesc(t('The API the Plugin will use to search for Synonyms.'))
            .addDropdown((dropdown) => {
                const list: Record<string, string> = {};
                for (const api of plugin.manager.synonymProvider) {
                    if (api.supportedLanguages.includes(plugin.settings.defaultLanguage)) {
                        list[api.name] = api.name;
                    }
                }
                dropdown.addOptions(list)
                    .setValue(plugin.settings.apiSettings[plugin.settings.defaultLanguage].synonymApiName ?? Object.keys(list)[0])
                    .onChange(async (value) => {
                        plugin.settings.apiSettings[plugin.settings.defaultLanguage].synonymApiName = value;
                        await this.save();
                    });
            });
        new Setting(containerEl)
            .setName(t('Synonym Suggestions'))
            .setDesc(t('Show synonyms for highlighted words'))
            .addToggle(toggle => {
                if (plugin.settings.shouldShowSynonymPopover) {
                    toggle.setValue(true)
                } else {
                    toggle.setValue(false)
                }

                toggle.onChange(async (value) => {
                    plugin.settings.shouldShowSynonymPopover = value;
                    await this.save();
                })
            });

        if (plugin.manager.partOfSpeechProvider.length) {
            const desc = activeDocument.createDocumentFragment();
            desc.append(
                t('Enabling this will allow the Plugin to analyze full sentences to better suggest synonyms based on the context.'),
                desc.createEl("br"),
                t('Click '),
                desc.createEl("a", {
                    href: "https://github.com/MichelleGDyason/obsidian-dictionary-plus#privacy",
                    text: t('here')
                }),
                t(' for Privacy Concerns.'),
            );
            new Setting(containerEl)
                .setName(t('Advanced Synonym Search'))
                .setDesc(desc)
                .addToggle(toggle => {
                    toggle.setValue(plugin.settings.advancedSynonymAnalysis)

                    toggle.onChange(async (value) => {
                        plugin.settings.advancedSynonymAnalysis = value;
                        await this.save();
                    })
                });
        }

        new Setting(containerEl)
            .setName(t('Show Options in Context Menu'))
            .setDesc('Append Look up to supported Obsidian and PDF++ right-click menus without replacing their existing actions. In reading mode plain text, use Shift-right-click or Option-right-click for Dictionary lookup so the normal Copy and system dictionary menu stays available.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.contextMenuLookup);

                toggle.onChange(async (value) => {
                    plugin.settings.contextMenuLookup = value;
                    await this.save();
                })
            });
        new Setting(containerEl)
            .setName(t("Local-Dictionary-Builder Settings"))
            .setHeading();
        new Setting(containerEl)
            .setName(t('Local Dictionary Folder'))
            .setDesc('Specify where full dictionary notes are created. Parent folders are created automatically.')
            .addText(text => text
                .setPlaceholder(t('Dictionary'))
                .setValue(plugin.settings.folder)
                .onChange(async (value) => {
                    plugin.settings.folder = value;
                    await this.save();
                }));
        new Setting(containerEl)
            .setName('Save successful lookups to flashcards')
            .setDesc('Append each newly looked-up word to one #flashcards note using the Question::Answer format supported by the Spaced Repetition plugin.')
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.saveLookupHistory)
                    .onChange(async (value) => {
                        plugin.settings.saveLookupHistory = value;
                        await this.save();
                        this.display();
                    });
            });
        new Setting(containerEl)
            .setName('Lookup history note')
            .setDesc('The note that stores unique dictionary lookup flashcards. Parent folders are created automatically.')
            .addText(text => {
                text.setPlaceholder('Dictionary/Lookup history.md')
                    .setValue(plugin.settings.lookupHistoryPath)
                    .setDisabled(!plugin.settings.saveLookupHistory)
                    .onChange(async (value) => {
                        plugin.settings.lookupHistoryPath = value;
                        await this.save();
                    });
            });
        new Setting(containerEl)
            .setName(t('Use Language specific Subfolders'))
            .setDesc(t('Create Subfolders for every language, e.g. "Dictionary/en-US/Cake"'))
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.languageSpecificSubFolders)
                toggle.onChange(async (value) => {
                    plugin.settings.languageSpecificSubFolders = value;
                    await this.save();
                })
            });
        new Setting(containerEl)
            .setName(t('Capitalize File Name'))
            .setDesc(t('If you disable this, the names of newly created files will be all lowercase.'))
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.capitalizedFileName)
                toggle.onChange(async (value) => {
                    plugin.settings.capitalizedFileName = value;
                    await this.save();
                })
            });
        new Setting(containerEl)
            .setName(t('Filename Prefix and Suffix'))
            .setDesc(t('Here you can add a Prefix and Suffix for your newly created Files.'))
            .setClass("dictionaryprefixsuffix")
            .addText(text => text
                .setPlaceholder(t("Prefix"))
                .setValue(plugin.settings.prefix)
                .onChange(async (value) => {
                    plugin.settings.prefix = value;
                    await this.save();
                }))
            .addText(text => text
                .setPlaceholder(t("Suffix"))
                .setValue(plugin.settings.suffix)
                .onChange(async (value) => {
                    plugin.settings.suffix = value;
                    await this.save();
                }));
        const templateDescription = activeDocument.createDocumentFragment();
        templateDescription.append(
            t('Here you can edit the Template for newly created Files.'),
            templateDescription.createEl("br"),
            templateDescription.createEl("a", {
                href: "https://github.com/MichelleGDyason/obsidian-dictionary-plus#variables",
                text: t('Click for a List of Variables'),
            }),
        );
        new Setting(containerEl)
            .setName(t('Template'))
            .setDesc(templateDescription)
            .setClass("dictionarytextarea")
            .addTextArea(text => text
                .setPlaceholder(DEFAULT_SETTINGS.template)
                .setValue(plugin.settings.template)
                .onChange(async (value) => {
                    plugin.settings.template = value;
                    await this.save();
                }))
            .addExtraButton(cb => {
                cb.setIcon("reset")
                    .setTooltip(t("Reset to default"))
                    .setDisabled(this.plugin.settings.template === DEFAULT_SETTINGS.template)
                    .onClick(async () => {
                        this.plugin.settings.template = DEFAULT_SETTINGS.template;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(t("Caching Settings"))
            .setHeading();
        new Setting(containerEl)
            .setName(t("Use Caching"))
            .setDesc(t("Enable or disable caching. Caching provides a semi-offline experience by saving every result for later use."))
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.useCaching)
                toggle.onChange(async (value) => {
                    plugin.settings.useCaching = value;
                    await this.save();
                })
            });
        const cachingInfo = activeDocument.createDocumentFragment();
        cachingInfo.append(
            t('Here you can delete all cached Data.'),
            cachingInfo.createEl("br"),
            t("You currently have "),
            plugin.cache.cachedDefinitions.length.toString(),
            t(" cached Definitions and "),
            plugin.cache.cachedSynonyms.length.toString(),
            t(" cached Synonyms.")
        );
        new Setting(containerEl)
            .setName(t("Delete Cache"))
            .setDesc(cachingInfo)
            .addButton(button => {
                button.setDisabled(!plugin.settings.useCaching);
                button.setButtonText(t("Delete"));
                button.onClick(async () => {
                    plugin.cache.cachedSynonyms = [];
                    plugin.cache.cachedDefinitions = [];
                    await this.plugin.saveCache();
                    new Notice(t("Success"));
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName(t("Miscellaneous"))
            .setHeading();
        new Setting(containerEl)
            .setName(t('More Information'))
            .setDesc(t('View Information about the API\'s and the Plugin itself.'))
            .setClass("extra")
            .addButton((bt) => {
                bt.setButtonText(t('More Info'))
                bt.onClick((_) => {
                    new InfoModal(plugin).open();
                });
            });
        const donateDescription = activeDocument.createDocumentFragment();
        donateDescription.appendText(t('If you like this Plugin, consider donating to support continued development:'));
        donateDescription.createEl('br');
        const donateLink = donateDescription.createEl('a', {
            href: 'https://ko-fi.com/phibr0',
        });
        donateLink.createEl('img', {
            attr: {
                alt: 'Support on Ko-fi',
                src: 'https://uploads-ssl.webflow.com/5c14e387dab576fe667689cf/61e11e22d8ff4a5b4a1b3346_Supportbutton-1.png',
            },
        });
        new Setting(containerEl)
            .setName(t('Donate'))
            .setDesc(donateDescription);
    }

    private async save() {
        await this.plugin.saveSettings();
    }
}

class InfoModal extends Modal {
    plugin: DictionaryPlugin;
    private _view: InfoModalComponent;

    constructor(plugin: DictionaryPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen() {
        this.modalEl.addClass("dictionary-info-modal");
        this._view = new InfoModalComponent({
            target: this.contentEl,
            props: {
                synonymAPIs: this.plugin.manager.synonymProvider,
                definitionAPIs: this.plugin.manager.definitionProvider,
                partOfSpeechAPIs: this.plugin.manager.partOfSpeechProvider,
            }
        });
    }

    onClose() {
        this._view.$destroy();
        this.contentEl.empty();
    }
}
