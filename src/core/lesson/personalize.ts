import type { StageLesson } from "../../content/stage1.ts";
import type { Level1State } from "./level1.ts";
import {
  MISTAKE_KINDS,
  type Attempt,
  type MistakeKind,
  type ProgressFile,
  type Recipe,
  type RecipePick,
} from "./progress.ts";
import type { StageState } from "./stage1.ts";

export type AbilityId = "harmony" | "rhythm" | "arrangement" | "structure";

export const ABILITIES: readonly { id: AbilityId; label: string }[] = [
  { id: "harmony", label: "和声" },
  { id: "rhythm", label: "节奏" },
  { id: "arrangement", label: "配器" },
  { id: "structure", label: "结构" },
];

const LEVEL_ABILITY: Record<number, AbilityId> = {
  1: "harmony",
  2: "harmony",
  3: "harmony",
  4: "harmony",
  5: "harmony",
  6: "harmony",
  7: "harmony",
  8: "harmony",
  9: "arrangement",
  10: "rhythm",
  11: "arrangement",
  12: "arrangement",
  13: "structure",
  14: "harmony",
  15: "harmony",
  16: "harmony",
  17: "harmony",
  18: "arrangement",
  19: "arrangement",
  20: "structure",
  21: "arrangement",
  22: "arrangement",
  23: "arrangement",
  24: "rhythm",
  25: "structure",
  26: "structure",
  27: "structure",
};

/** 选错时才记。第 7 关的正确答案就是 I–V–vi–IV，选对不算老用。 */
const HAND_MISTAKES: Record<string, MistakeKind> = {
  "8:1": "same-progression",
  "11:1": "low-end-clash",
  "13:1": "chorus-flat",
  "25:1": "chorus-flat",
  "26:1": "chorus-flat",
};

export const MISTAKE_DRILLS: Record<MistakeKind, { levelId: number; label: string; text: string }> = {
  "same-progression": {
    levelId: 8,
    label: "同一条进行",
    text: "同一条大调进行已经出现了两次以上。先重开第 8 关，把借用和弦用上。",
  },
  "chorus-flat": {
    levelId: 13,
    label: "副歌不抬层",
    text: "副歌有两次以上没有抬层。先重开第 13 关，看能量曲线。",
  },
  "low-end-clash": {
    levelId: 11,
    label: "808 抢 kick",
    text: "808 有两次以上压进 kick 的音区。先重开第 11 关，根音放在 MIDI 36。",
  },
};

export interface AbilityScore {
  id: AbilityId;
  label: string;
  passed: number;
  total: number;
  ratio: number;
}

export interface DrillHint {
  kind: MistakeKind;
  levelId: number;
  label: string;
  text: string;
  count: number;
}

export interface DifficultyAdvice {
  kind: "harder" | "review";
  reviewLevel: number | null;
  text: string;
}

export type LevelStatus = "mastered" | "retry" | "new";

export function abilityOf(levelId: number): AbilityId | null {
  return LEVEL_ABILITY[levelId] ?? null;
}

export function levelsFor(ability: AbilityId): number[] {
  return Object.entries(LEVEL_ABILITY)
    .filter((entry) => entry[1] === ability)
    .map((entry) => Number(entry[0]));
}

export function isMastered(progress: ProgressFile, levelId: number): boolean {
  return progress.passedLevels.includes(levelId) || (levelId === 1 && progress.level1Passed);
}

export function classifyHand(levelId: number, hand: number | null, handCorrect: number): MistakeKind[] {
  if (hand === null || hand === handCorrect) return [];
  const kind = HAND_MISTAKES[`${levelId}:${hand}`];
  return kind ? [kind] : [];
}

export function mistakeCounts(progress: ProgressFile): Record<MistakeKind, number> {
  const counts: Record<MistakeKind, number> = {
    "same-progression": 0,
    "chorus-flat": 0,
    "low-end-clash": 0,
  };
  for (const attempt of progress.attempts) {
    for (const kind of new Set(attempt.mistakes)) counts[kind] += 1;
  }
  return counts;
}

export function activeDrills(progress: ProgressFile, levelId: number): DrillHint[] {
  const counts = mistakeCounts(progress);
  const found: DrillHint[] = [];
  for (const kind of MISTAKE_KINDS) {
    const drill = MISTAKE_DRILLS[kind];
    const count = counts[kind];
    if (count < 2 || levelId <= drill.levelId) continue;
    found.push({ kind, levelId: drill.levelId, label: drill.label, text: drill.text, count });
  }
  return found;
}

export function levelStatus(progress: ProgressFile, levelId: number): LevelStatus {
  if (isMastered(progress, levelId)) return "mastered";
  if (progress.attempts.some((item) => item.levelId === levelId && item.stuck && !item.passed)) return "retry";
  return "new";
}

export function statusText(status: LevelStatus, levelId: number): string {
  if (status === "mastered") return `第 ${levelId} 关已经掌握，可以跳过，也可以再做一遍。`;
  if (status === "retry") return `第 ${levelId} 关上次没过。从这里重开就行，其他关卡不会被锁住。`;
  return "";
}

