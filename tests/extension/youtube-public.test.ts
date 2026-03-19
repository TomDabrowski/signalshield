import test from "node:test";
import assert from "node:assert/strict";

import {
  dedupeVideoSeeds,
  extractChannelIdFromHtml,
  extractVideosFromFeedXml,
  normalizeChannelLookupInput,
  parsePublicChannelFeed
} from "../../packages/extension/src/lib/youtube-public";

test("normalizes public channel lookup inputs", () => {
  assert.equal(
    normalizeChannelLookupInput("@tomdabrowskimusic"),
    "https://www.youtube.com/@tomdabrowskimusic"
  );
  assert.equal(
    normalizeChannelLookupInput("UC123456789"),
    "https://www.youtube.com/channel/UC123456789"
  );
});

test("extracts channel ids from public channel html", () => {
  const html =
    '<link rel="alternate" type="application/rss+xml" href="https://www.youtube.com/feeds/videos.xml?channel_id=UC123456789" />';

  assert.equal(extractChannelIdFromHtml(html), "UC123456789");
});

test("parses public channel feeds into video seeds", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
      <entry>
        <title>First Video</title>
        <yt:videoId>abc123</yt:videoId>
      </entry>
      <entry>
        <title>Second Video</title>
        <yt:videoId>def456</yt:videoId>
      </entry>
    </feed>`;

  assert.deepEqual(parsePublicChannelFeed(xml), [
    { title: "First Video", videoId: "abc123" },
    { title: "Second Video", videoId: "def456" }
  ]);
});

test("extracts videos from feed xml without relying on DOMParser", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <feed>
      <entry>
        <title>Fallback Video</title>
        <yt:videoId>xyz789</yt:videoId>
      </entry>
    </feed>`;

  assert.deepEqual(extractVideosFromFeedXml(xml), [{ title: "Fallback Video", videoId: "xyz789" }]);
});

test("deduplicates imported video seeds by video id", () => {
  assert.deepEqual(
    dedupeVideoSeeds([
      { title: "First Video", videoId: "abc123" },
      { title: "First Video duplicate", videoId: "abc123" },
      { title: "Second Video", videoId: "def456" }
    ]),
    [
      { title: "First Video", videoId: "abc123" },
      { title: "Second Video", videoId: "def456" }
    ]
  );
});
