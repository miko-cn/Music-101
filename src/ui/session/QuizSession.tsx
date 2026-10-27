/**
 * 答题会话：一题一题地走，「选 → 检查 → 继续」。
 *
 * 受控组件：状态由关卡页持有（离开听辨步再回来，进度和「错了几次」都还在）。
 *
 * 音效全部在事件处理函数里：先用 reducer 算出新状态，同步播音，再 onState。
 * 不能「dispatch 完在 effect 里看新状态播音」——effect 不在用户手势里，
 * 浏览器的自动播放策略会让它静音。
 */
import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  canReveal,
  createSession,
  displayOrder,
  isSettled,
  sessionReducer,
  sessionSummary,
  type SessionAction,
  type SessionPolicy,
  type SessionState,
} from "../../core/lesson/session.ts";
import type { PitchClass } from "../../core/theory/pitch.ts";
import type { ScaleId } from "../../core/theory/scale.ts";
import { springs } from "../theme.ts";
import { playFeedbackSfx } from "../useFeedbackSfx.ts";
import { CheckSheet } from "./CheckSheet.tsx";
import { playInOrder, playOne } from "./playOptions.ts";
import { SessionProgress } from "./SessionProgress.tsx";
import { SessionQuestion } from "./SessionQuestion.tsx";
import { SessionSummary } from "./SessionSummary.tsx";
import { useSessionKeys } from "./useSessionKeys.ts";
import "./session.css";

export interface SessionQuestionData {
  id: string;
  prompt: string;
  choices: { label: string; midis: number[] }[];
  correct: number;
  explain: string;
  wrongHint?: string;
  encourage?: string;
  /** 盲听：选项文字检查之后才显示。任务 9 才接，这里先留着字段、按 false 处理。 */
  blind?: boolean;
  /** 复习页每题属于不同关卡，反馈音用题目自己的调。 */
  keyRoot?: PitchClass;
  keyScale?: ScaleId;
}

export interface QuizSessionProps {
  questions: readonly SessionQuestionData[];
  state: SessionState;
  onState: (next: SessionState) => void;
  policy: SessionPolicy;
  /** 显示层洗牌的种子前缀，例如 `${lessonId}#${visitId}`。 */
  seed: string;
  /** 题目已经洗过（复习页）就传 false。 */
  shuffle?: boolean;
  /** 题目自己没写 wrongHint 时的回退提示，通常是这一关的记忆锚。 */
  fallbackHint: string;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  /** 过关线。null = 不显示结算页，最后一题「继续」直接 onFinish。 */
  passMark: number | null;
  onFinish: () => void;
  /** 每题定稿时回调（复习页记盒子）。 */
  onGraded?: (index: number, correct: boolean) => void;
}

/** 连对到这几题时奏一个和弦。 */
const MILESTONES = [5, 10];

