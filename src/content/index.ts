/**
 * 课程的汇总入口。
 *
 * 全站关于「有哪些关、关号到几、哪些关属于哪个阶段、每个能力覆盖哪些关」
 * 的答案都从这里出，别的地方不再手写关号表。
 *
 * 加一关 = 加一个 level-NN.ts 文件 + 在下面的清单里加一行。
 */
import { lesson as level01 } from "./lessons/level-01.ts";
import { lesson as level02 } from "./lessons/level-02.ts";
import { lesson as level03 } from "./lessons/level-03.ts";
import { lesson as level04 } from "./lessons/level-04.ts";
import { lesson as level05 } from "./lessons/level-05.ts";
import { lesson as level06 } from "./lessons/level-06.ts";
import { lesson as level07 } from "./lessons/level-07.ts";
import { lesson as level08 } from "./lessons/level-08.ts";
import { lesson as level09 } from "./lessons/level-09.ts";
import { lesson as level10 } from "./lessons/level-10.ts";
import { lesson as level11 } from "./lessons/level-11.ts";
import { lesson as level12 } from "./lessons/level-12.ts";
import { lesson as level13 } from "./lessons/level-13.ts";
import { lesson as level14 } from "./lessons/level-14.ts";
import { lesson as level15 } from "./lessons/level-15.ts";
import { lesson as level16 } from "./lessons/level-16.ts";
import { lesson as level17 } from "./lessons/level-17.ts";
import { lesson as level18 } from "./lessons/level-18.ts";
import { lesson as level19 } from "./lessons/level-19.ts";
import { lesson as level20 } from "./lessons/level-20.ts";
import { lesson as level21 } from "./lessons/level-21.ts";
import { lesson as level22 } from "./lessons/level-22.ts";
import { lesson as level23 } from "./lessons/level-23.ts";
import { lesson as level24 } from "./lessons/level-24.ts";
import { lesson as level25 } from "./lessons/level-25.ts";
import { lesson as level26 } from "./lessons/level-26.ts";
import { lesson as level27 } from "./lessons/level-27.ts";
import { isStageLesson } from "./types.ts";
import type {
  AbilityId,
  LessonEntry,
  MemoryAnchor,
  StageId,
  StageLessonEntry,
} from "./types.ts";

/**
 * 全部关卡，按关号排序。
 *
 * import 的顺序也决定模块求值顺序——
 * 听辨题的正确项位置是按声明顺序轮转的，顺序变了轮转就变了。
 */
export const LESSONS: readonly LessonEntry[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level16,
  level17,
  level18,
  level19,
  level20,
  level21,
  level22,
  level23,
  level24,
  level25,
  level26,
  level27,
];

/** 走标准流程（概念卡 + 听辨 + 手做）的关卡。 */
export const FLOW_LESSONS: readonly StageLessonEntry[] = LESSONS.filter(isStageLesson);

/** 能力维度及其显示名。进度页的能力雷达、记忆点总表的筛选都用它。 */
export const ABILITIES: readonly { id: AbilityId; label: string }[] = [
  { id: "harmony", label: "和声" },
  { id: "rhythm", label: "节奏" },
  { id: "arrangement", label: "配器" },
  { id: "structure", label: "结构" },
];

/** 最高的关号。进度上限、关卡下拉、推荐列表都用它。 */
export const MAX_LEVEL_ID = LESSONS.reduce((max, lesson) => Math.max(max, lesson.id), 0);

/** 最低的关号。 */
export const MIN_LEVEL_ID = LESSONS.reduce(
  (min, lesson) => Math.min(min, lesson.id),
  MAX_LEVEL_ID,
);

/** 阶段的显示名。 */
export const STAGE_TITLES: Record<StageId, string> = {
  foundation: "阶段一 · 乐理地基",
  arrangement: "阶段二 · 编曲决策",
  style: "阶段三 · 风格套路",
};

export interface StageGroup {
  id: StageId;
  title: string;
  /** 这个阶段包含哪些关。 */
  levelIds: number[];
}

/**
 * 按阶段分组。
 *
 * 分组是从关卡自己的 stage 字段推出来的，不是手写的关号区间——
 * 以后把关 21 挪到别的阶段，这里自动跟着变。
 */
export const STAGES: readonly StageGroup[] = (() => {
  const order: StageId[] = [];
  const groups = new Map<StageId, number[]>();
  for (const lesson of LESSONS) {
    if (!groups.has(lesson.stage)) {
      groups.set(lesson.stage, []);
      order.push(lesson.stage);
    }
    groups.get(lesson.stage)!.push(lesson.id);
  }
  return order.map((id) => ({
    id,
    title: STAGE_TITLES[id],
    levelIds: groups.get(id)!,
  }));
})();

