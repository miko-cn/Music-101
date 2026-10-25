import {
  ABILITIES,
  FLOW_LESSONS,
  MAX_LEVEL_ID,
  abilityOf as contentAbilityOf,
  levelsForAbility,
  lessonById,
} from "../../content/index.ts";
import { MISTAKE_LABEL, MISTAKE_SUMMARY } from "../../content/mistakes.ts";
import { isStageLesson } from "../../content/types.ts";
import type { AbilityId, StageLesson } from "../../content/types.ts";
import type { Level1State } from "./level1.ts";
import { MISTAKE_KINDS, type MistakeKind } from "./mistakes.ts";
import type { Attempt, ProgressFile, Recipe, RecipePick } from "./progress.ts";
import type { StageState } from "./stage1.ts";

export type { AbilityId } from "../../content/types.ts";
export { ABILITIES };

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

export interface MistakeDrill {
  /** 去哪一关补。 */
  levelId: number;
  label: string;
  text: string;
}

/** 找到能补救某一类错误的关卡——关号最小的那个。 */
function findFix(kind: MistakeKind): { levelId: number; advice: string } | null {
  for (const lesson of FLOW_LESSONS) {
    for (const fix of lesson.fixes ?? []) {
      if (fix.kind === kind) return { levelId: lesson.id, advice: fix.advice };
    }
  }
  return null;
}

/**
 * 每一类错误该去哪一关补。
 *
 * 关号来自关卡自己的 fixes 声明——以后加一关能补救新的错误类型时，
 * 不用回到这里改数字。
 */
export const MISTAKE_DRILLS: Record<MistakeKind, MistakeDrill | null> = Object.fromEntries(
  MISTAKE_KINDS.map((kind) => {
    const fix = findFix(kind);
    if (!fix) return [kind, null];
    return [
      kind,
      {
        levelId: fix.levelId,
        label: MISTAKE_LABEL[kind],
        text: `${MISTAKE_SUMMARY[kind]}先重开第 ${fix.levelId} 关，${fix.advice}。`,
      },
    ];
  }),
) as Record<MistakeKind, MistakeDrill | null>;

export function abilityOf(levelId: number): AbilityId | null {
  return contentAbilityOf(levelId);
}

export function levelsFor(ability: AbilityId): number[] {
  return levelsForAbility(ability);
}

export function isMastered(progress: ProgressFile, levelId: number): boolean {
  return progress.passedLevels.includes(levelId) || (levelId === 1 && progress.level1Passed);
}

/**
 * 手做选错时算哪一类错误。
 *
 * 哪一题选错算什么错，由关卡自己声明（mistakeKinds），
 * 这里只做查表，不再手写「关号:题号」的对照表。
 */
export function classifyHand(levelId: number, hand: number | null, handCorrect: number): MistakeKind[] {
  if (hand === null || hand === handCorrect) return [];
  const lesson = lessonById(levelId);
  if (!lesson || !isStageLesson(lesson)) return [];
  const kind = lesson.mistakeKinds?.[hand];
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
    if (!drill) continue;
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
  for (let levelId = 1; levelId <= MAX_LEVEL_ID; levelId += 1) {
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
    title: lessonById(1)?.title ?? "音高与键盘",
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
