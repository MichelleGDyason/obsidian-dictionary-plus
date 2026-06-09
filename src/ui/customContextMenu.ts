import type { Editor, Menu } from "obsidian";
import t from "src/l10n/helpers";
import type DictionaryPlugin from "src/main";

export default function handleContextMenu(menu: Menu, instance: Editor, plugin: DictionaryPlugin): void {
    if (!plugin.settings.contextMenuLookup) {
        return;
    }
    const selection = plugin.getLookupTerm(instance);

    if (selection) {
        if (!plugin.settings.shouldShowSynonymPopover) {
            menu.addItem((item) => {
                item.setTitle(t('Show Synonyms'))
                    .setIcon('synonyms')
                    .onClick(() => {
                        plugin.handlePointerUp();
                    });
            });
        }
        plugin.addLookupMenuItem(menu, selection);
    }
}
