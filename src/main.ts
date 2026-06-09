/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DictionaryCache, DictionarySettings } from 'src/types';
import type { APISettings } from './types';

import { debounce, Editor, MarkdownView, Menu, normalizePath, Notice, Platform, Plugin, WorkspaceLeaf } from 'obsidian';
import { matchCasing } from "match-casing";
import SettingsTab from 'src/ui/settings/settingsTab';
import DictionaryView from 'src/ui/dictionary/dictionaryView';
import { DEFAULT_SETTINGS, VIEW_TYPE } from 'src/_constants';
import APIManager from 'src/apiManager';
import { DEFAULT_CACHE,  RFC } from './_constants';
import { Coords, SynonymPopover } from 'src/ui/synonyms/synonymPopover';
import handleContextMenu from 'src/ui/customContextMenu';
import { addIcons } from 'src/ui/icons';
import t from 'src/l10n/helpers';
import LocalDictionaryBuilder from 'src/localDictionaryBuilder';
import LanguageChooser from 'src/ui/modals/languageChooser';
import { getWordAtOffset, getWordFromTextNode, normalizeLookupTerm } from './selection';
import { claimLookupMenu, isRecentContextMenuTerm } from './contextMenu';

export default class DictionaryPlugin extends Plugin {
    declare settings: DictionarySettings;
    manager: APIManager;
    localDictionary: LocalDictionaryBuilder;
    synonymPopover: SynonymPopover | null = null;
    cache: DictionaryCache;
    private lastSelectedTerm: string | null = null;
    private lastSelectionFilePath: string | null = null;
    private lastSelectionAt = 0;
    private contextMenuTerm: string | null = null;
    private contextMenuTermAt = 0;
    private menusWithLookup = new WeakSet<Menu>();

