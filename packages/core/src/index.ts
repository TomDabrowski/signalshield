export type ContentSurface = "youtube" | "google";

export interface VideoSeed {
  title: string;
  aliases?: string[];
  videoId?: string;
}

export interface FilterException {
  name?: string;
  queryContains?: string;
  titleContains?: string;
  allowOwnChannels?: boolean;
  allowOnlyChannels?: string[];
}

export interface FilterRules {
  ownChannels: string[];
  allowChannels: string[];
  ownVideos: VideoSeed[];
  blockTitlePatterns: string[];
  blockChannelPatterns?: string[];
  blockIfChannelNotAllowed: boolean;
  exceptions?: FilterException[];
}

export interface ContentCandidate {
  surface: ContentSurface;
  channelId?: string;
  channelName?: string;
  title?: string;
  query?: string;
  url?: string;
  channelUrl?: string;
  videoId?: string;
}

export interface EvaluationResult {
  action: "allow" | "hide";
  reasons: string[];
}

const MATCH_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "official",
  "video",
  "audio",
  "music",
  "trailer",
  "teaser",
  "cover",
  "lyrics",
  "hd",
  "4k"
]);

const normalize = (value?: string): string => (value ?? "").trim().toLowerCase();

const normalizeForMatch = (value?: string): string => {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenizeForMatch = (value?: string): string[] => {
  return normalizeForMatch(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !MATCH_STOP_WORDS.has(token));
};

const includesPattern = (value: string, patterns: string[]): string | undefined => {
  return patterns.find((pattern) => value.includes(normalize(pattern)));
};

const getTokenOverlapScore = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token));

  return shared.length / Math.max(left.length, right.length);
};

const isStrongVideoMatch = (candidate: ContentCandidate, ownVideo: VideoSeed): boolean => {
  const title = normalize(candidate.title);
  const query = normalize(candidate.query);
  const titleForMatch = normalizeForMatch(candidate.title);
  const queryForMatch = normalizeForMatch(candidate.query);
  const normalizedOwnTitle = normalize(ownVideo.title);
  const ownTitleForMatch = normalizeForMatch(ownVideo.title);
  const aliases = (ownVideo.aliases ?? []).map((alias) => normalize(alias));
  const aliasMatches = (ownVideo.aliases ?? []).map((alias) => normalizeForMatch(alias));

  if (ownVideo.videoId && candidate.videoId && ownVideo.videoId === candidate.videoId) {
    return true;
  }

  if (normalizedOwnTitle && (title.includes(normalizedOwnTitle) || query.includes(normalizedOwnTitle))) {
    return true;
  }

  if (aliases.some((alias) => title.includes(alias) || query.includes(alias))) {
    return true;
  }

  if (
    ownTitleForMatch &&
    (titleForMatch === ownTitleForMatch ||
      queryForMatch === ownTitleForMatch ||
      aliasMatches.includes(titleForMatch) ||
      aliasMatches.includes(queryForMatch))
  ) {
    return true;
  }

  const candidateTokens = tokenizeForMatch(candidate.title);
  const ownVideoTokens = tokenizeForMatch(ownVideo.title);
  const overlapScore = getTokenOverlapScore(candidateTokens, ownVideoTokens);

  if (candidateTokens.length >= 3 && ownVideoTokens.length >= 3 && overlapScore >= 0.6) {
    return true;
  }

  const queryTokens = tokenizeForMatch(candidate.query);
  const queryOverlapScore = getTokenOverlapScore(queryTokens, ownVideoTokens);

  return queryTokens.length >= 3 && ownVideoTokens.length >= 3 && queryOverlapScore >= 0.8;
};

const findMatchingOwnVideo = (
  candidate: ContentCandidate,
  ownVideos: VideoSeed[]
): VideoSeed | undefined => {
  return ownVideos.find((video) => isStrongVideoMatch(candidate, video));
};

const matchesException = (candidate: ContentCandidate, exception: FilterException): boolean => {
  if (exception.queryContains) {
    const query = normalize(candidate.query);
    if (!query.includes(normalize(exception.queryContains))) {
      return false;
    }
  }

  if (exception.titleContains) {
    const title = normalize(candidate.title);
    if (!title.includes(normalize(exception.titleContains))) {
      return false;
    }
  }

  if (exception.allowOnlyChannels?.length) {
    return exception.allowOnlyChannels.includes(candidate.channelId ?? "");
  }

  return true;
};

export const defaultRules: FilterRules = {
  ownChannels: [],
  allowChannels: [],
  ownVideos: [],
  blockTitlePatterns: ["cover", "lyrics", "remix", "fan made"],
  blockChannelPatterns: ["nightcore", "tribute", "karaoke"],
  blockIfChannelNotAllowed: false,
  exceptions: []
};

export const normalizeText = normalize;

export const evaluateCandidate = (
  candidate: ContentCandidate,
  rules: FilterRules
): EvaluationResult => {
  const reasons: string[] = [];
  const channelId = candidate.channelId ?? "";
  const normalizedTitle = normalize(candidate.title);
  const normalizedChannel = normalize(candidate.channelName);
  const ownChannels = new Set([...(rules.ownChannels ?? []), ...(rules.allowChannels ?? [])]);

  const matchedException = (rules.exceptions ?? []).find((exception) =>
    matchesException(candidate, exception)
  );

  if (ownChannels.has(channelId)) {
    return {
      action: "allow",
      reasons: ["own or allowed channel"]
    };
  }

  if (matchedException && matchedException.allowOnlyChannels?.includes(channelId)) {
    return {
      action: "allow",
      reasons: ["matched exception allowlist"]
    };
  }

  if (matchedException?.allowOwnChannels && ownChannels.has(channelId)) {
    return {
      action: "allow",
      reasons: ["matched own-channel exception"]
    };
  }

  if (rules.allowChannels.includes(channelId)) {
    return {
      action: "allow",
      reasons: ["channel allowlisted"]
    };
  }

  const matchedOwnVideo = findMatchingOwnVideo(candidate, rules.ownVideos ?? []);
  if (matchedOwnVideo) {
    if (ownChannels.has(channelId)) {
      return {
        action: "allow",
        reasons: [`matched own video "${matchedOwnVideo.title}"`]
      };
    }

    reasons.push(`matched own video "${matchedOwnVideo.title}"`);
  }

  if (rules.blockIfChannelNotAllowed && channelId) {
    reasons.push("channel not allowlisted");
  }

  const titlePattern = includesPattern(normalizedTitle, rules.blockTitlePatterns);
  if (titlePattern) {
    reasons.push(`title matched "${titlePattern}"`);
  }

  const channelPattern = includesPattern(normalizedChannel, rules.blockChannelPatterns ?? []);
  if (channelPattern) {
    reasons.push(`channel matched "${channelPattern}"`);
  }

  return {
    action: reasons.length > 0 ? "hide" : "allow",
    reasons
  };
};
