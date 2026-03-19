import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanSearchQuery,
  extractGoogleTargetUrl,
  looksLikeYouTubeUrl,
  parseYouTubeChannelId,
  parseYouTubeVideoId
} from "../../packages/core/src/parsing";

test("cleans google query strings down to q", () => {
  assert.equal(cleanSearchQuery("?q=My+Trailer&sourceid=chrome"), "my trailer");
});

test("extracts youtube watch ids", () => {
  assert.equal(
    parseYouTubeVideoId("https://www.youtube.com/watch?v=abc123XYZ"),
    "abc123XYZ"
  );
});

test("extracts youtube shorts ids", () => {
  assert.equal(parseYouTubeVideoId("https://www.youtube.com/shorts/short987"), "short987");
});

test("extracts google redirect targets", () => {
  assert.equal(
    extractGoogleTargetUrl(
      "https://www.google.com/url?q=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc123"
    ),
    "https://www.youtube.com/watch?v=abc123"
  );
});

test("recognizes youtube hosts after redirect extraction", () => {
  assert.equal(looksLikeYouTubeUrl("https://youtu.be/abc123"), true);
  assert.equal(looksLikeYouTubeUrl("https://example.com/watch?v=abc123"), false);
});

test("extracts channel ids and handles", () => {
  assert.equal(
    parseYouTubeChannelId("https://www.youtube.com/channel/UC123456789"),
    "UC123456789"
  );
  assert.equal(parseYouTubeChannelId("https://www.youtube.com/@myhandle"), "@myhandle");
});
