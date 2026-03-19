import { parseYouTubeChannelId } from "../../../core/src/parsing";
import { defaultRules, type FilterRules } from "../../../core/src/index";

export const RULES_STORAGE_KEY = "rules";

export const mergeRules = (rules?: Partial<FilterRules>): FilterRules => ({
  ...defaultRules,
  ...(rules ?? {}),
  ownChannels: Array.isArray(rules?.ownChannels) ? rules.ownChannels : defaultRules.ownChannels,
  allowChannels: Array.isArray(rules?.allowChannels)
    ? rules.allowChannels
    : defaultRules.allowChannels,
  ownVideos: Array.isArray(rules?.ownVideos) ? rules.ownVideos : defaultRules.ownVideos,
  blockTitlePatterns: Array.isArray(rules?.blockTitlePatterns)
    ? rules.blockTitlePatterns
    : defaultRules.blockTitlePatterns,
  blockChannelPatterns: Array.isArray(rules?.blockChannelPatterns)
    ? rules.blockChannelPatterns
    : defaultRules.blockChannelPatterns,
  exceptions: Array.isArray(rules?.exceptions) ? rules.exceptions : defaultRules.exceptions
});

export const getStoredRules = async (): Promise<FilterRules> => {
  const stored = await chrome.storage.sync.get(RULES_STORAGE_KEY);
  return mergeRules(stored[RULES_STORAGE_KEY] ?? {});
};

export const normalizeChannelIdentifier = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return parseYouTubeChannelId(trimmed) ?? trimmed;
};

export const normalizeChannelIdentifiers = (values: string[]): string[] => {
  return values
    .map((value) => normalizeChannelIdentifier(value))
    .filter(Boolean)
    .filter((value, index, allValues) => allValues.indexOf(value) === index);
};

export const setStoredRules = async (rules: Partial<FilterRules>): Promise<void> => {
  await chrome.storage.sync.set({
    [RULES_STORAGE_KEY]: mergeRules(rules)
  });
};

export const ensureStoredRules = async (): Promise<void> => {
  const stored = await chrome.storage.sync.get(RULES_STORAGE_KEY);
  if (!stored[RULES_STORAGE_KEY]) {
    await setStoredRules(defaultRules);
  }
};
