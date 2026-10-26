import type { FunctionSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 15 关 · 和声功能 T / S / D。
 *
 * 这一关讲的是「和弦按功能分工」：T 是家，S 是家的邻居，D 是回家的劲。
 * 图上三个块排成一行，箭头从 T 出发绕一圈回到 T——
 * 功能和声就是这么转的，转一圈就是一个循环。
 *
 * D 到 T 那一条箭头特别标出来：那是「解决」，是唯一有方向感的一步。
 */
const BLOCK_W = 176;
const BLOCK_H = 112;
const BLOCK_GAP = 52;
const PAD_L = 18;
const TOP = 42;

export function HarmonyFunctionDiagram({
  caption,
  functions,
  onPlay,
}: DiagramProps & { caption: string; functions: readonly FunctionSpec[] }) {
  const width = PAD_L + functions.length * BLOCK_W + (functions.length - 1) * BLOCK_GAP;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} 244`}
        role="img"
        aria-label={`和声功能：${functions
          .map((item) => `${item.code} ${item.label}`)
          .join(" → ")}，最后一个回到第一个`}
      >
        <title>和声功能循环</title>

        {functions.map((item, index) => {
          const x = PAD_L + index * (BLOCK_W + BLOCK_GAP);
          const isResolve = item.code === "D";
          return (
            <g
              key={item.code}
              className={item.midis ? "dg-hit" : undefined}
              role={item.midis ? "button" : undefined}
              tabIndex={item.midis ? 0 : undefined}
              aria-label={
                item.midis
                  ? `${item.code} ${item.label}，代表和弦 ${item.symbol ?? ""}，点一下听`
                  : undefined
              }
              onClick={() => item.midis && onPlay?.(item.midis)}
              onKeyDown={(event) => {
                if (item.midis && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onPlay?.(item.midis);
                }
              }}
            >
              <rect
                x={x}
                y={TOP}
                width={BLOCK_W}
                height={BLOCK_H}
                rx={12}
                className={isResolve ? "dg-block dg-block-third" : "dg-block"}
              />
              <text x={x + BLOCK_W / 2} y={TOP + 44} textAnchor="middle" className="dg-function-code">
                {item.code}
              </text>
              <text x={x + BLOCK_W / 2} y={TOP + 68} textAnchor="middle" className="dg-small dg-strong">
                {item.label}
              </text>
              <text x={x + BLOCK_W / 2} y={TOP + 88} textAnchor="middle" className="dg-tiny dg-muted">
                {item.role}
              </text>
              {item.symbol ? (
                <text x={x + BLOCK_W / 2} y={TOP + 106} textAnchor="middle" className="dg-note">
                  {item.symbol}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* 前面的箭头：一步步往前走。 */}
        {functions.slice(0, -1).map((item, index) => {
          const x1 = PAD_L + index * (BLOCK_W + BLOCK_GAP) + BLOCK_W + 6;
          const x2 = PAD_L + (index + 1) * (BLOCK_W + BLOCK_GAP) - 6;
          const y = TOP + BLOCK_H / 2;
          return (
            <path
              key={`arrow-${item.code}`}
              d={`M ${x1} ${y - 7} L ${x2 - 9} ${y - 7} L ${x2 - 9} ${y - 13}
                  L ${x2} ${y} L ${x2 - 9} ${y + 13} L ${x2 - 9} ${y + 7} L ${x1} ${y + 7} Z`}
              className="dg-arrow-fill"
            />
          );
        })}

        {/* 绕回去的那一条：从最后一个功能回到第一个，叫「解决」。 */}
        {functions.length > 1 && (
          <g>
            <path
              d={`M ${PAD_L + (functions.length - 1) * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2} ${
                TOP + BLOCK_H + 2
              }
                  L ${PAD_L + (functions.length - 1) * (BLOCK_W + BLOCK_GAP) + BLOCK_W / 2} ${
                    TOP + BLOCK_H + 30
                  }
                  L ${PAD_L + BLOCK_W / 2} ${TOP + BLOCK_H + 30}
                  L ${PAD_L + BLOCK_W / 2} ${TOP + BLOCK_H + 16}`}
              className="dg-loop dg-loop-gold"
              strokeWidth={2}
            />
            {/* 箭头：指向 T。 */}
            <path
              d={`M ${PAD_L + BLOCK_W / 2} ${TOP + BLOCK_H + 6}
                  L ${PAD_L + BLOCK_W / 2 - 7} ${TOP + BLOCK_H + 16}
                  L ${PAD_L + BLOCK_W / 2 + 7} ${TOP + BLOCK_H + 16} Z`}
              className="dg-loop-fill"
            />
            <text
              x={PAD_L + (functions.length * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP) / 2}
              y={TOP + BLOCK_H + 50}
              textAnchor="middle"
              className="dg-small dg-strong"
            >
              回到 T = 解决
            </text>
          </g>
        )}
      </svg>
    </DiagramFrame>
  );
}
