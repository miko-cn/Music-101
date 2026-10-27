/**
 * 一轮做完的结算页：取代题目区。
 *
 * 过关音不在这里播：它必须在最后一题「继续」的点击里同步发出（QuizSession.advance），
 * 放进这里的 effect 会被自动播放策略吞掉。
 */
import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import type { SessionSummary as Summary } from "../../core/lesson/session.ts";
import { springs } from "../theme.ts";
import { Confetti } from "./Confetti.tsx";

/** 数字从 0 跑到终值。不超过终值：弹簧的回弹会让「用时」先多跳几秒再退回来。 */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, target, {
      ...springs.soft,
      onUpdate: (value) => setShown(Math.min(target, Math.round(value))),
    });
    return () => controls.stop();
  }, [target, reduced]);
  return reduced ? target : shown;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Stat({ label, value, children }: { label: string; value: string; children?: string }) {
  return (
    <div className="session-stat">
      <span className="session-stat-value">
        {value}
        {children && <small>{children}</small>}
      </span>
      <span className="session-stat-label">{label}</span>
    </div>
  );
}

export function SessionSummary({
  summary,
  passMark,
  onRedo,
  onContinue,
}: {
  summary: Summary;
  passMark: number;
  onRedo: () => void;
  onContinue: () => void;
}) {
  const passed = summary.correct >= passMark;
  const firstTry = useCountUp(summary.firstTryCorrect);
  const streak = useCountUp(summary.bestStreak);
  const seconds = useCountUp(summary.seconds ?? 0);

  return (
    <section className="session-summary">
      {passed && <Confetti />}
      <h2 className="result-heading">这一轮听辨做完了</h2>
      {passed ? (
        <div className="pass-stamp">
          <span aria-hidden="true">★</span>
          <span>听辨通过</span>
        </div>
      ) : (
        <p className="session-summary-miss">
          答对 {summary.correct} / {summary.total}，还差 {passMark - summary.correct} 题过关
        </p>
      )}
      <div className="session-stats">
        <Stat label="第一次就对" value={String(firstTry)}>{` / ${summary.total}`}</Stat>
        <Stat label="最长连对" value={String(streak)} />
        <Stat label="用时" value={summary.seconds === null ? "—" : clock(seconds)} />
      </div>
      <div className="session-summary-actions">
        <button type="button" className="session-btn is-ghost m101-press" onClick={onRedo}>
          重做这一轮
        </button>
        <button type="button" className="session-btn is-brand m101-press" onClick={onContinue}>
          继续
        </button>
      </div>
    </section>
  );
}
