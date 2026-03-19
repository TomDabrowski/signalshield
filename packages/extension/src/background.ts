import { ensureStoredRules } from "./lib/rules";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureStoredRules();
});
