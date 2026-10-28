/**
 * 会话区的底栏：没检查时是一条安静的「检查」栏，检查之后升起成判定条。
 *
 * sticky 贴在会话区底部，不是整页 fixed——整关的「上一步 / 下一步」在会话区外面，
 * 不能被它盖住。
 *
 * 判错只给方向（hint），不给答案；错满次数才出「看答案」。
 */
import type { ReactNode } from "react";
import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import { praiseLine, retryLine } from "../../core/lesson/copy.ts";
import type { QuestionPhase } from "../../core/lesson/session.ts";
import { springs } from "../theme.ts";

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="session-kbd" aria-hidden="true">
      {children}
    </kbd>
  );
}

/**
 * 退场期间这一幕还在 DOM 里，按钮上挂的却是上一个状态的闭包——
 * 这时点「继续」会拿旧状态再 dispatch 一次，音效也再播一遍。所以退场中 inert。
 *
 * 必须包在 AnimatePresence 的 motion 子节点里面，不能自己当那个子节点：
 * mode="wait" 只认直接子节点上的退出动画，包一层普通组件它就等不到完成回调。
 */
function Live({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div className="check-sheet-live" inert={!present}>
      {children}
    </div>
  );
}

export function CheckSheet({
  phase,
  canCheck,
  canReveal,
  allowRetry,
  seed,
  encourage,
  hint,
  answerLabel,
  explanation,
  onCheck,
  onRetry,
  onReveal,
  onContinue,
}: {
  phase: QuestionPhase;
  canCheck: boolean;
  canReveal: boolean;
  allowRetry: boolean;
  /** 轮换文案用的种子，通常是题号。 */
  seed: number;
  encourage?: string;
  hint: string;
  answerLabel: string;
  explanation: string;
  onCheck: () => void;
  onRetry: () => void;
  onReveal: () => void;
  onContinue: () => void;
}) {
  const good = phase === "correct";
  const title = good
    ? (encourage ?? praiseLine(seed))
    : phase === "revealed"
      ? `正确答案：${answerLabel}`
      : retryLine(seed);
  const body = phase === "wrong" ? hint : explanation;

  return (
    <div className="check-sheet">
      <AnimatePresence mode="wait" initial={false}>
        {phase === "answering" ? (
          <m.div
            key="answering"
            className="check-sheet-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.snappy}
          >
            <Live>
            <span className="check-sheet-tip">数字键选择 · 空格重播</span>
            <button
              type="button"
              className="session-btn is-brand m101-press"
              disabled={!canCheck}
              onClick={onCheck}
            >
              检查 <Keycap>Enter</Keycap>
            </button>
            </Live>
          </m.div>
        ) : (
          <m.div
            key="verdict"
            className={`check-sheet-verdict ${good ? "is-correct" : "is-wrong"}`}
            role="status"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springs.snappy}
          >
            <Live>
            <span className="check-sheet-icon" aria-hidden="true">
              {good ? "✓" : "✗"}
            </span>
            <div className="check-sheet-text">
              <p className="check-sheet-title">{title}</p>
              <p className="check-sheet-body">{body}</p>
            </div>
            <div className="check-sheet-actions">
              {phase === "wrong" ? (
                <>
                  {canReveal && (
                    <button type="button" className="session-btn is-ghost m101-press" onClick={onReveal}>
                      看答案
                    </button>
                  )}
                  {allowRetry && (
                    <button type="button" className="session-btn is-danger m101-press" onClick={onRetry}>
                      再试一次 <Keycap>Enter</Keycap>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className={`session-btn ${good ? "is-success" : "is-danger"} m101-press`}
                  onClick={onContinue}
                >
                  继续 <Keycap>Enter</Keycap>
                </button>
              )}
            </div>
            </Live>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
