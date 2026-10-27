/**
 * 答题反馈面板。
 *
 * 两级提示，这是这一层最要紧的设计决定：
 *
 * - 第一次答错：只给方向（这一关的记忆锚口诀），不给答案。
 *   学习者拿这个提示再想一次，想出来了才真的学会。
 * - 第二次还错：「看答案」才把正确项和解析亮出来。
 *
 * 如果第一次就报答案，学习者记住的是「那一题选了 B」，
 * 不是「怎么判断它是 B」。这跟复习队列（Leitner 盒）是同一个道理：
 * 答错了就掉档，别急着让他过。
 *
 * 亮出答案之后这道题就锁死了：答案已经写在脸上，
 * 再选一遍不算学会。所以这里不再让改。
 */
import { Button } from "antd";
import { praiseLine, retryLine } from "../core/lesson/copy.ts";

export function QuizFeedback({
  correct,
  seed,
  hint,
  encourage,
  reveal,
  explanation,
  attempts,
  revealed,
  onReveal,
}: {
  /** 这次作答对不对。 */
  correct: boolean;
  /** 轮换文案用的种子，通常是题号。 */
  seed: number;
  /** 第一次答错时给的引导方向。 */
  hint: string;
  /** 答对时的反应。没写就用通用轮换。 */
  encourage?: string;
  /** 亮出答案时显示的正确答案文字。 */
  reveal: string;
  /** 解析文本。 */
  explanation: string;
  /** 这道题已经答错几次。 */
  attempts: number;
  /** 点了「看答案」。 */
  revealed: boolean;
  onReveal: () => void;
}) {
  if (correct) {
    return (
      <div className="quiz-feedback is-correct" role="status">
        <p className="quiz-feedback-title">{encourage ?? praiseLine(seed)}</p>
        <p className="quiz-feedback-body">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="quiz-feedback is-wrong" role="status">
      <p className="quiz-feedback-title">{retryLine(seed)}</p>
      {revealed ? (
        <>
          <p className="quiz-feedback-reveal">
            正确答案：{reveal}
            <br />
            {explanation}
          </p>
        </>
      ) : (
        <>
          <p className="quiz-feedback-hint">{hint}</p>
          {attempts >= 2 ? (
            <Button size="small" onClick={onReveal}>
              还是不对，看答案
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
