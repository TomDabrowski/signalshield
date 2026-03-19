import {
  evaluateCandidate,
  type ContentCandidate,
  type FilterRules
} from "../../../core/src/index";
import {
  cleanSearchQuery,
  parseYouTubeChannelId,
  parseYouTubeVideoId
} from "../../../core/src/parsing";
import { getStoredRules } from "../lib/rules";

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
