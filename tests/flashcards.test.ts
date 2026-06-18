import assert from "node:assert/strict";
import test from "node:test";

import {
    buildFlashcardEntry,
    dictionaryWordFromFlashcardHistory,
    upsertFlashcardEntry,
} from "../src/flashcards.ts";

test("builds a Spaced Repetition single-line card from every definition", () => {
    const result = buildFlashcardEntry({
        word: "Dictionary",
        phonetics: [],
        meanings: [{
            partOfSpeech: "noun",
            definitions: [{
                definition: "A reference work\nthat explains words.",
            }, {
                definition: "A list of words used by a program.",
            }],
        }, {
            partOfSpeech: "verb",
            definitions: [{
                definition: "To add something to a dictionary.",
            }],
        }],
    }, "en-US");

    assert.deepEqual(result, {
        marker: "<!-- obsidian-dictionary:en-US:dictionary -->",
        markdown: "Dictionary::noun: A reference work that explains words. | noun: A list of words used by a program. | verb: To add something to a dictionary.\n<!-- obsidian-dictionary:en-US:dictionary -->\n\n",
    });
});

test("uses a case-insensitive marker and removes nested card separators", () => {
    const result = buildFlashcardEntry({
        word: "Test",
        phonetics: [],
        meanings: [{
            partOfSpeech: "",
            definitions: [{
                definition: "A trial::or examination.",
            }],
        }],
    }, "en-US");

    assert.equal(result?.marker, "<!-- obsidian-dictionary:en-US:test -->");
    assert.match(result?.markdown ?? "", /^Test::A trial:or examination\./);
});

test("returns null when no usable definition exists", () => {
    assert.equal(buildFlashcardEntry({
        word: "unknown",
        phonetics: [],
        meanings: [],
    }, "en-US"), null);
});

test("replaces an existing lookup history block for the same word", () => {
    const entry = buildFlashcardEntry({
        word: "Test",
        phonetics: [],
        meanings: [{
            partOfSpeech: "noun",
            definitions: [{
                definition: "A complete definition.",
            }, {
                definition: "Another definition.",
            }],
        }],
    }, "en-US");

    assert.ok(entry);
    const current = [
        "# Dictionary lookup flashcards",
        "",
        "#flashcards",
        "",
        "Test::old definition",
        "<!-- obsidian-dictionary:en-US:test -->",
        "",
    ].join("\n");

    assert.equal(
        upsertFlashcardEntry(current, entry),
        "# Dictionary lookup flashcards\n\n#flashcards\n\nTest::noun: A complete definition. | noun: Another definition.\n<!-- obsidian-dictionary:en-US:test -->\n\n"
    );
});

test("rebuilds a dictionary word from lookup history", () => {
    const markdown = [
        "# Dictionary lookup flashcards",
        "",
        "decipher::noun: A decipherment; a decoding. | verb: To decode a code. | verb: To read obscure text.",
        "<!--SR:!2026-06-21,4,270-->",
        "<!-- obsidian-dictionary:en-US:decipher -->",
        "",
    ].join("\n");

    assert.deepEqual(
        dictionaryWordFromFlashcardHistory(markdown, "Decipher"),
        {
            word: "decipher",
            phonetics: [],
            meanings: [{
                partOfSpeech: "noun",
                definitions: [{ definition: "A decipherment; a decoding." }],
            }, {
                partOfSpeech: "verb",
                definitions: [
                    { definition: "To decode a code." },
                    { definition: "To read obscure text." },
                ],
            }],
        }
    );
});

test("returns null when lookup history has no matching dictionary marker", () => {
    assert.equal(
        dictionaryWordFromFlashcardHistory("other::definition", "missing"),
        null
    );
});
