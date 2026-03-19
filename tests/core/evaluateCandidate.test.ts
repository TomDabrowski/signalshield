import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultRules,
  evaluateCandidate,
  type ContentCandidate,
  type FilterRules
} from "../../packages/core/src/index";

const makeRules = (overrides: Partial<FilterRules> = {}): FilterRules => ({
  ...defaultRules,
  ...overrides
});

const youtubeCandidate = (overrides: Partial<ContentCandidate> = {}): ContentCandidate => ({
  surface: "youtube",
  title: "Example title",
  channelId: "UC_BLOCKED",
  channelName: "Blocked Channel",
  ...overrides
});

test("allows own channels immediately", () => {
  const result = evaluateCandidate(
    youtubeCandidate({ channelId: "UC_OWN" }),
    makeRules({ ownChannels: ["UC_OWN"] })
  );

  assert.equal(result.action, "allow");
  assert.match(result.reasons.join(" "), /own or allowed channel/i);
});

test("hides blocked title patterns", () => {
  const result = evaluateCandidate(
    youtubeCandidate({ title: "Amazing trailer cover version" }),
    makeRules()
  );

  assert.equal(result.action, "hide");
  assert.match(result.reasons.join(" "), /title matched "cover"/i);
});

test("allows exception-listed channels for matching queries", () => {
  const result = evaluateCandidate(
    youtubeCandidate({
      channelId: "UC_ALLOWED_FOR_QUERY",
      query: "my trailer title"
    }),
    makeRules({
      exceptions: [
        {
          name: "Own trailer query",
          queryContains: "my trailer",
          allowOnlyChannels: ["UC_ALLOWED_FOR_QUERY"]
        }
      ]
    })
  );

  assert.equal(result.action, "allow");
});

test("hides non-own channels when they strongly match an own video", () => {
  const result = evaluateCandidate(
    youtubeCandidate({
      title: "My cinematic launch trailer 2026 cover",
      query: "my cinematic launch trailer"
    }),
    makeRules({
      ownChannels: ["UC_OWN"],
      ownVideos: [
        {
          title: "My Cinematic Launch Trailer 2026"
        }
      ]
    })
  );

  assert.equal(result.action, "hide");
  assert.match(result.reasons.join(" "), /matched own video/i);
});

test("allows own-channel uploads that match an own video", () => {
  const result = evaluateCandidate(
    youtubeCandidate({
      channelId: "UC_OWN",
      title: "My Cinematic Launch Trailer 2026"
    }),
    makeRules({
      ownChannels: ["UC_OWN"],
      ownVideos: [
        {
          title: "My Cinematic Launch Trailer 2026"
        }
      ]
    })
  );

  assert.equal(result.action, "allow");
});

test("hides channels not on the allowlist when strict channel mode is enabled", () => {
  const result = evaluateCandidate(
    youtubeCandidate({ channelId: "UC_SOMEONE_ELSE" }),
    makeRules({
      ownChannels: ["UC_OWN"],
      blockIfChannelNotAllowed: true
    })
  );

  assert.equal(result.action, "hide");
  assert.match(result.reasons.join(" "), /channel not allowlisted/i);
});
