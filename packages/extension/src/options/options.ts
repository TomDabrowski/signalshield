import {
  defaultRules,
  type FilterException,
  type FilterRules,
  type VideoSeed
} from "../../../core/src/index";
import {
  getStoredRules,
  mergeRules,
  normalizeChannelIdentifiers,
  setStoredRules
} from "../lib/rules";
import { applyAggressivePreset } from "../lib/presets";
import { dedupeVideoSeeds, importPublicChannelVideos } from "../lib/youtube-public";

const publicChannelImportField = document.querySelector<HTMLInputElement>("#publicChannelImport");
const publicImportStatusField = document.querySelector<HTMLElement>("#publicImportStatus");
const ownChannelsField = document.querySelector<HTMLTextAreaElement>("#ownChannels");
const allowChannelsField = document.querySelector<HTMLTextAreaElement>("#allowChannels");
const ownVideosField = document.querySelector<HTMLTextAreaElement>("#ownVideos");
const blockChannelPatternsField =
  document.querySelector<HTMLTextAreaElement>("#blockChannelPatterns");
const blockTitlePatternsField =
  document.querySelector<HTMLTextAreaElement>("#blockTitlePatterns");
const exceptionsField = document.querySelector<HTMLTextAreaElement>("#exceptions");
const exceptionNameField = document.querySelector<HTMLInputElement>("#exceptionName");
const exceptionQueryField = document.querySelector<HTMLInputElement>("#exceptionQuery");
const exceptionTitleField = document.querySelector<HTMLInputElement>("#exceptionTitle");
const exceptionAllowOwnChannelsField = document.querySelector<HTMLInputElement>(
  "#exceptionAllowOwnChannels"
);
const exceptionAllowChannelsField = document.querySelector<HTMLTextAreaElement>(
  "#exceptionAllowChannels"
);
const exceptionList = document.querySelector<HTMLElement>("#exceptionList");
const blockIfChannelNotAllowedField = document.querySelector<HTMLInputElement>(
  "#blockIfChannelNotAllowed"
);
const statusField = document.querySelector<HTMLElement>("#status");
const form = document.querySelector<HTMLFormElement>("#rules-form");
const applyAggressivePresetButton =
  document.querySelector<HTMLButtonElement>("#applyAggressivePreset");
const downloadRulesBackupButton =
  document.querySelector<HTMLButtonElement>("#downloadRulesBackup");
const exportButton = document.querySelector<HTMLButtonElement>("#exportRules");
const addExceptionButton = document.querySelector<HTMLButtonElement>("#addException");
const importPublicChannelButton = document.querySelector<HTMLButtonElement>("#importPublicChannel");
const importDefaultsButton = document.querySelector<HTMLButtonElement>("#importDefaults");
const importRulesFileField = document.querySelector<HTMLInputElement>("#importRulesFile");

let currentExceptions: FilterException[] = [];
let currentOwnVideos: VideoSeed[] = [];

const toLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const setStatus = (value: string): void => {
  if (statusField) {
    statusField.textContent = value;
  }
};

const setPublicImportStatus = (
  value: string,
  state: "idle" | "loading" | "success" | "error" = "idle"
): void => {
  if (!publicImportStatusField) {
    return;
  }

  publicImportStatusField.textContent = value;
  publicImportStatusField.dataset.state = state;
};

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const parseOwnVideos = (value: string): VideoSeed[] => {
  if (!value.trim()) {
    return [];
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("My videos JSON must be an array");
  }

  return parsed
    .map((entry) => ({
      title: typeof entry?.title === "string" ? entry.title.trim() : "",
      aliases: Array.isArray(entry?.aliases)
        ? entry.aliases.map((alias: unknown) => String(alias).trim()).filter(Boolean)
        : [],
      videoId: typeof entry?.videoId === "string" ? entry.videoId.trim() : undefined
    }))
    .filter((entry) => entry.title);
};

const parseExceptions = (value: string): FilterException[] => {
  if (!value.trim()) {
    return [];
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("Exceptions JSON must be an array");
  }

  return parsed.map((entry) => ({
    name: typeof entry?.name === "string" ? entry.name.trim() : undefined,
    queryContains:
      typeof entry?.queryContains === "string" ? entry.queryContains.trim() : undefined,
    titleContains:
      typeof entry?.titleContains === "string" ? entry.titleContains.trim() : undefined,
    allowOwnChannels: Boolean(entry?.allowOwnChannels),
    allowOnlyChannels: Array.isArray(entry?.allowOnlyChannels)
      ? normalizeChannelIdentifiers(
          entry.allowOnlyChannels.map((channel: unknown) => String(channel).trim()).filter(Boolean)
        )
      : []
  }));
};

