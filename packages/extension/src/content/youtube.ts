import {
  evaluateAndHide,
  extractText,
  getChannelIdFromElement,
  getVideoIdFromElement
} from "./shared";

const VIDEO_RENDERER_SELECTOR = [
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-rich-item-renderer",
  "ytd-rich-grid-media",
  "yt-lockup-view-model",
  "ytd-playlist-video-renderer",
  "ytd-reel-item-renderer"
].join(",");

const resolveRendererRoot = (element: Element): Element => {
  return (
    element.closest("ytd-rich-item-renderer") ??
    element.closest("ytd-video-renderer") ??
    element.closest("ytd-grid-video-renderer") ??
    element.closest("ytd-playlist-video-renderer") ??
    element.closest("ytd-reel-item-renderer") ??
    element.closest("ytd-compact-video-renderer") ??
    element
  );
};

const processRenderer = async (element: Element): Promise<void> => {
  const root = resolveRendererRoot(element);

  if (root.getAttribute("data-signalshield-processed") === "true") {
    return;
  }

  root.setAttribute("data-signalshield-processed", "true");

  const title =
    extractText(root, "#video-title") ??
    extractText(root, "a#video-title") ??
    extractText(root, "h3") ??
    extractText(root, 'a[title]') ??
    extractText(root, "#video-title-link");

  const channelName =
    extractText(root, "#channel-name") ??
    extractText(root, "ytd-channel-name") ??
    extractText(root, ".ytd-channel-name") ??
    extractText(root, "#text.ytd-channel-name") ??
    extractText(root, "#byline-container");

  const href =
    root.querySelector<HTMLAnchorElement>("a#thumbnail")?.href ??
    root.querySelector<HTMLAnchorElement>("a#video-title")?.href ??
    root.querySelector<HTMLAnchorElement>("#video-title-link")?.href ??
    root.querySelector<HTMLAnchorElement>('a[href*="/watch"]')?.href ??
    root.querySelector<HTMLAnchorElement>('a[href*="/shorts/"]')?.href;

  const channelUrl =
    root.querySelector<HTMLAnchorElement>('a[href*="/channel/"]')?.href ??
    root.querySelector<HTMLAnchorElement>("#channel-name a")?.href ??
    root.querySelector<HTMLAnchorElement>("ytd-channel-name a")?.href;

  const videoId = getVideoIdFromElement(root);
  const channelId = getChannelIdFromElement(root);

  // Ignore non-video cards that do not carry enough signal yet.
  if (!title && !href && !videoId) {
    return;
  }

  await evaluateAndHide(root, {
    surface: "youtube",
    channelId,
    title,
    channelName,
    url: href,
    channelUrl,
    videoId
  });
};

const scan = (): void => {
  document.querySelectorAll(VIDEO_RENDERER_SELECTOR).forEach((element) => {
    void processRenderer(element);
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
