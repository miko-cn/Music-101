/**
 * 会话顶上的进度条 + 连对。
 *
 * 内条动 scaleX 不动 width：width 每帧都会触发布局。
 * 连对标签用 key={streak}，每加一就重新进场弹一下。
 */
import * as m from "motion/react-m";
import { springs } from "../theme.ts";

/** 连对到这么多就换成金色、带光晕：§3 放宽的「庆祝时刻」之一。 */
const HOT_STREAK = 5;

export function SessionProgress({ done, total, streak }: { done: number; total: number; streak: number }) {
  return (
    <div className="session-progress">
      <div
        className="session-progress-track"
        role="progressbar"
        aria-label="听辨进度"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <m.div
          className="session-progress-fill"
          style={{ transformOrigin: "left" }}
          initial={false}
          animate={{ scaleX: total > 0 ? done / total : 0 }}
          transition={springs.base}
        />
      </div>
      <span className="session-progress-count">
        {done} / {total}
      </span>
      <span className="session-streak-slot">
        {streak >= 2 && (
          <m.span
            key={streak}
            className={`session-streak${streak >= HOT_STREAK ? " is-hot" : ""}`}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={springs.snappy}
          >
            连对 ×{streak}
          </m.span>
        )}
      </span>
    </div>
  );
}
