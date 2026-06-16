import assert from "node:assert/strict";
import test from "node:test";

import { isNotFoundRequestError } from "../src/requestErrors.ts";

test("recognizes Obsidian request 404 errors", () => {
    assert.equal(
        isNotFoundRequestError(new Error("Request failed, status 404")),
        true
    );
});

test("does not hide other request failures", () => {
    assert.equal(
        isNotFoundRequestError(new Error("Request failed, status 500")),
        false
    );
});
