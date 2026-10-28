/**
 * 关卡路径图的数据层。
 *
 * 路径图是「我接下来该做什么」的答案。它把三件本来散在各处的事
 * 收到一起：
 * - 关卡的顺序和分组（来自 content 层）
 * - 每一关的状态（已掌握 / 卡住 / 没做过，来自 progress 层）
 * - 每一关的元信息（标题、阶段、能力、记忆锚口诀）
 *
 * 全部是纯函数，不碰 DOM。理由跟仓库里其它 core 模块一样：
 * 路径图的规则（什么叫「当前关」、怎么排节点、怎么分阶段）
 * 是要能单测的，不该埋在组件的 JSX 里。
 */
import { LESSONS, STAGES } from "../../content/index.ts";
import type { AbilityId, LessonEntry, StageId } from "../../content/types.ts";
import { isMastered } from "./personalize.ts";
import type { ProgressFile } from "./progress.ts";

/** 一个节点的处境。 */
export type NodeState =
  /** 已掌握：打过并且过了，可以跳过。 */
  | "mastered"
  /** 卡住：上次没过，这里是回去补的地方。 */
  | "retry"
  /** 没做过。 */
  | "new"
  /** 当前推荐：下一步该做这个。 */
  | "current";

export interface PathNode {
  id: number;
  title: string;
  stage: StageId;
  ability: AbilityId;
  /** 这一关的记忆锚口诀——节点旁边那行小字。 */
  hook: string;
  state: NodeState;
  /** 状态的中文说明。 */
  stateText: string;
}

export interface PathStage {
  id: StageId;
  title: string;
  nodes: PathNode[];
}

/**
 * 算出每一关的状态。
 *
 * 「当前关」的规则：所有已掌握的关往后找，第一个没掌握的关就是它。
 * 如果全部掌握了，当前关就是最后一关（没有「下一步」了，
 * 界面上的提示要说「全部掌握」，而不是指向一个已完成的关）。
 */
export function pathStates(progress: ProgressFile): Map<number, NodeState> {
  const states = new Map<number, NodeState>();
  for (const lesson of LESSONS) {
    states.set(lesson.id, isMastered(progress, lesson.id) ? "mastered" : "new");
  }
  // 卡住：最近一次尝试没过，且还没掌握。
  for (const attempt of progress.attempts) {
    const state = states.get(attempt.levelId);
    if (state === "mastered") continue;
    states.set(attempt.levelId, attempt.stuck ? "retry" : "new");
  }
  // 当前关 = 第一个没掌握的关。
  const firstUnmastered = LESSONS.find((lesson) => states.get(lesson.id) !== "mastered");
  if (firstUnmastered) {
    states.set(firstUnmastered.id, "current");
  } else {
    // 全掌握了：最后一关作为「当前」，界面提示「全部掌握」。
    const last = LESSONS[LESSONS.length - 1];
    if (last) states.set(last.id, "current");
  }
  return states;
}

/** 状态的中文说明。 */
function stateText(state: NodeState): string {
  if (state === "mastered") return "已掌握";
  if (state === "retry") return "上次没过";
  if (state === "current") return "下一步";
  return "";
}

/** 建一个节点。 */
function toNode(lesson: LessonEntry, state: NodeState): PathNode {
  return {
    id: lesson.id,
    title: lesson.title,
    stage: lesson.stage,
    ability: lesson.ability,
    hook: lesson.anchor.hook,
    state,
    stateText: stateText(state),
  };
}

/**
 * 完整的路径：按阶段分组，每组里的关按关号排。
 *
 * 阶段边界是天然的视觉分段——路径图上三段之间要断开，
 * 让「地基 → 编曲 → 风格」这个跳跃看得见。
 */
export function buildPath(progress: ProgressFile): PathStage[] {
  const states = pathStates(progress);
  return STAGES.map((stage) => ({
    id: stage.id,
    title: stage.title,
    nodes: stage.levelIds
      .map((id) => LESSONS.find((lesson) => lesson.id === id))
      .filter((lesson): lesson is LessonEntry => lesson !== undefined)
      .map((lesson) => toNode(lesson, states.get(lesson.id) ?? "new")),
  }));
}

/**
 * 路径的总体进度。
 *
 * 用「已掌握关数 / 总关数」，不用百分比——
 * 27 关的 8% 对学习者没有意义，「8 / 27 关」才有。
 */
export function pathProgress(progress: ProgressFile): { done: number; total: number } {
  const total = LESSONS.length;
  const done = LESSONS.filter((lesson) => isMastered(progress, lesson.id)).length;
  return { done, total };
}

/** 全部关卡都掌握了吗。 */
export function pathComplete(progress: ProgressFile): boolean {
  return pathProgress(progress).done === pathProgress(progress).total;
}

/** 目录顶卡用的那一关。没有阶段时是 null。 */
export function currentPathNode(stages: readonly PathStage[]): PathNode | null {
  for (const stage of stages) {
    const found = stage.nodes.find((node) => node.state === "current");
    if (found) return found;
  }
  return null;
}

/** 阶段头上的「已掌握 / 关数」。没掌握也保留分母。 */
export function stageMastery(stage: PathStage): { done: number; total: number } {
  return {
    done: stage.nodes.filter((node) => node.state === "mastered").length,
    total: stage.nodes.length,
  };
}

/** 进入路径页时只打开含当前关的阶段。空列表表示没有可打开的段。 */
export function initialOpenStageIds(stages: readonly PathStage[]): string[] {
  const current = currentPathNode(stages);
  return current ? [current.stage] : [];
}

/** 顶卡的两句文案。返回路径不属于顶卡。 */
export function continueLabels(complete: boolean): { kicker: string; action: string } {
  if (complete) return { kicker: "全部掌握", action: "再看一遍" };
  return { kicker: "接下来", action: "开始这一关" };
}

/** 展开时第 index 行的延迟。20ms 一档，200ms 封顶。 */
export function rowDelayMs(index: number): number {
  return Math.min(Math.max(0, index) * 20, 200);
}
