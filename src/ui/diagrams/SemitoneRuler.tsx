import { midiToNoteName } from "../../core/theory/pitch.ts";
import { toNotationName } from "../../core/theory/notation.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";
import { BLACK_H, BLACK_W, WHITE_H, WHITE_W, keyboardGeometry } from "./keyboard-geometry.ts";

/**
 * 第 2 关 · 半音与全音。
 *
 * 这一关的核心是「例外」：整台钢琴只有 E–F 和 B–C 两处没有黑键，
 * 所以它们天生是半音。这句话读起来像绕口令，画出来一目了然：
 * 两个空档一眼就看见了。
 *
 * 右边那半块画的是「键距就是音的距离」——半音是 1 个键宽（E 到 F），
 * 全音是 2 个键宽（C 到 D），两把尺子用的是上面那排键同一个刻度。
 *
 * 宽度定成 660，跟键盘图（第 1 关）一样：viewBox 越窄，图被容器撑开得
 * 越狠，字就越大——八张图摆在同一个页面里，字号必须是一套的。
 */
const GEOMETRY = keyboardGeometry(60, 8);

/** 相邻两个音之间的半音数。E–F 和 B–C 是 1，其余是 2。 */
const HALF_STEPS = [2, 2, 1, 2, 2, 2, 1];

const CHIP_TOP = 30;
const CHIP_H = 26;
/** 胶囊比一个白键略窄，不然相邻两个会连成一条。 */
const CHIP_W = 40;
const WHITE_TOP = 88;

/** 右边对照区。 */
const PANEL_X = 384;

export function SemitoneRulerDiagram({ caption, onPlay }: DiagramProps & { caption: string }) {
  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox="0 0 660 240"
        role="img"
        aria-label="C 大调一个八度：E 到 F、B 到 C 是半音，其余相邻两音都是全音；半音等于 1 个键宽，全音等于 2 个键宽"
      >
        <title>C 大调音阶上的半音与全音</title>

        <text x={0} y={16} className="dg-small dg-muted">
          整台钢琴只有两处没有黑键：E–F 和 B–C
        </text>

        {/* 每两个音之间一个标签：半音 / 全音。 */}
        {HALF_STEPS.map((steps, index) => {
          const center = (index + 1) * WHITE_W;
          const half = steps === 1;
          return (
            <g key={index}>
              <rect
                x={center - CHIP_W / 2}
                y={CHIP_TOP}
                width={CHIP_W}
                height={CHIP_H}
                rx={CHIP_H / 2}
                className={half ? "dg-chip dg-chip-gold" : "dg-chip"}
              />
              <text
                x={center}
                y={CHIP_TOP + CHIP_H / 2 + 4}
                textAnchor="middle"
                className={half ? "dg-chip-text dg-gold" : "dg-chip-text"}
              >
                {half ? "半音" : "全音"}
              </text>
            </g>
          );
        })}

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
            <text x={key.center} y={WHITE_TOP + WHITE_H - 12} className="dg-key-name">
              {toNotationName(midiToNoteName(key.midi))}
            </text>
          </g>
        ))}

        {/* 黑键。E–F 和 B–C 之间没有黑键——空档就是这两个半音。 */}
        {GEOMETRY.blacks.map((key) => (
          <rect
            key={`b${key.midi}`}
            x={key.x}
            y={WHITE_TOP}
            width={BLACK_W}
            height={BLACK_H}
            className="dg-key dg-key-black"
          />
        ))}

        {/* 两个半音的落点：金色箭头压在键缝上。 */}
        {HALF_STEPS.map((steps, index) =>
          steps === 1 ? (
            <path
              key={index}
              d={`M ${(index + 1) * WHITE_W - 7} ${WHITE_TOP + WHITE_H - 4}
                  L ${(index + 1) * WHITE_W + 7} ${WHITE_TOP + WHITE_H - 4}
                  L ${(index + 1) * WHITE_W} ${WHITE_TOP + WHITE_H + 8} Z`}
              className="dg-half-mark"
            />
          ) : null,
        )}

        {/* —— 右边：键距就是音的距离。两把尺子跟左边键盘同一个刻度。 —— */}
        <g>
          <line
            x1={PANEL_X}
            y1={30}
            x2={PANEL_X}
            y2={WHITE_TOP + WHITE_H}
            className="dg-axis"
          />
          <text x={PANEL_X + 16} y={44} className="dg-label">
            键距 = 音的距离
          </text>

          {/* 半音：E 到 F，1 个键宽。 */}
          <text x={PANEL_X + 16} y={96} className="dg-small dg-gold">
            E → F
          </text>
          <g className="dg-ruler">
            <line x1={PANEL_X + 16} y1={108} x2={PANEL_X + 16 + WHITE_W} y2={108} />
            <line x1={PANEL_X + 16} y1={102} x2={PANEL_X + 16} y2={114} />
            <line x1={PANEL_X + 16 + WHITE_W} y1={102} x2={PANEL_X + 16 + WHITE_W} y2={114} />
          </g>
          <text x={PANEL_X + 16} y={134} className="dg-small dg-muted">
            半音 = 1 个键宽
          </text>

          {/* 全音：C 到 D，2 个键宽。 */}
          <text x={PANEL_X + 16} y={172} className="dg-small dg-gold">
            C → D
          </text>
          <g className="dg-ruler">
            <line x1={PANEL_X + 16} y1={184} x2={PANEL_X + 16 + WHITE_W * 2} y2={184} />
            <line x1={PANEL_X + 16} y1={178} x2={PANEL_X + 16} y2={190} />
            <line
              x1={PANEL_X + 16 + WHITE_W * 2}
              y1={178}
              x2={PANEL_X + 16 + WHITE_W * 2}
              y2={190}
            />
          </g>
          <text x={PANEL_X + 16} y={210} className="dg-small dg-muted">
            全音 = 2 个键宽
          </text>

          <text x={PANEL_X + 16} y={232} className="dg-tiny dg-muted">
            尺子跟左边键盘同一个刻度
          </text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
