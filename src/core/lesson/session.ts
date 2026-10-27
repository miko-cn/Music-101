/**
 * 答题会话的状态机：一题一题地走，「选 → 检查 → 继续」。
 *
 * 纯函数，不 import React、不碰 DOM，测试直接守。
 *
 * 最要紧的一条：只有**定稿**的答案才写进 committed，关卡页再把它原样同步进 earAnswers。
 * stageEarScore 把任何非 null 都当成「已答」，所以：
 * - 判错但还没定稿 → committed 保持 null（不然没检查完的题会被算进分数）
 * - 看了答案 → committed 存最后那个错下标，计为错
 *   （改成正确下标等于放水；改回 null 会让整轮永远「没答完」）
 */
import { shuffleChoices } from "./review.ts";

export type QuestionPhase =
  /** 还没检查，可以改选。 */
  | "answering"
  /** 检查过、错了，可以再试；错满 revealAfter 次可以看答案。 */
  | "wrong"
  /** 检查过、对了，已定稿。 */
  | "correct"
  /** 看了答案，已定稿，计为错。 */
  | "revealed";

export interface SessionPolicy {
  /** 错几次之后允许看答案。 */
  revealAfter: number;
  /** 错了能不能再试。不能的话，判错直接亮答案。 */
  allowRetry: boolean;
}

/** 关卡：两级提示——第一次错只给方向，错满两次才能看答案。 */
export const LESSON_POLICY: SessionPolicy = { revealAfter: 2, allowRetry: true };

/** 复习：一次机会，错了直接亮答案（Leitner 盒按这一次掉档）。 */
export const REVIEW_POLICY: SessionPolicy = { revealAfter: 1, allowRetry: false };

/** 状态机只需要知道每题的正确项。 */
export interface SessionKey {
  correct: number;
}

export interface SessionState {
  cursor: number;
  /** 当前选中，原始下标。 */
  selected: (number | null)[];
  phase: QuestionPhase[];
  /** 每题错了几次。 */
  attempts: number[];
  /** 定稿的答案，原始下标。只有它写进 earAnswers。 */
  committed: (number | null)[];
  /** 第一次检查就对。 */
  firstTry: boolean[];
  streak: number;
  bestStreak: number;
  startedAt: number;
  finishedAt: number | null;
}

export type SessionAction =
  | { type: "select"; choice: number }
  | { type: "check" }
  | { type: "retry" }
  | { type: "reveal" }
  | { type: "continue"; now: number };

export function isSettled(phase: QuestionPhase | undefined): boolean {
  return phase === "correct" || phase === "revealed";
}

function setAt<T>(items: readonly T[], index: number, value: T): T[] {
  const next = items.slice();
  next[index] = value;
  return next;
}

export function createSession(questions: readonly SessionKey[], now: number): SessionState {
  const count = questions.length;
  return {
    cursor: 0,
    selected: Array.from({ length: count }, () => null),
    phase: Array.from({ length: count }, () => "answering" as const),
    attempts: Array.from({ length: count }, () => 0),
    committed: Array.from({ length: count }, () => null),
    firstTry: Array.from({ length: count }, () => false),
    streak: 0,
    bestStreak: 0,
    startedAt: now,
    finishedAt: count === 0 ? now : null,
  };
}

/** 已掌握的关卡重新打开时：整轮已经做完、全对。 */
export function solvedSession(questions: readonly SessionKey[], now: number): SessionState {
  const answers = questions.map((question) => question.correct);
  return {
    ...createSession(questions, now),
    cursor: Math.max(questions.length - 1, 0),
    selected: answers,
    phase: questions.map(() => "correct" as const),
    committed: answers,
    firstTry: questions.map(() => true),
    finishedAt: now,
  };
}

export function canReveal(state: SessionState, policy: SessionPolicy): boolean {
  const at = state.cursor;
  return state.phase[at] === "wrong" && (state.attempts[at] ?? 0) >= policy.revealAfter;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
  questions: readonly SessionKey[],
  policy: SessionPolicy,
): SessionState {
  if (state.finishedAt !== null) return state;
  const at = state.cursor;
  const question = questions[at];
  if (!question) return state;
  const phase = state.phase[at];

  switch (action.type) {
    case "select": {
      if (isSettled(phase) || action.choice < 0) return state;
      if (phase === "wrong" && !policy.allowRetry) return state;
      return {
        ...state,
        selected: setAt(state.selected, at, action.choice),
        phase: setAt(state.phase, at, "answering"),
      };
    }
    case "check": {
      const choice = state.selected[at];
      if (phase !== "answering" || choice === null || choice === undefined) return state;
      if (choice === question.correct) {
        const streak = state.streak + 1;
        return {
          ...state,
          phase: setAt(state.phase, at, "correct"),
          committed: setAt(state.committed, at, choice),
          firstTry: setAt(state.firstTry, at, (state.attempts[at] ?? 0) === 0),
          streak,
          bestStreak: Math.max(state.bestStreak, streak),
        };
      }
      const attempts = setAt(state.attempts, at, (state.attempts[at] ?? 0) + 1);
      if (!policy.allowRetry) {
        return {
          ...state,
          attempts,
          phase: setAt(state.phase, at, "revealed"),
          committed: setAt(state.committed, at, choice),
          streak: 0,
        };
      }
      return { ...state, attempts, phase: setAt(state.phase, at, "wrong"), streak: 0 };
    }
    case "retry": {
      if (phase !== "wrong" || !policy.allowRetry) return state;
      return {
        ...state,
        phase: setAt(state.phase, at, "answering"),
        selected: setAt(state.selected, at, null),
      };
    }
    case "reveal": {
      if (!canReveal(state, policy)) return state;
      return {
        ...state,
        phase: setAt(state.phase, at, "revealed"),
        committed: setAt(state.committed, at, state.selected[at] ?? null),
      };
    }
    case "continue": {
      if (!isSettled(phase)) return state;
      if (at >= questions.length - 1) return { ...state, finishedAt: action.now };
      return { ...state, cursor: at + 1 };
    }
  }
}

export interface SessionSummary {
  total: number;
  correct: number;
  firstTryCorrect: number;
  bestStreak: number;
  /** 用时（秒，取整）。还没做完是 null。 */
  seconds: number | null;
}

export function sessionSummary(state: SessionState, questions: readonly SessionKey[]): SessionSummary {
  const correct = questions.filter((question, index) => state.committed[index] === question.correct).length;
  return {
    total: questions.length,
    correct,
    firstTryCorrect: state.firstTry.filter(Boolean).length,
    bestStreak: state.bestStreak,
    seconds: state.finishedAt === null ? null : Math.round((state.finishedAt - state.startedAt) / 1000),
  };
}

/**
 * 显示顺序：displayOrder[显示位置] = 原始下标。
 *
 * 只洗显示层。selected / committed 永远存原始下标，
 * earAnswers、配方、复习卡都不用知道洗过牌。
 */
export function displayOrder(choiceCount: number, seed: string): number[] {
  return shuffleChoices(
    Array.from({ length: choiceCount }, (_, index) => index),
    seed,
  );
}
