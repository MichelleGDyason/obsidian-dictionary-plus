# Dictionary Plus

This is an AGPL-licensed enhancement of [phibr0/obsidian-dictionary](https://github.com/phibr0/obsidian-dictionary), with mobile selection recovery, desktop right-click lookup, current provider fixes, and flashcard-ready lookup history.

This plugin adds a dictionary to the [Obsidian](https://obsidian.md) note-taking tool.

## Install this version

### BRAT

1. Install and enable the **BRAT** community plugin.
2. Run **BRAT: Add a beta plugin for testing**.
3. Enter `MichelleGDyason/obsidian-dictionary-plus`.
4. Disable the original Dictionary community plugin if Obsidian shows both versions, then enable **Dictionary Plus**.

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/MichelleGDyason/obsidian-dictionary-plus/releases), place them in `.obsidian/plugins/dictionary-plus/`, and reload Obsidian.

## Usage

Open the *Command Palette* (default: `ctrl` + `p`), search for *Open Dictionary View* and run the command. You will see that a new View appears in the right Sidebar of Obsidian. You can set your default Language in Obsidian's Settings under *Plugin Options* > *Obsidian Dictionary* > *Default Language*.

### Look up selected text

- **Desktop:** select a word or place the cursor inside it, then right-click and choose **Look up**.
- **Mobile:** select a word, then run **Dictionary: Look up selected word** from the command palette. The plugin remembers the selection before the mobile menu collapses it.
- You can assign a hotkey to **Dictionary: Look up selected word** in Obsidian's Hotkeys settings.
- Reading view links and PDF++ selections support right-click lookup. **Look up** is appended to existing Obsidian and PDF++ menus, so their normal link, copy, annotation, and editing actions remain available. **Show Options in Context Menu** is enabled by default.

Selections are trimmed of surrounding punctuation. Phrases containing spaces are rejected because the configured dictionary providers expect one word.

### Lookup history and flashcards

Successful lookups are saved by default to `Dictionary/Lookup history.md`. The note is tagged `#flashcards` and each unique word is written in the single-line format used by the [Obsidian Spaced Repetition plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition):

```md
dictionary::noun: a reference source containing words and their meanings
```

Use **Dictionary: Open lookup history** to open the note. The automatic history and its path can be changed in Dictionary settings. The existing **New Note** button still creates a full dictionary note for the current result.

## Supported Languages

The following Languages are currently supported:

| Language             | Synonym Popover | Sidebar Lookup (Offline Support) | UI Translated? |
|:-------------------- |:---------------:|:--------------:|:-----------:|
| English (US)         |        🗸        |       🗸  (🗸)       |🗸|
| English (UK)         |                 |       🗸 (🗸)       ||
| Hindi                |                 |       🗸        ||
| Spanish              |        🗸        |       🗸        ||
| French               |        🗸        |       🗸        ||
| Japanese             |                 |       🗸        |🗸|
| Russian              |                 |       🗸        ||
| German               |        🗸        |       🗸        |🗸|
| Italian              |        🗸        |       🗸        |🗸|
| Korean               |                 |       🗸        ||
| Brazilian Portuguese |                 |       🗸        ||
| Arabic               |                 |       🗸        ||
| Turkish              |                 |       🗸        | |
| Chinese | | 🗸 (🗸) | 🗸 |

### How to use this for multiple Languages

To use a different language than your default language for the Dictionary and Synonym Popover you can add a `lang` or `language` key into your YAML Frontmatter. Use the following Values for the Language:

| Language | Key |
|---|:---:|
English (US)|`en-US`
हिन्दी (Hindi)|`hi`
Español (Spanish)|`es`
Français (French)|`fr`
日本語 (Japanese)|`ja`
Русский (Russian)|`ru`
English (UK)|`en_GB`
Deutsch (German)|`de`
Italiano (Italian)|`it`
한국어 (Korean)|`ko`
Português do Brasil (Brazilian Portuguese)|`pt-BR`
اَلْعَرَبِيَّةُ‎ (Arabic)|`ar`
Türkçe (Turkish)|`tr`
中文 (Chinese)|`zh`

## Offline Dictionary

As of Release 2.13.0 this Plugin has experimental offline Support for English and Chinese. The offline Dictionary is pretty big (about 35 megabytes), which is why it's not bundled with this Plugin by default. It will download the neccessary files **when you are using it for the first time**. That means your first look-up still requires an internet connection.

## Privacy

This Plugin relies on third-party [API's](https://en.wikipedia.org/wiki/API) to find Definitions, Synonyms, etc. You can select from a Range of API’s and choose which one to trust, the Plugin will not make requests to API’s you didn’t allow it to. To find more Information about the different API’s click the “More Info“ Button in the Settings.

If you explicitly activate the **Advanced Synonym Search**, there will be one additional API Call to analyze the *whole* Sentence the selected Word appears in. This will make the suggested Synonyms more accurate based on the context.

Even though this Plugin is fully Open-Source and thus can be looked over by anyone, the third-party API’s might not be.

## How to make this Plugin better

### Translations

If you want to help and translate this plugin to new languages, see [locales](https://github.com/MichelleGDyason/obsidian-dictionary-plus/tree/main/src/l10n/locale).

### New API's

This Plugin is meant to be easily extensible! If you want to add a new API for a new (or already supported) Language see: [API Manager](src/apiManager.ts).

You will need to create a new class for the new API, which implements [DefinitionProvider](src/api/types.ts) or [SynonymProvider](src/api/types.ts) (or both).

If the Language you are working with doesn't exist yet, add it to the `LANGUAGES` in [_constants.ts](src/_constants.ts).

After that, add the API to the respective List in the [API Manager](src/apiManager.ts) and finally open a Pull Request here on GitHub.
This will automatically make it selectable in the Settings.

> Special Thanks to [@mgmeyers](https://github.com/mgmeyers) for already making this Plugin a lot better!

## Variables

You can edit the Note Template for your local Dictionary in the Settings. Here is a List of Variables you can use:

- `{{notice}}` → "Autogenerated by Obsidian Dictionary" (Localized)
- `{{word}}` → The Word the File is created for
- `{{pronunciationHeader}}` → "Pronunciations" (Localized)
- `{{meaningHeader}}` → Same as above, but for "Meanings" (Localized)
- `{{originHeader}}` → Same as above, but for "Origin" (Localized)
- `{{phoneticList}}` → A List of all phonetics the Plugin found.
- `{{meanings}}` → Same as above, but for meanings the Plugin found.
- `{{origin}}` → Same as above, but for the word origin the Plugin found.

Localized means, that the Text changes based on Obsidians internal Language.

## Support me

If you find this Plugin helpful, consider supporting me:

<a href="https://www.buymeacoffee.com/phibr0"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=phibr0&button_colour=5F7FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>

> This Plugin relies on the [Free Dictionary API](https://dictionaryapi.dev/) by [meetDeveloper](https://github.com/meetDeveloper). He is providing this API to the public for free and needs help from the community. [**More Information**](https://github.com/meetDeveloper/freeDictionaryAPI#important-note)
