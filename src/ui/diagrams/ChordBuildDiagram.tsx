import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";
import type { ChordStackSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 4 关 · 大三和弦与小三和弦。
 *
 * 这一关的核心是一句话：**性质只看中间那个音**。
 * 所以图上把三个音竖着叠起来（根音在下、三音在中、五音在上），
 * 中间那一层用金色标出来，右边一列是降了半音的小三和弦，
 * 一根箭头从中音指过去——「动这一个音，整和弦就变暗」。
 *
 * 层与层之间标「三度」：和弦就是三度一层层叠出来的。
 */
const BLOCK_H = 46;
const BLOCK_GAP = 26;
const TOP = 68;
const COL_W = 250;
const COL_GAP = 90;
const PAD_L = 20;

export function ChordBuildDiagram({
  caption,
  stacks,
  onPlay,
}: DiagramProps & { caption: string; stacks: readonly ChordStackSpec[] }) {
  const width = PAD_L + stacks.length * COL_W + (stacks.length - 1) * COL_GAP;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} 290`}
        role="img"
        aria-label="和弦的三度堆叠：根音、三音、五音，大三和小三只差中间那个音"
      >
        <title>三度堆叠出和弦</title>

        {stacks.map((stack, columnIndex) => {
          const x = PAD_L + columnIndex * (COL_W + COL_GAP);
          return (
            <g key={stack.symbol}>
              <text x={x + COL_W / 2} y={26} textAnchor="middle" className="dg-chord-strong">
                {stack.symbol}
              </text>
              <text x={x + COL_W / 2} y={48} textAnchor="middle" className="dg-small dg-muted">
                {stack.quality}
              </text>

              {stack.midis.map((midi, index) => {
                const y = TOP + index * (BLOCK_H + BLOCK_GAP);
                const isThird = stack.roles[index] === "三音";
                return (
                  <g
                    key={`${stack.symbol}-${midi}`}
                    className="dg-hit"
                    role="button"
                    tabIndex={0}
                    aria-label={`${stack.symbol} 的${stack.roles[index]} ${
                      stack.names?.[index] ?? toNotationName(midiToNoteName(midi))
                    }，点一下听这个和弦`}
                    onClick={() => onPlay?.(stack.midis)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onPlay?.(stack.midis);
                      }
                    }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={COL_W}
                      height={BLOCK_H}
                      rx={10}
                      className={isThird ? "dg-block dg-block-third" : "dg-block"}
                    />
                    <text x={x + 16} y={y + 29} className="dg-note">
                      {stack.names?.[index] ?? toNotationName(midiToNoteName(midi))}
                    </text>
                    <text
                      x={x + COL_W - 16}
                      y={y + 29}
                      textAnchor="end"
                      className={isThird ? "dg-small dg-strong" : "dg-small dg-muted"}
                    >
                      {stack.roles[index]}
                    </text>
                  </g>
                );
              })}

              {/* 层与层之间是三度。 */}
              {stack.midis.slice(0, -1).map((_, index) => (
                <text
                  key={`gap-${index}`}
                  x={x + COL_W / 2}
                  y={TOP + index * (BLOCK_H + BLOCK_GAP) + BLOCK_H + 18}
                  textAnchor="middle"
                  className="dg-tiny dg-muted"
                >
                  三度
                </text>
              ))}

              {stack.note ? (
                <text x={x + COL_W / 2} y={TOP + 3 * BLOCK_H + 2 * BLOCK_GAP + 30} textAnchor="middle" className="dg-small dg-strong">
                  {stack.note}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* 从大三的三音指到小三的三音：只差这一个音。 */}
        {stacks.length > 1 &&
          stacks.map((stack, columnIndex) => {
            if (columnIndex === 0) return null;
            const previous = stacks[columnIndex - 1]!;
            const thirdIndex = previous.roles.indexOf("三音");
            const selfThird = stack.roles.indexOf("三音");
            if (thirdIndex < 0 || selfThird < 0) return null;
            const y = TOP + thirdIndex * (BLOCK_H + BLOCK_GAP) + BLOCK_H / 2;
            const x1 = PAD_L + (columnIndex - 1) * (COL_W + COL_GAP) + COL_W + 6;
            const x2 = PAD_L + columnIndex * (COL_W + COL_GAP) - 6;
            return (
              <g key={`arrow-${columnIndex}`}>
                <text x={(x1 + x2) / 2} y={y - 14} textAnchor="middle" className="dg-tiny dg-strong">
                  三音降半音
                </text>
                <path
                  d={`M ${x1} ${y - 5} L ${x2 - 8} ${y - 5} L ${x2 - 8} ${y - 11}
                      L ${x2} ${y} L ${x2 - 8} ${y + 11} L ${x2 - 8} ${y + 5} L ${x1} ${y + 5} Z`}
                  className="dg-arrow-fill"
                />
              </g>
            );
          })}
      </svg>
    </DiagramFrame>
  );
}