/** 按关号找一关。找不到返回 null。 */
export function lessonById(id: number): LessonEntry | null {
  return LESSONS.find((lesson) => lesson.id === id) ?? null;
}

/** 按关号找一关，找不到直接报错——避免悄悄降级成空数据。 */
export function requireLesson(id: number): LessonEntry {
  const found = lessonById(id);
  if (!found) throw new Error(`没有第 ${id} 关`);
  return found;
}

/** 取某一关的记忆锚；关卡不存在或没配锚点时直接报错。 */
export function anchorOf(id: number): MemoryAnchor {
  return requireLesson(id).anchor;
}

/** 取走标准流程的关卡；第 1 关走自己的流程，不在这里面。 */
export function stageLesson(id: number): StageLessonEntry {
  const found = lessonById(id);
  if (!found) throw new Error(`没有第 ${id} 关`);
  if (!isStageLesson(found)) throw new Error(`第 ${id} 关不走标准流程`);
  return found;
}

/** 一关属于哪个能力维度。 */
export function abilityOf(id: number): AbilityId | null {
  return lessonById(id)?.ability ?? null;
}

/** 某个能力维度覆盖哪些关。 */
export function levelsForAbility(ability: AbilityId): number[] {
  return LESSONS.filter((lesson) => lesson.ability === ability).map((lesson) => lesson.id);
}

/**
 * 课程自检。
 *
 * 返回所有发现的问题，空数组表示课程是自洽的。
 * 做成返回值而不是直接抛错，是为了能写进守卫测试里。
 */
export function validateCurriculum(): string[] {
  const problems: string[] = [];

  // 关号必须是 1..N 连续，不能跳号也不能重号。
  const ids = LESSONS.map((lesson) => lesson.id);
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index] !== index + 1) {
      problems.push(`关号不连续：第 ${index + 1} 个应该是 ${index + 1}，实际是 ${ids[index]}`);
    }
  }

  // 记忆锚必须齐全，而且锚点代号不能重复（重复了学习者会记混）。
  const anchorIds = new Set<string>();
  for (const lesson of LESSONS) {
    const anchor = lesson.anchor;
    if (!anchor) {
      problems.push(`第 ${lesson.id} 关没有记忆锚`);
      continue;
    }
    if (anchorIds.has(anchor.id)) {
      problems.push(`记忆锚代号重复：${anchor.id}`);
    }
    anchorIds.add(anchor.id);
    if (anchor.hook.trim().length === 0) problems.push(`第 ${lesson.id} 关的记忆锚没有口诀`);
    if (anchor.steps.length === 0) problems.push(`第 ${lesson.id} 关的记忆锚没有判定流程`);
    if (anchor.takeaway.length === 0) problems.push(`第 ${lesson.id} 关的记忆锚没有 takeaway`);
  }

  for (const lesson of FLOW_LESSONS) {
    // 前置关卡必须存在，而且要比这一关早。
    for (const prereq of lesson.prereq ?? []) {
      if (!ids.includes(prereq)) {
        problems.push(`第 ${lesson.id} 关的前置关卡 ${prereq} 不存在`);
      } else if (prereq >= lesson.id) {
        problems.push(`第 ${lesson.id} 关的前置关卡 ${prereq} 不是更早的关卡`);
      }
    }

    // 手做题选错要能对上错误类型，错误类型必须在册。
    for (const [hand, kind] of Object.entries(lesson.mistakeKinds ?? {})) {
      const index = Number(hand);
      if (index < 0 || index >= lesson.handChoices.length) {
        problems.push(`第 ${lesson.id} 关把第 ${index} 题标成了错误类型，但手做只有 ${lesson.handChoices.length} 题`);
      }
      if (!kind) problems.push(`第 ${lesson.id} 关第 ${index} 题的错误类型是空的`);
    }

    // 补救措施指向的错误类型必须在册。
    for (const fix of lesson.fixes ?? []) {
      if (!fix.kind) problems.push(`第 ${lesson.id} 关有一条没有类型的补救措施`);
      if (fix.advice.trim().length === 0) {
        problems.push(`第 ${lesson.id} 关有一条补救措施没写具体做法`);
      }
    }
  }

  // 每一种错误类型都得有地方能补救，否则学习者撞上了却没人接。
  for (const lesson of FLOW_LESSONS) {
    for (const kind of Object.values(lesson.mistakeKinds ?? {})) {
      const hasFix = FLOW_LESSONS.some((other) =>
        (other.fixes ?? []).some((fix) => fix.kind === kind),
      );
      if (!hasFix) problems.push(`错误类型 ${kind} 没有任何关卡能补救`);
    }
  }

  return problems;
}
