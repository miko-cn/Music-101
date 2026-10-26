import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";
import type { ScaleStepSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";
import { BLACK_H, BLACK_W, WHITE_H, WHITE_W, keyboardGeometry } from "./keyboard-geometry.ts";

/**
 * 第 5 关 · 音阶与调。
 *
 * 这一关要教的只有一件事：**一个调就是键盘上的一组固定的键**。
 * 所以左边画一条真键盘，把这个调的音高亮、黑键压暗——
 * 「C 大调在键盘上就是这几个键」，一眼就记住位置。
 * 右边是级数表：第几级、音名、叫什么名字。
 *
 * 音名标在键上，级数标在键上方——这样「级数」和「键的位置」永远连在一起。
 */
const WHITE_TOP = 74;
const KEYBOARD_W = 8 * WHITE_W;

export function ScaleDegreesDiagram({
  caption,
  steps,
  onPlay,
}: DiagramProps & { caption: string; steps: readonly ScaleStepSpec[] }) {
  const geometry = keyboardGeometry(60, 8);
  const inScale = new Set(steps.map((step) => step.midi % 12));
  const degreeOf = (midi: number) =>
    steps.find((step) => step.midi === midi)?.degree ??
    steps.find((step) => step.midi === midi + 12)?.degree;
  const nameOf = (midi: number) => toNotationName(midiToNoteName(midi));

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox="0 0 660 252"
        role="img"
        aria-label="音阶级数：C 大调七个音在键盘上的位置，以及每个音的级数和名字"
      >
        <title>一个调 = 键盘上一组固定的键</title>

        <text x={0} y={18} className="dg-small dg-muted">
          高亮的键就是这个调的音，按下去就是一个音
        </text>

        {/* 白键。 */}
        {geometry.whites.map((key) => {
          const degree = degreeOf(key.midi);
          const on = inScale.has(key.midi % 12);
          return (
            <g
              key={`w${key.midi}`}
              className="dg-hit"
              role="button"
              tabIndex={0}
              aria-label={`${key.name}${degree ? `，第 ${degree} 级` : ""}，点一下听这个音`}
              onClick={() => onPlay?.([key.midi])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlay?.([key.midi]);
                }
              }}
            >
              <rect
                x={key.x}
                y={WHITE_TOP}
                width={key.width}
                height={WHITE_H}
                className={on ? "dg-key dg-key-white dg-key-on" : "dg-key dg-key-white dg-key-off"}
              />
              {/* 级数标在键上方，音名标在键下方。 */}
              {degree ? (
                <text x={key.center} y={WHITE_TOP - 26} textAnchor="middle" className="dg-degree">
                  {degree}
                </text>
              ) : null}
              <text x={key.center} y={WHITE_TOP + WHITE_H - 14} textAnchor="middle" className="dg-key-name">
                {nameOf(key.midi)}
              </text>
            </g>
          );
        })}

        {/* 黑键：这个调里的高亮，不在调里的压暗。 */}
        {geometry.blacks.map((key) => {
          const on = inScale.has(key.midi % 12);
          return (
            <g
              key={`b${key.midi}`}
              className="dg-hit"
              role="button"
              tabIndex={0}
              aria-label={`${key.name}${on ? "，在这个调里" : "，不在这个调里"}`}
              onClick={() => onPlay?.([key.midi])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlay?.([key.midi]);
                }
              }}
            >
              <rect
                x={key.x}
                y={WHITE_TOP}
                width={BLACK_W}
                height={BLACK_H}
                className={on ? "dg-key dg-key-black dg-key-black-on" : "dg-key dg-key-black dg-key-black-off"}
              />
            </g>
          );
        })}

        {/* 右边：级数表。 */}
        <g transform={`translate(${KEYBOARD_W + 26} 0)`}>
          <text x={0} y={44} className="dg-label">
            级数
          </text>
          <text x={62} y={44} className="dg-label">
            音名
          </text>
          <text x={128} y={44} className="dg-label">
            名字
          </text>
          {steps.map((step, index) => (
            <g key={`${step.degree}-${step.midi}`}>
              <line x1={0} y1={56 + index * 24} x2={230} y2={56 + index * 24} className="dg-axis" />
              <text x={0} y={72 + index * 24} className="dg-degree-inline">
                {step.degree}
              </text>
              <text x={62} y={72 + index * 24} className="dg-note">
                {step.name}
              </text>
              <text x={128} y={72 + index * 24} className="dg-small dg-muted">
                {step.role ?? ""}
              </text>
            </g>
          ))}
          <text x={0} y={56 + steps.length * 24 + 14} className="dg-tiny dg-muted">
            第 8 级 = 高八度的 1
          </text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
