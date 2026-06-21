import type DictionaryPlugin from "src/main";

import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE, VIEW_DISPLAY_TEXT, VIEW_ICON } from "src/_constants";
import DictionaryComponent from "./dictionaryView.svelte";
import LanguageChooser from "src/ui/modals/languageChooser";
import DefinitionProviderChooser from "src/ui/modals/definitionProviderChooser";
import { getWordFromTextNode, normalizeLookupTerm } from "src/selection";

type DictionaryComponentInstance = {
    $destroy(): void;
    searchFor(query: string): void;
    focusSearch(): void;
};

type DictionaryComponentConstructor = new (options: {
    target: HTMLElement;
    props: {
        manager: DictionaryPlugin["manager"];
        localDictionary: DictionaryPlugin["localDictionary"];
    };
}) => DictionaryComponentInstance;

const TypedDictionaryComponent = DictionaryComponent as unknown as DictionaryComponentConstructor;

export default class DictionaryView extends ItemView {

    plugin: DictionaryPlugin;
    private _view: DictionaryComponentInstance | null = null;
    private pendingQuery: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: DictionaryPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    query(query: string): void {
        if (this._view) {
            this._view.searchFor(query);
        } else {
            this.pendingQuery = query;
        }
    }

    focusSearch(): void {
        this._view?.focusSearch();
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return VIEW_DISPLAY_TEXT;
    }

    getIcon(): string {
        return VIEW_ICON;
    }

    onClose(): Promise<void> {
        this._view?.$destroy();
        return super.onClose();
    }

    onOpen(): Promise<void> {
        this._view = new TypedDictionaryComponent({
            target: this.contentEl,
            props: {
                manager: this.plugin.manager,
                localDictionary: this.plugin.localDictionary,
            }
        });
        this.contentEl.addClass("dictionary-view-content");
        this.registerDomEvent(this.contentEl, "contextmenu", (event) => {
            const target = event.target;
            if (!(target instanceof Element) || !target.closest(".contents")) {
                return;
            }

            const term = this.getSelectedTerm()
                ?? this.getWordAtPoint(event);
            if (term) {
                this.plugin.showLookupMenuAtMouseEvent(event, term);
            }
        });
        if (this.pendingQuery) {
            this._view.searchFor(this.pendingQuery);
            this.pendingQuery = null;
        }
        addEventListener('dictionary-open-language-switcher', () => {
            new LanguageChooser(this.app, this.plugin).open();
        });
        addEventListener('dictionary-open-api-switcher', () => {
            new DefinitionProviderChooser(this.app, this.plugin).open();
        });
        return super.onOpen();
    }

    private getSelectedTerm(): string | null {
        const selection = this.contentEl.ownerDocument.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return null;
        }

        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        if (!this.containsNode(anchorNode) || !this.containsNode(focusNode)) {
            return null;
        }

        return normalizeLookupTerm(selection.toString());
    }

    private getWordAtPoint(event: MouseEvent): string | null {
        const ownerDocument = event.view?.document ?? activeDocument;
        const documentWithCaret = ownerDocument as Document & {
            caretPositionFromPoint?: (x: number, y: number) => {
                offsetNode: Node;
                offset: number;
            } | null;
        };

        const position = documentWithCaret.caretPositionFromPoint?.(event.clientX, event.clientY);
        return position ? getWordFromTextNode(position.offsetNode, position.offset) : null;
    }

    private containsNode(node: Node | null): boolean {
        if (!node) return false;
        const element = node.nodeType === Node.ELEMENT_NODE
            ? node
            : node.parentElement;
        return Boolean(element && this.contentEl.contains(element));
    }

}
