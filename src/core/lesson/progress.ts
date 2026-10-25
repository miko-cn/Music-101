export const PROGRESS_SCHEMA = 3;
const STORAGE_KEY = "music-101.progress";
const LEVEL_MIN = 1;
const LEVEL_MAX = 27;
/** 活动流最多留多少条：够半年热力图（每天一条也够 800 天）。 */
const ACTIVITY_MAX = 800;

export const MISTAKE_KINDS = ["same-progression", "chorus-flat", "low-end-clash"] as const;
export type MistakeKind = (typeof MISTAKE_KINDS)[number];

export interface Attempt {
  visitId: string;
  levelId: number;
  passed: boolean;
  easy: boolean;
  stuck: boolean;
  mistakes: MistakeKind[];
}

export interface RecipePick {
  bpm: number | null;
  key: number | null;
  structure: number | null;
}

export interface Recipe {
  id: string;
  levelId: number;
  title: string;
  summary: string;
  hand: number | null;
  drums: boolean[][] | null;
  referencePick: RecipePick | null;
  pitch: number | null;
  steps: boolean[] | null;
}

/**
 * 一次学习活动：某个时刻进入了某一关。
 *
 * 跟 `Attempt` 分开存是故意的：
 * - `Attempt` 记的是「一次尝试的结果」，难度自适应（连续轻松 / 连续卡住）依赖它的顺序，
 *   混进「只是打开了一下」的记录会把那个序列搞脏。
 * - 活动流只记「来过」，时间戳精确到秒，用来画每日学习的热力图。
 */
export interface ActivityEntry {
  /** 这次访问的 id：同一次访问只记一条，反复切步骤不会重复计。 */
  visitId: string;
  levelId: number;
  /** 本地时间戳（epoch 毫秒）。 */
  at: number;
}

export interface ProgressFile {
  schema: typeof PROGRESS_SCHEMA;
  level1Passed: boolean;
  passedLevels: number[];
  attempts: Attempt[];
  recipes: Recipe[];
  /** 学习活动流，按时间顺序。 */
  activity: ActivityEntry[];
}

export type ProgressUpdate = (current: ProgressFile) => ProgressFile;

export function emptyProgress(): ProgressFile {
  return {
    schema: PROGRESS_SCHEMA,
    level1Passed: false,
    passedLevels: [],
    attempts: [],
    recipes: [],
    activity: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLevel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= LEVEL_MIN && value <= LEVEL_MAX;
}

function isKind(value: unknown): value is MistakeKind {
  return typeof value === "string" && (MISTAKE_KINDS as readonly string[]).includes(value);
}

function uniqueKinds(value: unknown): MistakeKind[] {
  if (!Array.isArray(value)) return [];
  const found: MistakeKind[] = [];
  for (const item of value) {
    if (isKind(item) && !found.includes(item)) found.push(item);
  }
  return found;
}

function parseAttempt(value: unknown): Attempt | null {
  if (!isRecord(value)) return null;
  if (typeof value.visitId !== "string" || value.visitId.trim() === "" || value.visitId.length > 80) return null;
  if (!isLevel(value.levelId)) return null;
  const passed = value.passed === true;
  const easy = value.easy === true && passed && value.stuck !== true;
  const stuck = value.stuck === true && !easy;
  const mistakes = easy ? [] : uniqueKinds(value.mistakes);
  return { visitId: value.visitId, levelId: value.levelId, passed, easy, stuck, mistakes };
}

function parseGrid(value: unknown): boolean[][] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  const rows: boolean[][] = [];
  for (const row of value) {
    if (!Array.isArray(row)) return null;
    const cells = row.slice(0, 16).map((cell) => cell === true);
    while (cells.length < 16) cells.push(false);
    rows.push(cells);
    if (rows.length > 8) break;
  }
  return rows;
}

function parseIndex(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 12) return value;
  return null;
}

function parsePick(value: unknown): RecipePick | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;
  if (value.bpm !== null && parseIndex(value.bpm) === null) return null;
  if (value.key !== null && parseIndex(value.key) === null) return null;
  if (value.structure !== null && parseIndex(value.structure) === null) return null;
  return { bpm: parseIndex(value.bpm), key: parseIndex(value.key), structure: parseIndex(value.structure) };
}

function parseSteps(value: unknown): boolean[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  const cells = value.slice(0, 64).map((cell) => cell === true);
  if (cells.length < 16) return null;
  return cells;
}

function choiceIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 12) return value;
  return null;
}

function parsePitch(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 127) return value;
  return null;
}

export function parseRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || value.id.trim() === "" || value.id.length > 160) return null;
  if (!isLevel(value.levelId)) return null;
  if (typeof value.title !== "string" || typeof value.summary !== "string") return null;
  const hand = value.hand === null || value.hand === undefined ? null : choiceIndex(value.hand);
  if (value.hand !== null && value.hand !== undefined && hand === null) return null;
  const drums = parseGrid(value.drums === undefined ? null : value.drums);
  if (value.drums !== null && value.drums !== undefined && drums === null) return null;
  const referencePick = parsePick(value.referencePick === undefined ? null : value.referencePick);
  if (value.referencePick !== null && value.referencePick !== undefined && referencePick === null) return null;
  const steps = parseSteps(value.steps === undefined ? null : value.steps);
  if (value.steps !== null && value.steps !== undefined && steps === null) return null;
  const pitch = value.pitch === undefined ? null : parsePitch(value.pitch);
  if (value.pitch !== null && value.pitch !== undefined && pitch === null) return null;
  return {
    id: value.id,
    levelId: value.levelId,
    title: value.title.slice(0, 80),
    summary: value.summary.slice(0, 240),
    hand: typeof hand === "number" ? hand : null,
    drums,
    referencePick,
    pitch,
    steps,
  };
}

