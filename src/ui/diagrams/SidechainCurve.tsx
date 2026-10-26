import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 12 关 · 侧链泵动。
 *
 * 这一关讲的是一个「看不见的形状」：kick 一响，别的轨的音量被按下去，
 * kick 走了再抬回来。文字描述这个过程，读者要在脑子里画两条曲线。
 *
 * 图上直接画两条：上面是 kick 的冲击，下面是 808 / 贝斯的包络，
 * 每次 kick 的瞬间它凹下去。金色的那层阴影就是被压掉的音量。
 */
const X0 = 100;
const X1 = 620;
const BEAT = (X1 - X0) / 4;
const KICK_BASELINE = 84;
const KICK_PEAK = 46;
const DUCK_BASE = 150;
const DUCK_LOW = 184;
/** 泵动跟着 kick 走：第 1 拍和第 3 拍各一次。 */
const KICKS = [0, 2];

export function SidechainCurveDiagram({ caption, onPump }: DiagramProps & { caption: string }) {
  const duckPath = [
    `M ${X0} ${DUCK_BASE}`,
    ...KICKS.flatMap((beat) => {
      const hit = X0 + beat * BEAT;
      return [`L ${hit + 6} ${DUCK_LOW}`, `L ${hit + 88} ${DUCK_BASE}`];
    }),
    `L ${X1} ${DUCK_BASE}`,
  ].join(" ");

  return (
    <DiagramFrame
      caption={caption}
      actions={
        <>
          <button type="button" className="diagram-action" onClick={() => onPump?.()}>
            ▶ 听泵动
          </button>
          <span className="diagram-action-note">先听一遍，再看图：耳朵记住的就是这个「一推一拉」。</span>
        </>
      }
    >
      <svg
        viewBox="0 0 640 226"
        role="img"
        aria-label="侧链泵动：kick 每响一次，808 和贝斯的音量就被按下去，kick 走了再抬回来"
      >
        <title>侧链泵动的音量包络</title>

        {[0, 1, 2, 3].map((beat) => (
          <g key={beat}>
            <rect
              x={X0 + beat * BEAT}
              y={4}
              width={BEAT}
              height={22}
              rx={4}
              className="dg-beat"
            />
            <text
              x={X0 + beat * BEAT + BEAT / 2}
              y={19}
              textAnchor="middle"
              className="dg-small dg-muted"
            >
              第 {beat + 1} 拍
            </text>
          </g>
        ))}

        {/* 轨道名。 */}
        <text x={86} y={70} textAnchor="end" className="dg-small dg-strong">
          kick
        </text>
        <text x={86} y={142} textAnchor="end" className="dg-small dg-strong">
          808 / 贝斯
        </text>

        {/* kick 的冲击。 */}
        <line
          x1={X0}
          y1={KICK_BASELINE}
          x2={X1}
          y2={KICK_BASELINE}
          className="dg-axis"
        />
        {KICKS.map((beat) => {
          const hit = X0 + beat * BEAT;
          return (
            <path
              key={beat}
              d={`M ${hit} ${KICK_BASELINE} L ${hit + 4} ${KICK_PEAK} L ${hit + 26} ${KICK_BASELINE} Z`}
              className="dg-kick-shape"
            />
          );
        })}

        {/* 没有侧链时的恒定音量（虚线基准）。 */}
        <line
          x1={X0}
          y1={DUCK_BASE}
          x2={X1}
          y2={DUCK_BASE}
          className="dg-ref-line"
        />
        <text x={X1} y={DUCK_BASE - 8} textAnchor="end" className="dg-small dg-muted">
          没有侧链时：一直满音量
        </text>

        {/* 被压掉的那层音量。 */}
        <path d={`${duckPath} L ${X1} ${DUCK_BASE} Z`} className="dg-duck-fill" />
        <path d={duckPath} className="dg-duck-line" />

        {/* kick 的时刻连到包络的凹陷处。 */}
        {KICKS.map((beat) => (
          <line
            key={beat}
            x1={X0 + beat * BEAT + 4}
            y1={KICK_PEAK}
            x2={X0 + beat * BEAT + 6}
            y2={DUCK_LOW}
            className="dg-leader dg-dashed"
          />
        ))}

        {/* 压多深。 */}
        <line
          x1={X0 + 6}
          y1={DUCK_BASE}
          x2={X0 + 6}
          y2={DUCK_LOW}
          className="dg-arrow dg-strong-stroke"
        />
        <text x={X0 + 16} y={212} className="dg-small dg-strong">
          压掉 6–10 dB：只压持续音，不压鼓本身
        </text>
      </svg>
    </DiagramFrame>
  );
}
