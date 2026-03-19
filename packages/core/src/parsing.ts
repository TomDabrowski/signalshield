import { normalizeText } from "./index";

export const cleanSearchQuery = (value?: string): string => {
  if (!value) {
    return "";
  }

  const trimmed = value.startsWith("?") ? value.slice(1) : value;
  const params = new URLSearchParams(trimmed);

  return normalizeText(params.get("q") ?? value);
};

export const parseYouTubeVideoId = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url, "https://www.youtube.com");

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace("/", "") || undefined;
    }

    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v") ?? undefined;
    }

    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
    return shortsMatch?.[1];
  } catch {
    return undefined;
  }
};

export const extractGoogleTargetUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url, "https://www.google.com");
    if (parsed.pathname === "/url") {
      return parsed.searchParams.get("q") ?? parsed.searchParams.get("url") ?? undefined;
    }

    return parsed.toString();
  } catch {
    return url;
  }
};

export const looksLikeYouTubeUrl = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url, "https://www.google.com");
    return parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be";
  } catch {
    return false;
  }
};

export const parseYouTubeChannelId = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url, "https://www.youtube.com");
    const channelMatch = parsed.pathname.match(/^\/channel\/([^/?]+)/);
    if (channelMatch?.[1]) {
      return channelMatch[1];
    }

    const handleMatch = parsed.pathname.match(/^\/(@[^/?]+)/);
    if (handleMatch?.[1]) {
      return handleMatch[1].toLowerCase();
    }

    const legacyMatch = parsed.pathname.match(/^\/(?:c|user)\/([^/?]+)/);
    if (legacyMatch?.[1]) {
      return legacyMatch[1].toLowerCase();
    }

    return undefined;
  } catch {
    return undefined;
  }
};