const clearExceptionBuilder = (): void => {
  if (exceptionNameField) {
    exceptionNameField.value = "";
  }

  if (exceptionQueryField) {
    exceptionQueryField.value = "";
  }

  if (exceptionTitleField) {
    exceptionTitleField.value = "";
  }

  if (exceptionAllowOwnChannelsField) {
    exceptionAllowOwnChannelsField.checked = false;
  }

  if (exceptionAllowChannelsField) {
    exceptionAllowChannelsField.value = "";
  }
};

const syncExceptionsField = (): void => {
  if (exceptionsField) {
    exceptionsField.value = stringifyJson(currentExceptions);
  }
};

const syncOwnVideosField = (): void => {
  if (ownVideosField) {
    ownVideosField.value = stringifyJson(currentOwnVideos);
  }
};

const renderExceptionList = (): void => {
  if (!exceptionList) {
    return;
  }

  if (currentExceptions.length === 0) {
    exceptionList.innerHTML =
      '<p class="empty-state">No guided exceptions yet. Add one for your own uploads or specific searches.</p>';
    return;
  }

  exceptionList.innerHTML = currentExceptions
    .map((exception, index) => {
      const channels = (exception.allowOnlyChannels ?? []).join(", ") || "None";
      const name = exception.name?.trim() || `Exception ${index + 1}`;
      const query = exception.queryContains?.trim() || "Any query";
      const title = exception.titleContains?.trim() || "Any title";
      const allowOwnChannels = exception.allowOwnChannels ? "Yes" : "No";

      return `
        <article class="exception-card">
          <div class="exception-card__copy">
            <strong>${name}</strong>
            <p>Query: ${query}</p>
            <p>Title: ${title}</p>
            <p>Allow my channels: ${allowOwnChannels}</p>
            <p>Allowed channels: ${channels}</p>
          </div>
          <button type="button" class="secondary exception-remove" data-index="${index}">
            Remove
          </button>
        </article>
      `;
    })
    .join("");
};

const renderRules = (rules: FilterRules): void => {
  if (ownChannelsField) {
    ownChannelsField.value = rules.ownChannels.join("\n");
  }

  if (allowChannelsField) {
    allowChannelsField.value = rules.allowChannels.join("\n");
  }

  currentOwnVideos = rules.ownVideos ?? [];
  syncOwnVideosField();

  if (blockChannelPatternsField) {
    blockChannelPatternsField.value = (rules.blockChannelPatterns ?? []).join("\n");
  }

  if (blockTitlePatternsField) {
    blockTitlePatternsField.value = rules.blockTitlePatterns.join("\n");
  }

  currentExceptions = rules.exceptions ?? [];
  syncExceptionsField();
  renderExceptionList();

  if (blockIfChannelNotAllowedField) {
    blockIfChannelNotAllowedField.checked = rules.blockIfChannelNotAllowed;
  }
};

const collectRules = (): FilterRules => ({
  ...mergeRules(),
  ownChannels: normalizeChannelIdentifiers(toLines(ownChannelsField?.value ?? "")),
  allowChannels: normalizeChannelIdentifiers(toLines(allowChannelsField?.value ?? "")),
  ownVideos: parseOwnVideos(ownVideosField?.value ?? ""),
  blockChannelPatterns: toLines(blockChannelPatternsField?.value ?? ""),
  blockTitlePatterns: toLines(blockTitlePatternsField?.value ?? ""),
  blockIfChannelNotAllowed: Boolean(blockIfChannelNotAllowedField?.checked),
  exceptions: parseExceptions(exceptionsField?.value ?? "")
});

const saveRules = async (): Promise<void> => {
  const rules = collectRules();
  await setStoredRules(rules);
  currentOwnVideos = rules.ownVideos ?? [];
  currentExceptions = rules.exceptions ?? [];
  syncOwnVideosField();
  syncExceptionsField();
  renderExceptionList();
};

const downloadTextFile = (filename: string, contents: string): void => {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const load = async (): Promise<void> => {
  const rules = await getStoredRules();
  renderRules(rules);
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await saveRules();
    setStatus("Saved");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not save rules");
  }
});

exportButton?.addEventListener("click", async () => {
  const rules = await getStoredRules();

  try {
    await navigator.clipboard.writeText(stringifyJson(rules));
    setStatus("Rules copied as JSON");
  } catch {
    setStatus("Copy failed");
  }
});

importDefaultsButton?.addEventListener("click", async () => {
  renderRules(defaultRules);
  setStatus("Default rules loaded into the form");
});

applyAggressivePresetButton?.addEventListener("click", async () => {
  const currentRules = collectRules();
  const presetRules = applyAggressivePreset(currentRules);
  renderRules(presetRules);
  setStatus("Aggressive preset applied to the form");
});

downloadRulesBackupButton?.addEventListener("click", async () => {
  const rules = collectRules();
  const date = new Date().toISOString().slice(0, 10);
  downloadTextFile(`signalshield-rules-${date}.json`, stringifyJson(rules));
  setStatus("Local rules backup downloaded");
});

