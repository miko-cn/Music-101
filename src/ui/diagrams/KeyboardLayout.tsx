import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";
import {
  BLACK_H,
  BLACK_W,
  WHITE_H,
  blackKeyGroups,
  keyboardGeometry,
} from "./keyboard-geometry.ts";

/**
 * 第 1 关 · 键盘布局。
 *
 * 这一关要教的只有两件事：
 * 1. 黑键永远是「二个一组、三个一组」循环排的；
 * 2. C 在二黑键组左边，F 在三黑键组左边。
 *
 * 这两件事看图一秒就懂，用文字读三遍还是抽象。
 * 所以这张图只画这两件事——键都点了能响，听一遍更牢。
 */
const GEOMETRY = keyboardGeometry(60, 15);
const GROUPS = blackKeyGroups(GEOMETRY.blacks);

const WHITE_TOP = 60;
const BLACK_TOP = WHITE_TOP;
const BAR_Y = WHITE_TOP + WHITE_H + 6;
const LABEL_Y = BAR_Y + 24;

export function KeyboardLayoutDiagram({ caption, onPlay }: DiagramProps & { caption: string }) {
  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox="0 0 660 240"
        role="img"
        aria-label="钢琴键盘布局：黑键两个一组、三个一组循环排列，C 在二黑键组左边，F 在三黑键组左边"
      >
        <title>黑键 2-3 分组与 C、F 的定位点</title>

        {/* 两个定位点：文字在上，键上画个圈，中间连一根线。 */}
        <text x={4} y={22} className="dg-callout dg-gold">
          C4
        </text>
        <text x={4} y={40} className="dg-small dg-muted">
          二黑键组的左边
        </text>
        <line x1={22} y1={44} x2={22} y2={WHITE_TOP} className="dg-leader dg-gold-stroke" />

        <text x={104} y={22} className="dg-callout dg-gold">
          F4
        </text>
        <text x={104} y={40} className="dg-small dg-muted">
          三黑键组的左边
        </text>
        <line x1={154} y1={44} x2={154} y2={WHITE_TOP} className="dg-leader dg-gold-stroke" />

        {/* 白键。 */}
        {GEOMETRY.whites.map((key) => (
          <g
            key={`w${key.midi}`}
            className="dg-hit"
            role="button"
            tabIndex={0}
            aria-label={`${key.name}，点一下听这个音`}
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
              className="dg-key dg-key-white"
            />
            <text x={key.center} y={WHITE_TOP + WHITE_H - 14} className="dg-key-name">
              {key.name}
            </text>
          </g>
        ))}

        {/* 黑键：压在白键上面（跟真实钢琴一样）。 */}
        {GEOMETRY.blacks.map((key) => (
          <g
            key={`b${key.midi}`}
            className="dg-hit"
            role="button"
            tabIndex={0}
            aria-label={`${key.name}，点一下听这个音`}
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
              y={BLACK_TOP}
              width={BLACK_W}
              height={BLACK_H}
              className="dg-key dg-key-black"
            />
          </g>
        ))}

        {/* 定位点标在键上。 */}
        <circle cx={22} cy={WHITE_TOP + 22} r={7} className="dg-marker dg-gold-stroke" />
        <circle cx={154} cy={WHITE_TOP + 22} r={7} className="dg-marker dg-gold-stroke" />

        {/* 每组黑键下面一道金杠：这几个黑键是一组。 */}
        {GROUPS.map((group, index) => (
          <g key={index}>
            <rect
              x={group.from}
              y={BAR_Y}
              width={group.to - group.from}
              height={5}
              rx={2.5}
              className="dg-group-bar"
            />
            <text
              x={(group.from + group.to) / 2}
              y={LABEL_Y}
              textAnchor="middle"
              className="dg-small dg-muted"
            >
              {group.size} 个一组
            </text>
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}
