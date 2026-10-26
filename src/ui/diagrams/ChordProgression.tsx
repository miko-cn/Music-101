import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";
import type { ProgressionStep } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 7 关 · I–V–vi–IV。
 *
 * 这一关讲的是「罗马数字 = 级数 + 性质」。图上把两者分开摆：
 * 上层是数字（级数），下层是和弦（性质），一眼能看出
 * 「vi 是小写，因为它是 Am」。
 *
 * 四个和弦之间画一个循环箭头——它是四小节循环，不是四个独立和弦。
 */
const BLOCK_W = 140;
const BLOCK_H = 112;
const BLOCK_TOP = 18;
const GAP = 38;

export function ChordProgressionDiagram({
  caption,
  steps,
  onPlay,
}: DiagramProps & { caption: string; steps: readonly ProgressionStep[] }) {
  const width = steps.length * BLOCK_W + (steps.length - 1) * GAP;
  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} 196`}
        role="img"
        aria-label={`和弦进行：${steps.map((step) => `${step.roman}（${step.symbol}）`).join(" → ")}`}
      >
        <title>I–V–vi–IV 和弦进行</title>

        {steps.map((step, index) => {
          const x = index * (BLOCK_W + GAP);
          const minor = step.quality === "小三";
          const notes = step.midis ?? [];
          return (
            <g
              key={`${step.roman}-${index}`}
              className={notes.length > 0 ? "dg-hit" : undefined}
              role={notes.length > 0 ? "button" : undefined}
              tabIndex={notes.length > 0 ? 0 : undefined}
              aria-label={
                notes.length > 0 ? `${step.roman} 级 ${step.symbol}，点一下听这个和弦` : undefined
              }
              onClick={() => notes.length > 0 && onPlay?.(notes)}
              onKeyDown={(event) => {
                if (notes.length > 0 && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onPlay?.(notes);
                }
              }}
            >
              <rect
                x={x}
                y={BLOCK_TOP}
                width={BLOCK_W}
                height={BLOCK_H}
                rx={12}
                className={minor ? "dg-block dg-block-minor" : "dg-block"}
              />
              <text
                x={x + BLOCK_W / 2}
                y={BLOCK_TOP + 46}
                textAnchor="middle"
                className="dg-roman"
              >
                {step.roman}
              </text>
              <text
                x={x + BLOCK_W / 2}
                y={BLOCK_TOP + 74}
                textAnchor="middle"
                className="dg-chord"
              >
                {step.symbol}
              </text>
              <text
                x={x + BLOCK_W / 2}
                y={BLOCK_TOP + 94}
                textAnchor="middle"
                className="dg-small dg-muted"
              >
                {step.quality ?? ""}
                {notes.length > 0
                  ? ` · ${notes.map((midi) => toNotationName(midiToNoteName(midi))).join(" ")}`
                  : ""}
              </text>
            </g>
          );
        })}

        {/* 箭头：一步一步往下走。 */}
        {steps.slice(0, -1).map((_, index) => {
          const x = index * (BLOCK_W + GAP) + BLOCK_W + 6;
          return (
            <path
              key={`arrow-${index}`}
              d={`M ${x} ${BLOCK_TOP + BLOCK_H / 2 - 7} L ${x + 12} ${BLOCK_TOP + BLOCK_H / 2}
                  L ${x} ${BLOCK_TOP + BLOCK_H / 2 + 7}`}
              className="dg-arrow"
            />
          );
        })}

        {/* 循环：最后一格绕回第一格。 */}
        {steps.length > 1 && (
          <path
            d={`M ${width - BLOCK_W / 2} ${BLOCK_TOP + BLOCK_H + 6}
                L ${width - BLOCK_W / 2} ${BLOCK_TOP + BLOCK_H + 26}
                L ${BLOCK_W / 2} ${BLOCK_TOP + BLOCK_H + 26}
                L ${BLOCK_W / 2} ${BLOCK_TOP + BLOCK_H + 8}`}
            className="dg-loop"
          />
        )}
        {steps.length > 1 && (
          <text
            x={width / 2}
            y={BLOCK_TOP + BLOCK_H + 44}
            textAnchor="middle"
            className="dg-small dg-muted"
          >
            四小节一圈，循环下去
          </text>
        )}
      </svg>
    </DiagramFrame>
  );
}
