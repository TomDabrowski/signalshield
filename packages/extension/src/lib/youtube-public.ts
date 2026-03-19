import { parseYouTubeChannelId, parseYouTubeVideoId } from "../../../core/src/parsing";
import type { VideoSeed } from "../../../core/src/index";

const YOUTUBE_BASE_URL = "https://www.youtube.com";

export interface PublicChannelImportResult {
  channelId: string;
  videos: VideoSeed[];
}

export const normalizeChannelLookupInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("@")) {
    return `${YOUTUBE_BASE_URL}/${trimmed}`;
  }

  if (trimmed.startsWith("UC")) {
    return `${YOUTUBE_BASE_URL}/channel/${trimmed}`;
  }

  return `${YOUTUBE_BASE_URL}/@${trimmed}`;
};

export const extractChannelIdFromHtml = (html: string): string | undefined => {
  const feedMatch = html.match(/feeds\/videos\.xml\?channel_id=([A-Za-z0-9_-]+)/);
  if (feedMatch?.[1]) {
    return feedMatch[1];
  }

  const externalIdMatch = html.match(/"externalId":"(UC[^"]+)"/);
  if (externalIdMatch?.[1]) {
    return externalIdMatch[1];
  }

  const canonicalMatch = html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (canonicalMatch?.[1]) {
    return canonicalMatch[1];
  }

  return undefined;
};

export const extractVideosFromFeedXml = (xmlText: string): VideoSeed[] => {
  const entryPattern = /<entry\b[\s\S]*?<\/entry>/g;
  const titlePattern = /<title>([\s\S]*?)<\/title>/;
  const videoIdPattern = /<(?:yt:)?videoId>([\s\S]*?)<\/(?:yt:)?videoId>/;
  const linkPattern = /<link[^>]+href="([^"]+)"/;

  return Array.from(xmlText.matchAll(entryPattern))
    .map((match) => {
      const entryXml = match[0];
      const title = titlePattern.exec(entryXml)?.[1]?.trim() ?? "";
      const videoId =
        videoIdPattern.exec(entryXml)?.[1]?.trim() ??
        parseYouTubeVideoId(linkPattern.exec(entryXml)?.[1] ?? undefined);

      if (!title) {
        return undefined;
      }

      return {
        title,
        videoId: videoId || undefined
      } as VideoSeed;
    })
    .filter((entry): entry is VideoSeed => Boolean(entry));
};

export const parsePublicChannelFeed = (xmlText: string): VideoSeed[] => {
  if (typeof DOMParser === "undefined") {
    return extractVideosFromFeedXml(xmlText);
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const entries = Array.from(xml.querySelectorAll("entry"));
  const videos: VideoSeed[] = [];

  for (const entry of entries) {
    const title = entry.querySelector("title")?.textContent?.trim() ?? "";
    const videoIdNode =
      entry.querySelector("videoId")?.textContent?.trim() ??
      parseYouTubeVideoId(entry.querySelector("link")?.getAttribute("href") ?? undefined);

    if (!title) {
      continue;
    }

    videos.push({
      title,
      videoId: videoIdNode || undefined
    });
  }

  return videos;
};

export const dedupeVideoSeeds = (videos: VideoSeed[]): VideoSeed[] => {
  const seen = new Set<string>();

  return videos.filter((video) => {
    const key = video.videoId ?? video.title.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const importPublicChannelVideos = async (
  channelInput: string
): Promise<PublicChannelImportResult> => {
  const lookupUrl = normalizeChannelLookupInput(channelInput);
  if (!lookupUrl) {
    throw new Error("Enter a channel handle, ID, or URL");
  }

  const directChannelId = parseYouTubeChannelId(lookupUrl);
  let channelId = directChannelId?.startsWith("UC") ? directChannelId : undefined;

  if (!channelId) {
    const pageResponse = await fetch(lookupUrl);
    if (!pageResponse.ok) {
      throw new Error(`Could not load channel page (${pageResponse.status})`);
    }

    const html = await pageResponse.text();
    channelId = extractChannelIdFromHtml(html);
  }

  if (!channelId) {
    throw new Error("Could not resolve a public channel ID from that input");
  }

  const feedResponse = await fetch(`${YOUTUBE_BASE_URL}/feeds/videos.xml?channel_id=${channelId}`);
  if (!feedResponse.ok) {
    throw new Error(`Could not load public channel feed (${feedResponse.status})`);
  }

  const feedText = await feedResponse.text();
  const videos = dedupeVideoSeeds(parsePublicChannelFeed(feedText));

  if (videos.length === 0) {
    throw new Error("No public videos found for that channel");
  }

  return {
    channelId,
    videos
  };
};
