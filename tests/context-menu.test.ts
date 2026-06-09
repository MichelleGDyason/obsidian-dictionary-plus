import assert from "node:assert/strict";
import test from "node:test";

import {
    claimLookupMenu,
    isRecentContextMenuTerm,
} from "../src/contextMenu.ts";

test("adds dictionary lookup only once per menu", () => {
    const menu = {};
    const seen = new WeakSet<object>();

    assert.equal(claimLookupMenu(menu, seen), true);
    assert.equal(claimLookupMenu(menu, seen), false);
});

test("uses only the term captured for the current context menu", () => {
    assert.equal(isRecentContextMenuTerm(1_000, 2_999), true);
    assert.equal(isRecentContextMenuTerm(1_000, 3_000), false);
});