addExceptionButton?.addEventListener("click", () => {
  const exception: FilterException = {
    name: exceptionNameField?.value.trim() || undefined,
    queryContains: exceptionQueryField?.value.trim() || undefined,
    titleContains: exceptionTitleField?.value.trim() || undefined,
    allowOwnChannels: Boolean(exceptionAllowOwnChannelsField?.checked),
    allowOnlyChannels: normalizeChannelIdentifiers(toLines(exceptionAllowChannelsField?.value ?? ""))
  };

  if (
    !exception.queryContains &&
    !exception.titleContains &&
    !exception.allowOwnChannels &&
    (exception.allowOnlyChannels?.length ?? 0) === 0
  ) {
    setStatus("Add at least a query, title, own-channel flag, or one allowed channel");
    return;
  }

  currentExceptions = [...currentExceptions, exception];
  syncExceptionsField();
  renderExceptionList();
  clearExceptionBuilder();
  setStatus("Exception added to the form");
});

exceptionList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>(".exception-remove");
  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  if (Number.isNaN(index)) {
    return;
  }

  currentExceptions = currentExceptions.filter((_, currentIndex) => currentIndex !== index);
  syncExceptionsField();
  renderExceptionList();
  setStatus("Exception removed from the form");
});

exceptionsField?.addEventListener("input", () => {
  try {
    currentExceptions = parseExceptions(exceptionsField.value);
    renderExceptionList();
  } catch {
    exceptionList?.classList.add("exception-list--invalid");
    return;
  }

  exceptionList?.classList.remove("exception-list--invalid");
});

ownVideosField?.addEventListener("input", () => {
  try {
    currentOwnVideos = parseOwnVideos(ownVideosField.value);
  } catch {
    setStatus("My videos JSON is invalid");
    return;
  }

  setStatus("My videos JSON updated in the form");
});

importRulesFileField?.addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<FilterRules>;
    const rules = mergeRules({
      ...parsed,
      ownChannels: Array.isArray(parsed.ownChannels)
        ? normalizeChannelIdentifiers(
            parsed.ownChannels.map((value) => String(value).trim()).filter(Boolean)
          )
        : defaultRules.ownChannels,
      allowChannels: Array.isArray(parsed.allowChannels)
        ? normalizeChannelIdentifiers(
            parsed.allowChannels.map((value) => String(value).trim()).filter(Boolean)
          )
        : defaultRules.allowChannels,
      ownVideos: parseOwnVideos(JSON.stringify(parsed.ownVideos ?? [])),
      blockChannelPatterns: Array.isArray(parsed.blockChannelPatterns)
        ? parsed.blockChannelPatterns.map((value) => String(value).trim()).filter(Boolean)
        : defaultRules.blockChannelPatterns,
      blockTitlePatterns: Array.isArray(parsed.blockTitlePatterns)
        ? parsed.blockTitlePatterns.map((value) => String(value).trim()).filter(Boolean)
        : defaultRules.blockTitlePatterns,
      exceptions: parseExceptions(JSON.stringify(parsed.exceptions ?? []))
    });

    renderRules(rules);
    setStatus("Rules imported into the form");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Import failed");
  } finally {
    importRulesFileField.value = "";
  }
});

importPublicChannelButton?.addEventListener("click", async () => {
  const channelInput = publicChannelImportField?.value ?? "";
  if (!channelInput.trim()) {
    setPublicImportStatus("Enter a channel handle or URL first", "error");
    setStatus("Enter a channel handle or URL first");
    return;
  }

  if (importPublicChannelButton) {
    importPublicChannelButton.disabled = true;
  }

  try {
    setPublicImportStatus("Resolving public channel...", "loading");
    const result = await importPublicChannelVideos(channelInput);
    setPublicImportStatus(`Loaded ${result.videos.length} public videos`, "success");
    const existingOwnChannels = normalizeChannelIdentifiers(toLines(ownChannelsField?.value ?? ""));
    const existingOwnVideos = parseOwnVideos(ownVideosField?.value ?? "");

    const mergedOwnChannels = normalizeChannelIdentifiers([
      ...existingOwnChannels,
      result.channelId
    ]);
    const mergedOwnVideos = dedupeVideoSeeds([...existingOwnVideos, ...result.videos]);

    if (ownChannelsField) {
      ownChannelsField.value = mergedOwnChannels.join("\n");
    }

    currentOwnVideos = mergedOwnVideos;
    syncOwnVideosField();

    setStatus(`Imported ${result.videos.length} public videos from ${result.channelId}`);
  } catch (error) {
    setPublicImportStatus(
      error instanceof Error ? error.message : "Public channel import failed",
      "error"
    );
    setStatus(error instanceof Error ? error.message : "Public channel import failed");
  } finally {
    if (importPublicChannelButton) {
      importPublicChannelButton.disabled = false;
    }
  }
});

void load();
