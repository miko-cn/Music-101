/**
 * 答题反馈的判定。
 *
 * 单独一个模块，因为判定本身是要被测的：
 * 「选对了没有」「该响哪种音」「答错时给什么提示」都是规则，
 * 不该埋在组件的 onChange 里。
 */
import type { SfxCue } from "../audio/sfx.ts";

/** 一个选项当前的判定结果。 */
export type AnswerVerdict = "idle" | "correct" | "wrong";

/**
 * 判定一次作答。
 *
 * 没选是 idle；选了且等于正确项是 correct；否则是 wrong。
 * 选错的项不会「变回」未答——错就是错了，重选会重新判定。
 */
export function answerVerdict(
  chosen: number | null | undefined,
  correct: number,
): AnswerVerdict {
  if (chosen === null || chosen === undefined) return "idle";
  return chosen === correct ? "correct" : "wrong";
}

/**
 * 这个判定该配哪种反馈音。
 *
 * idle 不发声——没作答的时候响一下是在催人。
 */
export function sfxForVerdict(verdict: AnswerVerdict): SfxCue | null {
  if (verdict === "correct") return "correct";
  if (verdict === "wrong") return "wrong";
  return null;
}

/**
 * 答错时给的引导方向。
 *
 * 用这一关的记忆锚（口诀 + 判定流程）而不是直接报答案。
 * 直接说「答案是 X」，学习者记住的是答案；
 * 给他判定流程，他下次自己走得出来。
 */
export function anchorHint(name: string, hook: string): string {
  return `这一关的记忆锚是「${name}」：${hook}`;
}
