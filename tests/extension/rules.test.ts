import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeChannelIdentifier,
  normalizeChannelIdentifiers
} from "../../packages/extension/src/lib/rules";

test("normalizes full youtube channel urls into stable identifiers", () => {
  assert.equal(
    normalizeChannelIdentifier("https://www.youtube.com/channel/UC123456789"),
    "UC123456789"
  );
  assert.equal(
    normalizeChannelIdentifier("https://www.youtube.com/@myhandle"),
    "@myhandle"
  );
});

test("deduplicates and trims normalized channel identifiers", () => {
  assert.deepEqual(
    normalizeChannelIdentifiers([
      " @myhandle ",
      "https://www.youtube.com/@myhandle",
      "https://www.youtube.com/channel/UC123456789",
      "UC123456789"
    ]),
    ["@myhandle", "UC123456789"]
  );
});
