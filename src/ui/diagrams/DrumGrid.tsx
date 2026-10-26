import type { DrumLaneSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 10 关 · 鼓组四件套。
 *
 * 这一关的文案是一句话：踢 1、9，军鼓拍手 5、13，踩镲全偶数格。
 * 这句话读起来要自己在脑子里画格子——画出来就不用想了。
 *
 * 图直接用关卡自己的 `drums` 数据渲染，不是另抄一份：
 * 关卡里的鼓型改了，这张图跟着改，不会两边对不上。
 */
const CELL_W = 34;
const CELL_H = 30;
const LABEL_W = 92;
const STEPS = 16;
const HEAD_TOP = 30;
const GRID_TOP = 76;
const ROLE_ORDER: DrumLaneSpec["role"][] = ["KICK", "SNARE", "CLAP", "HAT"];

export function DrumGridDiagram({
  caption,
  lanes,
}: DiagramProps & { caption: string; lanes: readonly DrumLaneSpec[] }) {
  const ordered = ROLE_ORDER.flatMap((role) => lanes.filter((lane) => lane.role === role));
  const width = LABEL_W + STEPS * CELL_W;
  const gridBottom = GRID_TOP + ordered.length * CELL_H;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} ${gridBottom + 40}`}
        role="img"
        aria-label="鼓型网格：踢在第 1、9 格，军鼓和拍手在第 5、13 格，踩镲铺满八分音符"
      >
        <title>四件套在 16 格里的落点</title>

        {/* 拍标尺：四拍，每拍四格。 */}
        {[0, 1, 2, 3].map((beat) => (
          <g key={beat}>
            <rect
              x={LABEL_W + beat * CELL_W * 4}
              y={4}
              width={CELL_W * 4}
              height={22}
              rx={4}
              className="dg-beat"
            />
            <text
              x={LABEL_W + beat * CELL_W * 4 + CELL_W * 2}
              y={19}
              textAnchor="middle"
              className="dg-small dg-muted"
            >
              第 {beat + 1} 拍
            </text>
          </g>
        ))}

        {/* 格号。 */}
        {Array.from({ length: STEPS }, (_, index) => (
          <text
            key={index}
            x={LABEL_W + index * CELL_W + CELL_W / 2}
            y={HEAD_TOP + 16}
            textAnchor="middle"
            className={index % 4 === 0 ? "dg-step-no dg-strong" : "dg-step-no dg-muted"}
          >
            {index + 1}
          </text>
        ))}

        {/* 轨道。 */}
        {ordered.map((lane, laneIndex) => (
          <g key={lane.role}>
            <text
              x={LABEL_W - 10}
              y={GRID_TOP + laneIndex * CELL_H + CELL_H / 2 + 4}
              textAnchor="end"
              className="dg-small dg-muted"
            >
              {lane.label}
            </text>
            {lane.target.map((on, index) => (
              <rect
                key={index}
                x={LABEL_W + index * CELL_W}
                y={GRID_TOP + laneIndex * CELL_H}
                width={CELL_W - 2}
                height={CELL_H - 2}
                rx={4}
                className={on ? `dg-hit-cell dg-role-${lane.role.toLowerCase()}` : "dg-cell"}
              />
            ))}
          </g>
        ))}

        {/* 强拍 / 反拍：踢和军鼓各自的地盘。 */}
        <g>
          <rect
            x={LABEL_W}
            y={gridBottom + 8}
            width={CELL_W - 2}
            height={5}
            rx={2.5}
            className="dg-group-bar dg-kick-fill"
          />
          <rect
            x={LABEL_W + 8 * CELL_W}
            y={gridBottom + 8}
            width={CELL_W - 2}
            height={5}
            rx={2.5}
            className="dg-group-bar dg-kick-fill"
          />
          <text
            x={LABEL_W}
            y={gridBottom + 32}
            textAnchor="start"
            className="dg-small dg-muted"
          >
            强拍：踢（第 1、9 格）
          </text>
          <rect
            x={LABEL_W + 4 * CELL_W}
            y={gridBottom + 8}
            width={CELL_W - 2}
            height={5}
            rx={2.5}
            className="dg-group-bar dg-snare-fill"
          />
          <rect
            x={LABEL_W + 12 * CELL_W}
            y={gridBottom + 8}
            width={CELL_W - 2}
            height={5}
            rx={2.5}
            className="dg-group-bar dg-snare-fill"
          />
          <text
            x={LABEL_W + STEPS * CELL_W}
            y={gridBottom + 32}
            textAnchor="end"
            className="dg-small dg-muted"
          >
            反拍：军鼓 + 拍手（第 5、13 格）
          </text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
