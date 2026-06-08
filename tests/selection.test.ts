import assert from "node:assert/strict";
import test from "node:test";

import { getWordAtOffset, normalizeLookupTerm } from "../src/selection.ts";

test("normalizes punctuation around a selected word", () => {
    assert.equal(normalizeLookupTerm("  “dictionary,” "), "dictionary");
});

test("keeps apostrophes, curly apostrophes, and hyphens inside words", () => {
    assert.equal(normalizeLookupTerm("don't"), "don't");
    assert.equal(normalizeLookupTerm("mother-in-law"), "mother-in-law");
    assert.equal(normalizeLookupTerm("l’esprit"), "l’esprit");
});

test("rejects empty selections and phrases", () => {
    assert.equal(normalizeLookupTerm(""), null);
    assert.equal(normalizeLookupTerm("two words"), null);
});

test("extracts the word under or immediately before a cursor", () => {
    const text = "Look up mother-in-law now.";

    assert.equal(getWordAtOffset(text, text.indexOf("mother") + 3), "mother-in-law");
    assert.equal(getWordAtOffset(text, text.indexOf(" now")), "mother-in-law");
    assert.equal(getWordAtOffset(text, text.length), "now");
});
