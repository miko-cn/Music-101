import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";
import type { IntervalSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 3 关 · 音程与协和度。
 *
 * 这一关要分清两件事：**大小**（几度）和**性质**（纯 / 大 / 小）。
 * 文字里「C 到 E 是大三度」要读两遍才明白，
 * 图上把它变成一段竖着的距离：两个点之间那一截就是音程。
 *
 * 所有音程共用一条音高刻度（半音 → 像素），所以：
 * 纯五那一截很长，小二度那两点几乎贴在一起——「挤不挤」不用形容。
 *
 * 度数按音名数（第一个音算 1），半音数是另一回事，
 * 所以图上两个数分开写：左边标音名，右边标度数和半音数。
 */
const COL_W = 200;
const COL_GAP = 24;
const PAD_L = 16;
const TOP = 46;
const BASE_Y = 196;
const BOTTOM = 222;
/** 音名标签的右边界（相对列左边）。 */
const NAME_X = 56;
/** 音程竖线的位置（相对列左边）。 */
const LINE_X = 66;

export function IntervalDiagram({
  caption,
  intervals,
  onPlay,
}: DiagramProps & { caption: string; intervals: readonly IntervalSpec[] }) {
  const min = Math.min(...intervals.map((item) => item.from));
  const max = Math.max(...intervals.map((item) => item.to));
  const span = Math.max(1, max - min);
  const yOf = (midi: number) => BASE_Y - ((midi - min) / span) * (BASE_Y - TOP);
  const width = PAD_L + intervals.length * COL_W + (intervals.length - 1) * COL_GAP;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} 248`}
        role="img"
        aria-label="音程对照：纯五、小三度、小二度的大小和协和度"
      >
        <title>音程的大小与协和度</title>

        {intervals.map((item, index) => {
          const x = PAD_L + index * (COL_W + COL_GAP);
          const yFrom = yOf(item.from);
          const yTo = yOf(item.to);
          const tight = item.harmony === "挤" || item.harmony === "紧张";
          const name = (midi: number) => toNotationName(midiToNoteName(midi));

          return (
            <g
              key={`${item.from}-${item.to}`}
              className="dg-hit"
              role="button"
              tabIndex={0}
              aria-label={`${item.quality}，${item.size}，${item.harmony ?? ""}，点一下听这一对`}
              onClick={() => onPlay?.([item.from, item.to])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlay?.([item.from, item.to]);
                }
              }}
            >
              {/* 性质：纯 / 大 / 小。 */}
              <text x={x + 4} y={22} className="dg-label">
                {item.quality}
              </text>

              {/* 竖直的音高刻度。 */}
              <line
                x1={x + LINE_X}
                y1={TOP - 10}
                x2={x + LINE_X}
                y2={BASE_Y + 6}
                className="dg-axis"
              />

              {/* 音程本身：两个点之间那一截。 */}
              <line
                x1={x + LINE_X}
                y1={yFrom}
                x2={x + LINE_X}
                y2={yTo}
                className={tight ? "dg-interval dg-interval-tight" : "dg-interval"}
                strokeWidth={tight ? 4 : 7}
              />

              {/* 两个端点。 */}
              <circle cx={x + LINE_X} cy={yFrom} r={5} className="dg-marker dg-strong-stroke" />
              <circle cx={x + LINE_X} cy={yTo} r={5} className="dg-marker dg-strong-stroke" />

              {/* 音名。 */}
              <text x={x + NAME_X} y={yFrom + 4} textAnchor="end" className="dg-note">
                {name(item.from)}
              </text>
              <text x={x + NAME_X} y={yTo + 4} textAnchor="end" className="dg-note">
                {name(item.to)}
              </text>

              {/* 度数和半音数：两回事，分开写。 */}
              <text x={x + LINE_X + 12} y={(yFrom + yTo) / 2 - 2} className="dg-small dg-strong">
                {item.size}
              </text>
              <text x={x + LINE_X + 12} y={(yFrom + yTo) / 2 + 14} className="dg-tiny dg-muted">
                {item.semitones} 个半音
              </text>

              {/* 协和度。 */}
              <text
                x={x + 4}
                y={BOTTOM}
                className={tight ? "dg-small dg-danger" : "dg-small dg-gold"}
              >
                {item.harmony ?? ""}
                {item.note ? ` · ${item.note}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </DiagramFrame>
  );
}