    async onload(): Promise<void> {
        console.log('loading dictionary');

        await Promise.all([this.loadSettings(), this.loadCache()]);

        addIcons();

        this.addSettingTab(new SettingsTab(this.app, this));

        this.manager = new APIManager(this);
        this.localDictionary = new LocalDictionaryBuilder(this);

        this.registerView(VIEW_TYPE, (leaf) => {
            return new DictionaryView(leaf, this);
        });

        this.addCommand({
            id: 'dictionary-open-view',
            name: t('Open Dictionary View'),
            callback: async () => {
                const leaf = await this.getDictionaryLeaf();
                if (!leaf) return;
                this.app.workspace.revealLeaf(leaf);
                if (leaf.view instanceof DictionaryView) {
                    leaf.view.focusSearch();
                }
            },
        });

        this.addCommand({
            id: 'dictionary-lookup-selected-word',
            name: 'Look up selected word',
            checkCallback: (checking) => {
                const term = this.getLookupTerm();
                if (!term) return false;
                if (!checking) void this.lookup(term);
                return true;
            },
        });

        this.addCommand({
            id: 'dictionary-open-lookup-history',
            name: 'Open lookup history',
            callback: () => {
                void this.localDictionary.openLookupHistory();
            },
        });

        this.addCommand({
            id: 'dictionary-open-language-switcher',
            name: t('Open Language Switcher'),
            callback: () => {
                new LanguageChooser(this.app, this).open();
            },
        });

        this.registerDomEvent(document, "selectionchange", () => {
            this.captureSelection(window.getSelection()?.toString());
        });

        this.registerDomEvent(document.body, "pointerup", () => {
            this.captureSelection(window.getSelection()?.toString());
            if (!this.settings.shouldShowSynonymPopover || !this.manager.hasSynonymProvider()) {
                return;
            }
            this.handlePointerUp();
        });
        this.registerDomEvent(window, "keydown", () => {
            // Destroy the popover if it's open
            if (this.synonymPopover) {
                this.synonymPopover.destroy();
                this.synonymPopover = null;
            }
        });

        this.registerDomEvent(document.body, "contextmenu", (event) => {
            if (!this.settings.contextMenuLookup || !this.isMarkdownContextEvent(event)) {
                return;
            }

            const eventWindow = event.view ?? window;
            const selection = eventWindow.getSelection()?.toString() ?? "";
            const term = normalizeLookupTerm(selection)
                ?? this.getWordAtPoint(event.clientX, event.clientY, eventWindow.document);

            if (!term) return;

            this.captureSelection(term);
            this.contextMenuTerm = term;
            this.contextMenuTermAt = Date.now();
        });
        
        this.registerEvent(this.app.workspace.on('editor-menu', this.handleContextMenuHelper));
        this.registerEvent(this.app.workspace.on('file-menu', (menu) => {
            this.addPendingContextMenuLookup(menu);
        }));
        this.registerEvent(this.app.workspace.on('url-menu', (menu) => {
            this.addPendingContextMenuLookup(menu);
        }));
        this.registerEvent((this.app.workspace as any).on(
            'pdf-menu',
            (menu: Menu, context: { selection?: string }) => {
                const term = normalizeLookupTerm(context?.selection);
                if (term) this.addLookupMenuItem(menu, term);
            }
        ));

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file && this.settings.getLangFromFile) {
                let lang = this.app.metadataCache.getFileCache(file)?.frontmatter?.lang ?? null;
                if (!lang) {
                    lang = this.app.metadataCache.getFileCache(file)?.frontmatter?.language ?? null;
                }
                if (lang && Object.values(RFC).includes(lang)) {
                    this.settings.defaultLanguage = Object.keys(RFC)[Object.values(RFC).indexOf(lang)] as keyof APISettings;
                } else {
                    this.settings.defaultLanguage = this.settings.normalLang;
                }
                this.saveSettings();
            }
        }));
    }

    onunload(): void {
        console.log('unloading dictionary');
    }

    handleContextMenuHelper = (menu: Menu, editor: Editor, _: MarkdownView): void => {
        handleContextMenu(menu, editor, this);
    };

    addLookupMenuItem(menu: Menu, term: string): void {
        if (!this.settings.contextMenuLookup || !claimLookupMenu(menu, this.menusWithLookup)) {
            return;
        }

        menu.addItem((item) => {
            item.setTitle(`${t('Look up')} "${term}"`)
                .setIcon('quote-glyph')
                .setSection('dictionary')
                .onClick(() => {
                    void this.lookup(term);
                });
        });
    }

    private addPendingContextMenuLookup(menu: Menu): void {
        if (isRecentContextMenuTerm(this.contextMenuTermAt) && this.contextMenuTerm) {
            this.addLookupMenuItem(menu, this.contextMenuTerm);
        }
    }

    captureSelection(value: string | null | undefined): string | null {
        const term = normalizeLookupTerm(value);
        if (!term) return null;

        this.lastSelectedTerm = term;
        this.lastSelectionFilePath = this.app.workspace.getActiveFile()?.path ?? null;
        this.lastSelectionAt = Date.now();
        return term;
    }

    getLookupTerm(editor?: Editor): string | null {
        if (!editor) {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView?.getMode() === 'source') {
                editor = activeView.editor;
            }
        }

        const editorSelection = normalizeLookupTerm(editor?.getSelection());
        if (editorSelection) {
            return this.captureSelection(editorSelection);
        }

        const domSelection = normalizeLookupTerm(window.getSelection()?.toString());
        if (domSelection) {
            return this.captureSelection(domSelection);
        }

        if (editor) {
            const cursor = editor.getCursor();
            const wordAtCursor = getWordAtOffset(editor.getLine(cursor.line), cursor.ch);
            if (wordAtCursor) {
                return this.captureSelection(wordAtCursor);
            }
        }

        return this.getCachedSelection();
    }

    async lookup(value: string): Promise<void> {
        const term = normalizeLookupTerm(value);
        if (!term) {
            new Notice('Select a single word to look up.');
            return;
        }

        this.captureSelection(term);
        const leaf = await this.getDictionaryLeaf();
        if (!leaf || !(leaf.view instanceof DictionaryView)) {
            new Notice('Dictionary view could not be opened.');
            return;
        }

        leaf.view.query(term);
        this.app.workspace.revealLeaf(leaf);
    }

    private getCachedSelection(): string | null {
        const activePath = this.app.workspace.getActiveFile()?.path ?? null;
        const isSameFile = this.lastSelectionFilePath === activePath;
        const isRecent = Date.now() - this.lastSelectionAt < 5 * 60 * 1000;
        return isSameFile && isRecent ? this.lastSelectedTerm : null;
    }

    private async getDictionaryLeaf(): Promise<WorkspaceLeaf | null> {
        let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;
        if (leaf) return leaf;

        leaf = Platform.isMobile
            ? this.app.workspace.getLeaf(true)
            : this.app.workspace.getRightLeaf(false);
        if (!leaf) {
            leaf = this.app.workspace.getLeaf(true);
        }

        await leaf.setViewState({ type: VIEW_TYPE, active: true });
        return leaf;
    }

    private isMarkdownContextEvent(event: MouseEvent): boolean {
        return event.composedPath().some((node) => {
            const element = node as Element;
            if (typeof element.matches !== 'function') return false;
            return element.matches(
                '.markdown-source-view, .markdown-preview-view, .metadata-container, .metadata-properties'
            );
        });
    }

    private getWordAtPoint(x: number, y: number, ownerDocument = document): string | null {
        const documentWithCaret = ownerDocument as Document & {
            caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
            caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        const position = documentWithCaret.caretPositionFromPoint?.(x, y);
        if (position) {
            return getWordFromTextNode(position.offsetNode, position.offset);
        }

        const range = documentWithCaret.caretRangeFromPoint?.(x, y);
        return range ? getWordFromTextNode(range.startContainer, range.startOffset) : null;
    }

    // Open the synonym popover if a word is selected
    // This is debounced to handle double clicks
    handlePointerUp = debounce(
        () => {

            const activeLeaf = this.app.workspace.activeLeaf;

            if (activeLeaf?.view instanceof MarkdownView) {
                const view = activeLeaf.view;

                if (view.getMode() === 'source') {
                    const editor = view.editor;
                    const selection = editor.getSelection();

                    // Return early if we don't have anything selected, or if
                    // multiple words are selected
                    if (!selection || /\s/.test(selection)) return;

                    const cursor = editor.getCursor('from');
                    const line = editor.getLine(cursor.line);

                    let coords: Coords;

                    // Get the cursor position using the appropriate CM5 or CM6 interface
                    if ((editor as any).cursorCoords) {
                        coords = (editor as any).cursorCoords(true, 'window');
                    } else if ((editor as any).coordsAtPos) {
                        const offset = editor.posToOffset(cursor);
                        coords = (editor as any).cm.coordsAtPos?.(offset) ?? (editor as any).coordsAtPos(offset);
                    } else {
                        return;
                    }

                    this.synonymPopover = new SynonymPopover({
                        apiManager: this.manager,
                        advancedPoS: this.settings.advancedSynonymAnalysis,
                        coords,
                        cursor,
                        line,
                        selection,
                        onSelect: (replacement) => {
                            editor.replaceSelection(matchCasing(replacement, selection));
                        }
                    });
                }
            }
        },
        300,
        true
    );

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (this.settings.apiSettings.en_GB.synonymApiName === null) {
            this.settings.apiSettings.en_GB.synonymApiName = 'Free Dictionary API';
            await this.saveData(this.settings);
        }
    }

    async loadCache(): Promise<void> {
        this.cache = Object.assign({}, DEFAULT_CACHE, await this.loadCacheFromDisk());
    }

    async loadCacheFromDisk(): Promise<DictionaryCache> {
        const path = normalizePath(`${this.manifest.dir}/cache.json`);
        if (!(await this.app.vault.adapter.exists(path))) {
            await this.app.vault.adapter.write(path, "{}");
        }
        return JSON.parse(await this.app.vault.adapter.read(path)) as DictionaryCache;
    }

    async saveCache(): Promise<void> {
        await this.app.vault.adapter.write(normalizePath(`${this.manifest.dir}/cache.json`), JSON.stringify(this.cache));
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
