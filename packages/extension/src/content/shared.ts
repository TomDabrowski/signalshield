import {
  evaluateCandidate,
  type ContentCandidate,
  type FilterRules
} from "../../../core/src/index";
import {
  cleanSearchQuery,
  extractYouTubeChannelIdFromText,
  isYouTubeChannelPath,
  parseYouTubeChannelId,
  parseYouTubeVideoId
} from "../../../core/src/parsing";
import { getStoredRules } from "../lib/rules";

let cachedPageChannelLookupUrl = "";
let cachedPageChannelId: string | undefined;
let cachedPageChannelSignals: string[] = [];

export const loadRules = async (): Promise<FilterRules> => getStoredRules();

export const hideElement = (element: Element, reason: string): void => {
  element.setAttribute("data-signalshield-hidden", "true");
  (element as HTMLElement).style.display = "none";
  element.setAttribute("data-signalshield-reason", reason);
};

export const evaluateAndHide = async (
  element: Element,
  candidate: ContentCandidate
): Promise<void> => {
  const rules = await loadRules();
  const result = evaluateCandidate(candidate, rules);

  if (result.action === "hide") {
    hideElement(element, result.reasons.join(", "));
  }
};

export const getChannelIdFromElement = (root: ParentNode): string | undefined => {
  const candidates = [
    root.querySelector<HTMLAnchorElement>('a[href*="/channel/"]')?.href,
    root.querySelector<HTMLAnchorElement>('a[href*="/@"]')?.href,
    root.querySelector<HTMLAnchorElement>('a[href*="/user/"]')?.href,
    root.querySelector<HTMLAnchorElement>('a[href*="/c/"]')?.href,
    root.querySelector<HTMLAnchorElement>("#channel-name a")?.href,
    root.querySelector<HTMLAnchorElement>("ytd-channel-name a")?.href
  ];

  for (const href of candidates) {
    const channelId = parseYouTubeChannelId(href);
    if (channelId) {
      return channelId;
    }
  }

  return undefined;
};

export const getCurrentYouTubeChannelId = (): string | undefined => {
  return getCurrentYouTubeChannelSignals()[0];
};

export const getCurrentYouTubeChannelSignals = (): string[] => {
  if (!isYouTubeChannelPath(window.location.pathname)) {
    cachedPageChannelLookupUrl = "";
    cachedPageChannelId = undefined;
    cachedPageChannelSignals = [];
    return [];
  }

  if (cachedPageChannelLookupUrl === window.location.href) {
    return cachedPageChannelSignals;
  }

  const candidates = [
    document.querySelector<HTMLAnchorElement>(
      'ytd-c4-tabbed-header-renderer a[href*="/channel/"], ytd-c4-tabbed-header-renderer a[href^="/@"], ytd-channel-name a[href*="/channel/"], ytd-channel-name a[href^="/@"], yt-page-header-view-model a[href*="/channel/"], yt-page-header-view-model a[href^="/@"]'
    )?.href,
    document.querySelector<HTMLMetaElement>('meta[itemprop="channelId"]')?.content,
    document.querySelector<HTMLMetaElement>('meta[itemprop="identifier"]')?.content,
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
    window.location.href
  ];

  const resolvedSignals: string[] = [];

  for (const candidate of candidates) {
    const channelId = extractYouTubeChannelIdFromText(candidate);
    if (channelId && !resolvedSignals.includes(channelId)) {
      resolvedSignals.push(channelId);
    }
  }

  for (const script of Array.from(document.scripts)) {
    const scriptText = script.textContent ?? "";
    if (
      !scriptText.includes("channelMetadataRenderer") &&
      !scriptText.includes("ownerExternalChannelId") &&
      !scriptText.includes('"externalId":"UC')
    ) {
      continue;
    }

    const channelId = extractYouTubeChannelIdFromText(scriptText);
    if (channelId && !resolvedSignals.includes(channelId)) {
      resolvedSignals.push(channelId);
    }
  }

  cachedPageChannelLookupUrl = window.location.href;
  cachedPageChannelSignals = resolvedSignals;
  cachedPageChannelId = resolvedSignals[0];
  return resolvedSignals;
};

export const getVideoIdFromElement = (root: ParentNode): string | undefined => {
  const candidates = [
    root.querySelector<HTMLAnchorElement>("a#thumbnail")?.href,
    root.querySelector<HTMLAnchorElement>("a#video-title")?.href,
    root.querySelector<HTMLAnchorElement>('a[href*="/watch"]')?.href,
    root.querySelector<HTMLAnchorElement>('a[href*="/shorts/"]')?.href
  ];

  for (const href of candidates) {
    const videoId = parseYouTubeVideoId(href);
    if (videoId) {
      return videoId;
    }
  }

  return undefined;
};

export const getCurrentGoogleQuery = (): string => {
  return cleanSearchQuery(window.location.search);
};

export const extractText = (root: ParentNode, selector: string): string | undefined => {
  return root.querySelector<HTMLElement>(selector)?.innerText?.trim();
};
