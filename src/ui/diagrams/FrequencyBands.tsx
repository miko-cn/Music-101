import type { FrequencyBandsSpec } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 18 关 · 音色角色与频段。
 *
 * 这一关讲的是「分层」：kick、808、贝斯、supersaw 各占一段频率，
 * 挤在一起就糊。图上把频段画成一条对数轴，每个角色一条轨道——
 * 一眼看出谁跟谁挨着、谁离得太远。
 *
 * 频率轴用对数刻度：20Hz 到 20kHz 是三个数量级，
 * 线性画的话低频全挤在左边，什么都看不出来。
 */
const PAD_L = 96;
const PLOT_W = 504;
const LANE_H = 26;
const LANE_GAP = 34;
const LANE_TOP = 62;
const AXIS_Y = 206;

/** 角色 → 配色类。配色是界面的事，内容只说角色名。 */
const ROLE_CLASS: Record<string, string> = {
  kick: "dg-band-kick",
  sub: "dg-band-sub",
  "808": "dg-band-sub",
  bass: "dg-band-bass",
  supersaw: "dg-band-supersaw",
  chop: "dg-band-chop",
};

const TICKS: { hz: number; text: string }[] = [
  { hz: 50, text: "50" },
  { hz: 100, text: "100" },
  { hz: 200, text: "200" },
  { hz: 500, text: "500" },
  { hz: 1000, text: "1k" },
  { hz: 2000, text: "2k" },
  { hz: 5000, text: "5k" },
  { hz: 10000, text: "10k" },
  { hz: 20000, text: "20k" },
];

export function FrequencyBandsDiagram({
  caption,
  spec,
  onPlay,
}: DiagramProps & { caption: string; spec: FrequencyBandsSpec }) {
  const min = spec.axis.min;
  const max = spec.axis.max;
  const span = Math.log10(max) - Math.log10(min);
  const xOf = (hz: number) => {
    const safe = hz <= 0 ? min : hz;
    return PAD_L + ((Math.log10(safe) - Math.log10(min)) / span) * PLOT_W;
  };

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${PAD_L + PLOT_W + 34} ${AXIS_Y + 26}`}
        role="img"
        aria-label="频段分工：每个角色占一段频率，中频 200 到 2000 赫兹是所有人都该让开的地盘"
      >
        <title>各音色角色的频段分工</title>

        {/* 中频危险区：所有人都不该往这儿挤。 */}
        {spec.zone && (
          <g>
            <rect
              x={xOf(spec.zone.from)}
              y={LANE_TOP - 22}
              width={xOf(spec.zone.to) - xOf(spec.zone.from)}
              height={AXIS_Y - LANE_TOP + 22}
              className="dg-danger-zone"
            />
            <text
              x={(xOf(spec.zone.from) + xOf(spec.zone.to)) / 2}
              y={LANE_TOP - 28}
              textAnchor="middle"
              className="dg-small dg-danger"
            >
              {spec.zone.label}
            </text>
          </g>
        )}

        {/* 每个角色一条轨道。 */}
        {spec.bands.map((band, index) => {
          const y = LANE_TOP + index * LANE_GAP;
          const roleClass = ROLE_CLASS[band.role ?? ""] ?? "dg-band-other";
          return (
            <g
              key={band.label}
              className={band.demoMidi === undefined ? undefined : "dg-hit"}
              role={band.demoMidi === undefined ? undefined : "button"}
              tabIndex={band.demoMidi === undefined ? undefined : 0}
              aria-label={
                band.demoMidi === undefined
                  ? undefined
                  : `${band.label}，点一下听这个频段大概在什么音高`
              }
              onClick={() => band.demoMidi !== undefined && onPlay?.([band.demoMidi])}
              onKeyDown={(event) => {
                if (
                  band.demoMidi !== undefined &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  onPlay?.([band.demoMidi]);
                }
              }}
            >
              <text x={PAD_L - 12} y={y + 13} textAnchor="end" className="dg-small dg-label">
                {band.label}
              </text>
              {band.note && (
                <text x={PAD_L - 12} y={y + 27} textAnchor="end" className="dg-tiny dg-muted">
                  {band.note}
                </text>
              )}
              <rect
                x={xOf(band.from)}
                y={y}
                width={Math.max(4, xOf(band.to) - xOf(band.from))}
                height={LANE_H}
                rx={6}
                className={`dg-band ${roleClass}`}
              />
            </g>
          );
        })}

        {/* 频率轴。 */}
        <line x1={PAD_L} y1={AXIS_Y} x2={PAD_L + PLOT_W} y2={AXIS_Y} className="dg-axis" />
        {TICKS.map((tick) => (
          <g key={tick.hz}>
            <line
              x1={xOf(tick.hz)}
              y1={AXIS_Y}
              x2={xOf(tick.hz)}
              y2={AXIS_Y + 5}
              className="dg-axis"
            />
            <text
              x={xOf(tick.hz)}
              y={AXIS_Y + 18}
              textAnchor="middle"
              className="dg-tiny dg-muted"
            >
              {tick.text}
            </text>
          </g>
        ))}
        <text x={PAD_L + PLOT_W + 8} y={AXIS_Y + 18} className="dg-tiny dg-muted">
          Hz
        </text>
      </svg>
    </DiagramFrame>
  );
}
