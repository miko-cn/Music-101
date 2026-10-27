/**
 * 一道题：题干 + 选项块。
 *
 * 选项块是原生 <button>（antd 长不出可按压的底边阴影）。
 * 「▶」试听是选项的兄弟节点而不是子节点：button 里不能再套 button，
 * 而且定稿后选项锁死了，试听还得能点——学习者要能把每个选项再听一遍。
 *
 * 选项按 order 显示，回调永远给原始下标；数字角标就是键盘快捷键。
 */
import type { QuestionPhase } from "../../core/lesson/session.ts";
import type { SessionQuestionData } from "./QuizSession.tsx";

type Verdict = "idle" | "selected" | "correct" | "wrong";

/** 颜色之外还得有形状：色觉障碍才分得出对错。 */
const MARK: Partial<Record<Verdict, string>> = { correct: "✓", wrong: "✗" };

function verdictOf(phase: QuestionPhase, chosen: boolean, isAnswer: boolean): Verdict {
  if (phase === "revealed") return isAnswer ? "correct" : chosen ? "wrong" : "idle";
  if (!chosen) return "idle";
  if (phase === "correct") return "correct";
  if (phase === "wrong") return "wrong";
  return "selected";
}

export function SessionQuestion({
  question,
  order,
  selected,
  phase,
  onSelect,
  onPlay,
  onPlayAll,
}: {
  question: SessionQuestionData;
  /** order[显示位置] = 原始下标。 */
  order: readonly number[];
  selected: number | null;
  phase: QuestionPhase;
  onSelect: (original: number) => void;
  onPlay: (original: number) => void;
  onPlayAll: () => void;
}) {
  const settled = phase === "correct" || phase === "revealed";
  return (
    <section className="session-question">
      <div className="session-question-head">
        <h2 className="result-heading">{question.prompt}</h2>
        <button type="button" className="session-play-all" onClick={onPlayAll}>
          ▶ 都听一遍
        </button>
      </div>
      <div className="session-options" role="radiogroup" aria-label={question.prompt}>
        {order.map((original, position) => {
          const choice = question.choices[original];
          if (!choice) return null;
          const chosen = selected === original;
          const verdict = verdictOf(phase, chosen, original === question.correct);
          return (
            <div key={original} className={`session-choice is-${verdict}`}>
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                className={`session-option m101-press is-${verdict}`}
                disabled={settled}
                onClick={() => onSelect(original)}
              >
                <span className="session-option-key" aria-hidden="true">
                  {MARK[verdict] ?? position + 1}
                </span>
                <span className="session-option-label">{choice.label}</span>
                {verdict === "correct" && <span className="sr-only">{chosen ? "答对了" : "正确答案"}</span>}
                {verdict === "wrong" && <span className="sr-only">答错了</span>}
              </button>
              {choice.midis.length > 0 && (
                <button
                  type="button"
                  className="session-option-play"
                  aria-label={`试听：${choice.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPlay(original);
                  }}
                >
                  ▶
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