export function QuizSession({
  questions,
  state,
  onState,
  policy,
  seed,
  shuffle = true,
  fallbackHint,
  keyRoot,
  keyScale,
  passMark,
  onFinish,
  onGraded,
}: QuizSessionProps) {
  const question = questions[state.cursor];
  const orders = useMemo(
    () =>
      questions.map((item) =>
        shuffle ? displayOrder(item.choices.length, `${seed}#${item.id}`) : item.choices.map((_, index) => index),
      ),
    [questions, seed, shuffle],
  );
  const order = orders[state.cursor] ?? [];
  const cancelPlayback = useRef<() => void>(() => undefined);
  useEffect(() => () => cancelPlayback.current(), []);

  const keyOf = (item: SessionQuestionData | undefined) => ({
    keyRoot: item?.keyRoot ?? keyRoot,
    keyScale: item?.keyScale ?? keyScale,
  });

  const dispatch = (action: SessionAction): SessionState => {
    const next = sessionReducer(state, action, questions, policy);
    if (next !== state) onState(next);
    return next;
  };

  const select = (original: number) => {
    if (!question) return;
    const next = dispatch({ type: "select", choice: original });
    if (next === state) return;
    cancelPlayback.current();
    const midis = question.choices[original]?.midis ?? [];
    // 选中有声音的选项就播它自己——那是题目内容；没声音才播一声很轻的 select。
    if (midis.length > 0) playOne(midis);
    else playFeedbackSfx("select", keyOf(question));
  };

  const check = () => {
    const next = dispatch({ type: "check" });
    if (next === state || !question) return;
    const at = state.cursor;
    const phase = next.phase[at];
    if (phase === "correct") {
      playFeedbackSfx("correct", { ...keyOf(question), streak: next.streak });
      if (MILESTONES.includes(next.streak)) playFeedbackSfx("milestone", keyOf(question));
    } else {
      playFeedbackSfx("wrong", keyOf(question));
    }
    if (phase === "correct" || phase === "revealed") onGraded?.(at, phase === "correct");
  };

  const retry = () => void dispatch({ type: "retry" });

  const reveal = () => {
    const next = dispatch({ type: "reveal" });
    if (next !== state) onGraded?.(state.cursor, false);
  };

  const advance = () => {
    const next = dispatch({ type: "continue", now: Date.now() });
    if (next === state) return;
    cancelPlayback.current();
    if (next.finishedAt !== null) {
      if (passMark === null) {
        onFinish();
        return;
      }
      if (sessionSummary(next, questions).correct >= passMark) playFeedbackSfx("pass", keyOf(question));
      return;
    }
    const upcoming = questions[next.cursor];
    // 盲听题进题自动播一遍：必须在这次点击里启动，放进 effect 第一题会静音。
    if (upcoming?.blind) {
      cancelPlayback.current = playInOrder(
        (orders[next.cursor] ?? []).map((original) => upcoming.choices[original]?.midis ?? []),
      );
    }
  };

  const playAll = () => {
    if (!question) return;
    cancelPlayback.current();
    cancelPlayback.current = playInOrder(order.map((original) => question.choices[original]?.midis ?? []));
  };

  const finished = state.finishedAt !== null;
  const phase = state.phase[state.cursor] ?? "answering";
  useSessionKeys(!finished, {
    onDigit: (digit) => {
      const original = order[digit - 1];
      if (original !== undefined) select(original);
    },
    onEnter: () => {
      if (phase === "answering") check();
      else if (phase === "wrong") retry();
      else advance();
    },
    onSpace: () => {
      const chosen = state.selected[state.cursor];
      if (chosen !== null && chosen !== undefined && question) playOne(question.choices[chosen]?.midis ?? []);
      else playAll();
    },
  });

  // 空会话一创建就是「做完」：渲染结算页的话，「重做」只会再造一个空会话，原地打转。
  if (questions.length === 0) return <p className="hint">这一关没有听辨题。</p>;
  if (finished && passMark !== null) {
    return (
      <SessionSummary
        summary={sessionSummary(state, questions)}
        passMark={passMark}
        onRedo={() => onState(createSession(questions, Date.now()))}
        onContinue={onFinish}
      />
    );
  }
  if (!question) return null;
  return (
    <div className="quiz-session">
      <SessionProgress done={state.phase.filter(isSettled).length} total={questions.length} streak={state.streak} />
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={springs.base}
        >
          <SessionQuestion
            question={question}
            order={order}
            selected={state.selected[state.cursor] ?? null}
            phase={phase}
            onSelect={select}
            onPlay={(original) => playOne(question.choices[original]?.midis ?? [])}
            onPlayAll={playAll}
          />
        </m.div>
      </AnimatePresence>
      <CheckSheet
        phase={phase}
        canCheck={state.selected[state.cursor] !== null}
        canReveal={canReveal(state, policy)}
        allowRetry={policy.allowRetry}
        seed={state.cursor}
        encourage={question.encourage}
        hint={question.wrongHint ?? fallbackHint}
        answerLabel={question.choices[question.correct]?.label ?? ""}
        explanation={question.explain}
        onCheck={check}
        onRetry={retry}
        onReveal={reveal}
        onContinue={advance}
      />
    </div>
  );
}
