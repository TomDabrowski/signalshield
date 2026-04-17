import type { FilterRules } from "../../../core/src/index";
import { mergeRules } from "./rules";

export const AGGRESSIVE_TITLE_PATTERNS = [
  "cover",
  "lyrics",
  "lyric video",
  "fan made",
  "fanmade",
  "remix",
  "rework",
  "edit",
  "epic version",
  "epic cover",
  "orchestral version",
  "orchestral cover",
  "cinematic version",
  "cinematic cover",
  "trailer version",
  "trailer cover",
  "slowed",
  "reverb",
  "slowed reverb",
  "8d audio",
  "instrumental",
  "full version"
];

export const AGGRESSIVE_CHANNEL_PATTERNS = [
  "nightcore",
  "tribute",
  "karaoke",
  "lyrics",
  "cover",
  "remix",
  "orchestra",
  "instrumental"
];

const dedupe = (values: string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) === index);

export const applyAggressivePreset = (rules: FilterRules): FilterRules => {
  const merged = mergeRules(rules);

  return {
    ...merged,
    blockTitlePatterns: dedupe([...merged.blockTitlePatterns, ...AGGRESSIVE_TITLE_PATTERNS]),
    blockChannelPatterns: dedupe([
      ...(merged.blockChannelPatterns ?? []),
      ...AGGRESSIVE_CHANNEL_PATTERNS
    ])
  };
};