function normalize(progress: ProgressFile): ProgressFile {
  const passed = new Set(progress.passedLevels.filter(isLevel));
  if (progress.level1Passed) passed.add(1);
  const passedLevels = [...passed].sort((left, right) => left - right);
  return {
    schema: PROGRESS_SCHEMA,
    level1Passed: progress.level1Passed || passedLevels.includes(1),
    passedLevels,
    attempts: progress.attempts.slice(-48),
    recipes: progress.recipes.slice(-24),
    activity: progress.activity.slice(-ACTIVITY_MAX),
  };
}

function parseActivity(value: unknown): ActivityEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.visitId !== "string" || value.visitId.trim() === "" || value.visitId.length > 80) return null;
  if (!isLevel(value.levelId)) return null;
  if (typeof value.at !== "number" || !Number.isFinite(value.at) || value.at <= 0) return null;
  return { visitId: value.visitId, levelId: value.levelId, at: value.at };
}

function fromSchema1(record: Record<string, unknown>): ProgressFile {
  const level1Passed = record.level1Passed === true;
  return normalize({
    ...emptyProgress(),
    level1Passed,
    passedLevels: level1Passed ? [1] : [],
  });
}

function fromSchema2(record: Record<string, unknown>): ProgressFile {
  const passedLevels = Array.isArray(record.passedLevels) ? record.passedLevels.filter(isLevel) : [];
  const attempts = Array.isArray(record.attempts)
    ? record.attempts.flatMap((item) => {
        const parsed = parseAttempt(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const recipes = Array.isArray(record.recipes)
    ? record.recipes.flatMap((item) => {
        const parsed = parseRecipe(item);
        return parsed ? [parsed] : [];
      })
    : [];
  // schema 2 没有活动流：老记录补不了时间戳，不能编，热力图从启用那天开始记。
  return normalize({
    schema: PROGRESS_SCHEMA,
    level1Passed: record.level1Passed === true || passedLevels.includes(1),
    passedLevels,
    attempts,
    recipes,
    activity: [],
  });
}

function fromSchema3(record: Record<string, unknown>): ProgressFile {
  const passedLevels = Array.isArray(record.passedLevels) ? record.passedLevels.filter(isLevel) : [];
  const attempts = Array.isArray(record.attempts)
    ? record.attempts.flatMap((item) => {
        const parsed = parseAttempt(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const recipes = Array.isArray(record.recipes)
    ? record.recipes.flatMap((item) => {
        const parsed = parseRecipe(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const activity = Array.isArray(record.activity)
    ? record.activity.flatMap((item) => {
        const parsed = parseActivity(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return normalize({
    schema: PROGRESS_SCHEMA,
    level1Passed: record.level1Passed === true || passedLevels.includes(1),
    passedLevels,
    attempts,
    recipes,
    activity,
  });
}

/** 读不出、版本更高、或形状不对时返回空进度，不把异常抛到界面。schema 1、2 会迁进来。 */
export function parseProgress(raw: string | null): ProgressFile {
  if (raw === null || raw.trim() === "") return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyProgress();
    if (parsed.schema === 1) return fromSchema1(parsed);
    if (parsed.schema === 2) return fromSchema2(parsed);
    if (parsed.schema === PROGRESS_SCHEMA) return fromSchema3(parsed);
    return emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function serializeProgress(progress: ProgressFile): string {
  return JSON.stringify(normalize(progress));
}

export function loadProgress(storage: Pick<Storage, "getItem"> | null): ProgressFile {
  if (storage === null) return emptyProgress();
  return parseProgress(storage.getItem(STORAGE_KEY));
}

export function saveProgress(storage: Pick<Storage, "setItem">, progress: ProgressFile): void {
  storage.setItem(STORAGE_KEY, serializeProgress(progress));
}

export function observeAttempt(progress: ProgressFile, attempt: Attempt): ProgressFile {
  const parsed = parseAttempt(attempt);
  if (!parsed) return progress;
  const attempts = progress.attempts.filter((item) => item.visitId !== parsed.visitId);
  attempts.push(parsed);
  const passedLevels = new Set(progress.passedLevels);
  if (parsed.passed) passedLevels.add(parsed.levelId);
  return normalize({
    ...progress,
    level1Passed: progress.level1Passed || (parsed.levelId === 1 && parsed.passed),
    passedLevels: [...passedLevels],
    attempts,
  });
}

/**
 * 记一次「进入关卡」。
 *
 * 同一次访问只留一条（用 visitId 去重），所以在关卡里反复切步骤不会把当天的
 * 活跃度刷高。热力图画的就是这个流。
 */
export function recordVisit(
  progress: ProgressFile,
  visit: { visitId: string; levelId: number; at?: number },
): ProgressFile {
  if (typeof visit.visitId !== "string" || visit.visitId.trim() === "") return progress;
  if (!isLevel(visit.levelId)) return progress;
  const at = typeof visit.at === "number" && Number.isFinite(visit.at) ? visit.at : Date.now();
  if (at <= 0) return progress;
  const activity = progress.activity.filter((item) => item.visitId !== visit.visitId);
  activity.push({ visitId: visit.visitId, levelId: visit.levelId, at });
  return normalize({ ...progress, activity });
}

export function saveRecipe(progress: ProgressFile, recipe: Recipe): ProgressFile {
  const parsed = parseRecipe(recipe);
  if (!parsed) return progress;
  const recipes = progress.recipes.filter((item) => item.id !== parsed.id);
  recipes.push(parsed);
  return normalize({ ...progress, recipes });
}

export function deleteRecipe(progress: ProgressFile, id: string): ProgressFile {
  return normalize({ ...progress, recipes: progress.recipes.filter((item) => item.id !== id) });
}

export { STORAGE_KEY };
