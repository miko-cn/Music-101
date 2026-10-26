import type { StageLesson } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 20 关 · 动态（力度）。
 *
 * 这一关讲的是「力度让歌呼吸」：主歌收着，副歌推上去。
 * 图上把 velocity 画成台阶——力度曲线要看得见台阶，不是平滑直线。
 *
 * y 轴是 MIDI 的力度值（0–127），跟能量曲线同一套画法，
 * 但读的是 `sections[].velocity`，标题也换掉——两个指标别混。
 */
const BAR_W = 68;
const PAD_L = 52;
const BASE_Y = 186;
const TOP_Y = 44;
const RIGHT = PAD_L + 8 * BAR_W + 56;

/** 段落名的中文说法。图上给中文，正文和 MIDI marker 仍用原名。 */
const SECTION_CN: Record<string, string> = {
  Intro: "前奏",
  Verse: "主歌",
  PreChorus: "预副歌",
  Chorus: "副歌",
  Bridge: "桥段",
  Outro: "尾奏",
};

export function DynamicCurveDiagram({
  caption,
  lesson,
}: DiagramProps & { caption: string; lesson: StageLesson }) {
  const sections = lesson.sections ?? [];
  const bars = lesson.totalBars;
  const velocityOf = (bar: number): number => {
    const section = sections.find((item) => bar >= item.startBar && bar < item.startBar + item.bars);
    return section?.velocity ?? 90;
  };
  const yOf = (velocity: number) => BASE_Y - (velocity / 127) * (BASE_Y - TOP_Y);

  const stepPath = (() => {
    let d = `M ${PAD_L} ${yOf(velocityOf(0))}`;
    for (let bar = 0; bar < bars; bar += 1) {
      const x1 = PAD_L + (bar + 1) * BAR_W;
      d += ` H ${x1}`;
      if (bar + 1 < bars) {
        const next = velocityOf(bar + 1);
        if (next !== velocityOf(bar)) d += ` V ${yOf(next)}`;
      }
    }
    return d;
  })();

  const fillPath = `${stepPath} L ${PAD_L + bars * BAR_W} ${BASE_Y} L ${PAD_L} ${BASE_Y} Z`;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${RIGHT} 232`}
        role="img"
        aria-label="力度曲线：主歌力度 70，副歌推到 110，中间是一个台阶"
      >
        <title>力度曲线</title>

        {/* 段落底色。 */}
        {sections.map((section) => (
          <rect
            key={section.name}
            x={PAD_L + section.startBar * BAR_W}
            y={TOP_Y - 16}
            width={section.bars * BAR_W}
            height={BASE_Y - TOP_Y + 16}
            className={section.velocity && section.velocity >= 110 ? "dg-zone dg-zone-chorus" : "dg-zone"}
          />
        ))}

        {/* 力度轴：0 到 127。 */}
        <line x1={PAD_L} y1={BASE_Y} x2={RIGHT - 34} y2={BASE_Y} className="dg-axis" />
        <text x={PAD_L - 10} y={BASE_Y + 4} textAnchor="end" className="dg-tiny dg-muted">
          0
        </text>
        <text x={PAD_L - 10} y={TOP_Y - 4} textAnchor="end" className="dg-tiny dg-muted">
          127
        </text>
        <text x={PAD_L - 10} y={TOP_Y + 34} textAnchor="end" className="dg-tiny dg-muted">
          力度
        </text>

        <path d={fillPath} className="dg-energy-fill" />
        <path d={stepPath} className="dg-energy-line" />

        {/* 小节号。 */}
        {Array.from({ length: bars }, (_, index) => (
          <text
            key={index}
            x={PAD_L + index * BAR_W + BAR_W / 2}
            y={BASE_Y + 16}
            textAnchor="middle"
            className="dg-small dg-muted"
          >
            {index + 1}
          </text>
        ))}

        {/* 每段的力度值。 */}
        {sections.map((section) => (
          <text
            key={`velocity-${section.name}`}
            x={PAD_L + (section.startBar + section.bars / 2) * BAR_W}
            y={yOf(section.velocity ?? 90) - 12}
            textAnchor="middle"
            className="dg-small dg-strong"
          >
            力度 {section.velocity ?? 90}
          </text>
        ))}

        {/* 段落名。 */}
        {sections.map((section) => (
          <text
            key={`label-${section.name}`}
            x={PAD_L + (section.startBar + section.bars / 2) * BAR_W}
            y={BASE_Y + 34}
            textAnchor="middle"
            className="dg-small dg-muted"
          >
            {section.name}
            {SECTION_CN[section.name] ? ` ${SECTION_CN[section.name]}` : ""}
          </text>
        ))}
      </svg>
    </DiagramFrame>
  );
}
