import {
  extractGoogleTargetUrl,
  looksLikeYouTubeUrl,
  parseYouTubeChannelId,
  parseYouTubeVideoId
} from "../../../core/src/parsing";
import { evaluateAndHide, extractText, getCurrentGoogleQuery } from "./shared";

const GOOGLE_RESULT_SELECTOR = "div.g, div[data-snc], div[data-hveid]";

const extractResultUrl = (element: Element): string | undefined => {
  const rawHref =
    element.querySelector<HTMLAnchorElement>("a[href]")?.href ??
    element.querySelector<HTMLAnchorElement>("h3 a")?.href;

  return extractGoogleTargetUrl(rawHref);
};

const extractChannelSignal = (element: Element): { channelId?: string; channelName?: string } => {
  const channelLink =
    element.querySelector<HTMLAnchorElement>('a[href*="/channel/"]')?.href ??
    element.querySelector<HTMLAnchorElement>('a[href*="youtube.com/@"]')?.href ??
    element.querySelector<HTMLAnchorElement>('a[href*="youtube.com/user/"]')?.href ??
    element.querySelector<HTMLAnchorElement>('a[href*="youtube.com/c/"]')?.href;

  const channelName =
    extractText(element, "[data-sncf]") ??
    extractText(element, ".VuuXrf") ??
    extractText(element, ".MUxGbd") ??
    extractText(element, ".tjvcx") ??
    extractText(element, ".LfVVr") ??
    extractText(element, "cite");

  return {
    channelId: parseYouTubeChannelId(channelLink),
    channelName
  };
};

const processResult = async (element: Element): Promise<void> => {
  if (element.getAttribute("data-signalshield-processed") === "true") {
    return;
  }

  element.setAttribute("data-signalshield-processed", "true");

  const href = extractResultUrl(element);

  if (!looksLikeYouTubeUrl(href)) {
    return;
  }

  const title = extractText(element, "h3");
  const snippet =
    extractText(element, ".VwiC3b") ??
    extractText(element, ".yXK7lf") ??
    extractText(element, ".s3v9rd");
  const { channelId, channelName } = extractChannelSignal(element);
  const videoId = parseYouTubeVideoId(href);

  await evaluateAndHide(element, {
    surface: "google",
    channelId,
    title: title ?? snippet,
    channelName,
    query: getCurrentGoogleQuery() || snippet,
    url: href,
    videoId
  });
};

const scan = (): void => {
  document.querySelectorAll(GOOGLE_RESULT_SELECTOR).forEach((element) => {
    void processResult(element);
  });
};

const observer = new MutationObserver(() => {
  scan();
});

scan();
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
