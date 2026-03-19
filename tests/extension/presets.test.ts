import test from "node:test";
import assert from "node:assert/strict";

import { defaultRules } from "../../packages/core/src/index";
import {
  AGGRESSIVE_CHANNEL_PATTERNS,
  AGGRESSIVE_TITLE_PATTERNS,
  applyAggressivePreset
} from "../../packages/extension/src/lib/presets";

test("aggressive preset adds expected title patterns", () => {
  const rules = applyAggressivePreset(defaultRules);

  for (const pattern of AGGRESSIVE_TITLE_PATTERNS) {
    assert.equal(rules.blockTitlePatterns.includes(pattern), true);
  }
});

test("aggressive preset adds expected channel patterns without duplicates", () => {
  const rules = applyAggressivePreset({
    ...defaultRules,
    blockChannelPatterns: ["nightcore"]
  });

  assert.equal(rules.blockChannelPatterns?.includes("nightcore"), true);
  assert.equal(
    rules.blockChannelPatterns?.filter((pattern) => pattern === "nightcore").length,
    1
  );

  for (const pattern of AGGRESSIVE_CHANNEL_PATTERNS) {
    assert.equal(rules.blockChannelPatterns?.includes(pattern), true);
  }
});
