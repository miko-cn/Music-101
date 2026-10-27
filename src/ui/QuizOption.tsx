/**
 * 答题选项组。
 *
 * 自己实现而不用 antd 的 Radio，因为这里要三样 antd 给不了的东西：
 * 1. 整块选项都能点（Duolingo 那样的大按钮），不是只点小圆点；
 * 2. 选项要能整体变色、整体做动效（扫光、弹起、抖动）；
 * 3. 每项旁边要挂一个「▶ 听」按钮，在 Radio 的 label 里塞按钮
 *    会跟选中行为打架。
 *
 * 键盘可达性自己补齐：role="radiogroup" / role="radio"，
 * 方向键切换并选中，跟原生 radio 一致。
 */
import { useRef, type KeyboardEvent } from "react";
import type { AnswerVerdict } from "../core/lesson/verdict.ts";

/** 判定对应的图标。颜色之外必须有形状，色觉障碍才分得出对错。 */
const MARK: Record<AnswerVerdict, string> = {
  idle: "",
  correct: "✓",
  wrong: "✗",
};

/** 屏幕阅读器读到的状态文字。图标本身读不出来，得配文字。 */
const MARK_TEXT: Record<AnswerVerdict, string> = {
  idle: "",
  correct: "答对了",
  wrong: "答错了",
};

export interface QuizChoice {
  label: string;
  /** 单独试听这个选项。 */
  onPlay?: () => void;
}

export interface QuizGroupProps {
  choices: readonly QuizChoice[];
  /** 当前选中的下标；null = 没选。 */
  value: number | null;
  onChange: (index: number) => void;
  /** 正确项下标。传 null 表示这一组不判定对错。 */
  correct: number | null;
  /**
   * 是否把正确项亮出来。
   *
   * 学习者答错两次、点了「看答案」之后才置 true——
   * 第一次答错只给方向，不给答案。
   */
  revealed?: boolean;
  /** 正确项选上之后锁住，不再让改。 */
  lockCorrect?: boolean;
  disabled?: boolean;
  /** 无障碍标签，这一组选项在讲什么。 */
  label: string;
}

export function QuizGroup({
  choices,
  value,
  onChange,
  correct,
  revealed = false,
  lockCorrect = false,
  disabled,
  label,
}: QuizGroupProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  /** 方向键：跟原生 radio 一样，上下左右换选项并且直接选中。 */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (value === null || choices.length === 0) return;
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (value + step + choices.length) % choices.length;
    onChange(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="quiz-group" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {choices.map((choice, index) => {
        const selected = value === index;
        const isTheAnswer = correct !== null && index === correct;
        const verdict: AnswerVerdict = !selected
          ? revealed && isTheAnswer
            ? "correct"
            : "idle"
          : isTheAnswer
            ? "correct"
            : "wrong";
        // 选对了就锁住：再点别的只会把已经拿到的分弄丢。
        const locked = lockCorrect && selected && isTheAnswer;
        return (
          <div key={index} className={`quiz-option is-${verdict}`}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              className="quiz-option-main"
              disabled={disabled || locked}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              onClick={() => onChange(index)}
            >
              <span className="quiz-option-mark" aria-hidden="true">
                {MARK[verdict]}
              </span>
              <span className="quiz-option-label">{choice.label}</span>
              {MARK_TEXT[verdict] ? <span className="sr-only">{MARK_TEXT[verdict]}</span> : null}
            </button>
            {choice.onPlay ? (
              <button type="button" className="quiz-option-play" onClick={choice.onPlay}>
                ▶ 听
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