export function recommendationLists(progress: ProgressFile): { mastered: number[]; retry: number[] } {
  const mastered: number[] = [];
  const retry: number[] = [];
  for (let levelId = 1; levelId <= 27; levelId += 1) {
    const status = levelStatus(progress, levelId);
    if (status === "mastered") mastered.push(levelId);
    if (status === "retry") retry.push(levelId);
  }
  return { mastered, retry };
}

/** 进度不锁关。调用方可以拿它决定选项是否禁用，结果永远是开着。 */
export function levelLocked(_progress: ProgressFile, _levelId: number): boolean {
  return false;
}

export function abilityScores(progress: ProgressFile): AbilityScore[] {
  return ABILITIES.map((ability) => {
    const levels = levelsFor(ability.id);
    const passed = levels.filter((levelId) => isMastered(progress, levelId)).length;
    return {
      id: ability.id,
      label: ability.label,
      passed,
      total: levels.length,
      ratio: levels.length === 0 ? 0 : passed / levels.length,
    };
  });
}

export function difficultyAdvice(attempts: readonly Attempt[]): DifficultyAdvice | null {
  const last3 = attempts.slice(-3);
  if (last3.length === 3 && last3.every((item) => item.easy)) {
    return {
      kind: "harder",
      reviewLevel: null,
      text: "连续 3 次轻松过关。下一关可以跳过概念卡，直接做手做和导出。",
    };
  }
  const last2 = attempts.slice(-2);
  if (last2.length === 2 && last2.every((item) => item.stuck)) {
    const reviewLevel = Math.max(1, (last2[1]?.levelId ?? 1) - 1);
    return {
      kind: "review",
      reviewLevel,
      text: `连续 2 次卡住。先复习第 ${reviewLevel} 关，再继续。`,
    };
  }
  return null;
}

export function buildAttempt(input: {
  visitId: string;
  levelId: number;
  passed: boolean;
  earCorrect: number;
  earTotal: number;
  usedFix: boolean;
  mistakes: readonly MistakeKind[];
}): Attempt {
  const easy = input.passed && !input.usedFix && input.earTotal > 0 && input.earCorrect === input.earTotal;
  const stuck = !input.passed || input.usedFix;
  const mistakes = easy ? [] : [...new Set(input.mistakes)];
  return {
    visitId: input.visitId,
    levelId: input.levelId,
    passed: input.passed,
    easy,
    stuck,
    mistakes,
  };
}

function stepNumbers(row: readonly boolean[] | undefined): string {
  if (!row) return "空";
  const numbers = row.flatMap((on, index) => (on ? [index + 1] : []));
  return numbers.length === 0 ? "空" : numbers.join(",");
}

export function recipeFromStage(lesson: StageLesson, state: StageState): Recipe {
  const choice = state.hand === null ? undefined : lesson.handChoices[state.hand];
  const summary = lesson.drums
    ? lesson.drums.map((lane, index) => `${lane.label} ${stepNumbers(state.drums?.[index])}`).join("；")
    : lesson.reference
      ? referenceSummary(state.referencePick)
      : (choice?.label ?? "还没选");
  return {
    id: `${lesson.id}:${summary}`.slice(0, 160),
    levelId: lesson.id,
    title: lesson.title,
    summary,
    hand: state.hand,
    drums: state.drums ? state.drums.map((row) => row.slice(0, 16)) : null,
    referencePick: state.referencePick ? { ...state.referencePick } : null,
    pitch: null,
    steps: null,
  };
}

function referenceSummary(pick: RecipePick | undefined): string {
  if (!pick || pick.bpm === null || pick.key === null || pick.structure === null) return "参考候选还没选全";
  return `候选 BPM ${pick.bpm + 1} · 调 ${pick.key + 1} · 结构 ${pick.structure + 1}`;
}

export function recipeFromLevel1(state: Level1State): Recipe {
  const summary = `音高 ${state.pitch ?? "未选"} · 格子 ${stepNumbers(state.steps)}`;
  return {
    id: `1:${summary}`.slice(0, 160),
    levelId: 1,
    title: "音高与键盘",
    summary,
    hand: null,
    drums: null,
    referencePick: null,
    pitch: state.pitch,
    steps: state.steps.slice(0, 16),
  };
}

export function applyRecipeToStage(state: StageState, recipe: Recipe): StageState {
  if (recipe.levelId < 2) return state;
  return {
    ...state,
    hand: recipe.hand,
    drums: recipe.drums ? recipe.drums.map((row) => [...row]) : state.drums,
    referencePick: recipe.referencePick ? { ...recipe.referencePick } : state.referencePick,
  };
}

export function applyRecipeToLevel1(state: Level1State, recipe: Recipe): Level1State {
  if (recipe.levelId !== 1) return state;
  return {
    ...state,
    pitch: recipe.pitch,
    steps: recipe.steps ? [...recipe.steps] : state.steps,
  };
}
