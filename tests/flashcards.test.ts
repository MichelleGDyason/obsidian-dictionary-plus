import assert from "node:assert/strict";
import test from "node:test";

import { buildFlashcardEntry } from "../src/flashcards.ts";

test("builds a Spaced Repetition single-line card from the first definition", () => {
    const result = buildFlashcardEntry({
        word: "Dictionary",
        phonetics: [],
        meanings: [{
            partOfSpeech: "noun",
            definitions: [{
                definition: "A reference work\nthat explains words.",
            }],
        }],
    }, "en-US");

    assert.deepEqual(result, {
        marker: "<!-- obsidian-dictionary:en-US:dictionary -->",
        markdown: "Dictionary::noun: A reference work that explains words.\n<!-- obsidian-dictionary:en-US:dictionary -->\n\n",
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
