import type { Editor, Menu } from "obsidian";
import t from "src/l10n/helpers";
import type DictionaryPlugin from "src/main";

export default function handleContextMenu(menu: Menu, instance: Editor, plugin: DictionaryPlugin): boolean {
    if (!plugin.settings.contextMenuLookup) {
        return false;
    }
    const selection = plugin.getPendingContextMenuTerm() ?? plugin.getLookupTerm(instance);

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
        return plugin.addLookupMenuItem(menu, selection);
    }

    return false;
}
