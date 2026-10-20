export const PROGRESS_SCHEMA = 1;
const STORAGE_KEY = "music-101.progress";

export interface ProgressFile {
  schema: typeof PROGRESS_SCHEMA;
  level1Passed: boolean;
}

export function emptyProgress(): ProgressFile {
  return { schema: PROGRESS_SCHEMA, level1Passed: false };
}

/** 读不出、版本更高、或形状不对时返回空进度，不把异常抛到界面。 */
export function parseProgress(raw: string | null): ProgressFile {
  if (raw === null || raw.trim() === "") return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyProgress();
    const record = parsed as { schema?: unknown; level1Passed?: unknown };
    if (record.schema !== PROGRESS_SCHEMA) return emptyProgress();
    return {
      schema: PROGRESS_SCHEMA,
      level1Passed: record.level1Passed === true,
    };
  } catch {
    return emptyProgress();
  }
}

export function serializeProgress(progress: ProgressFile): string {
  return JSON.stringify({ schema: PROGRESS_SCHEMA, level1Passed: progress.level1Passed });
}

export function loadProgress(storage: Pick<Storage, "getItem"> | null): ProgressFile {
  if (storage === null) return emptyProgress();
  return parseProgress(storage.getItem(STORAGE_KEY));
}

export function saveProgress(storage: Pick<Storage, "setItem">, progress: ProgressFile): void {
  storage.setItem(STORAGE_KEY, serializeProgress(progress));
}

export { STORAGE_KEY };
