import type { StageLesson } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 13 关 · 段落与能量曲线。
 *
 * 这一关讲「副歌要抬层」，判定标准是能量 ≥ 主歌 × 1.5，而且层数至少多 1。
 * 文字里「1.5 倍」是个抽象数字，图上把它画成两段高度——
 * 副歌那截明显比主歌高一截，抬没抬起来一眼就看出来。
 *
 * 图直接用关卡自己的 `sections` 渲染：段落改了，图跟着改。
 */
const BAR_W = 52;
const PAD_L = 46;
const BASE_Y = 168;
/** 能量 1.0 对应多少像素。 */
const UNIT = 52;
const RIGHT = PAD_L + 8 * BAR_W + 66;

/** 段落名的中文说法。图上给中文，正文和 MIDI marker 仍用原名。 */
const SECTION_CN: Record<string, string> = {
  Intro: "前奏",
  Verse: "主歌",
  PreChorus: "预副歌",
  Chorus: "副歌",
  Bridge: "桥段",
  Outro: "尾奏",
};

export function EnergyCurveDiagram({
  caption,
  lesson,
}: DiagramProps & { caption: string; lesson: StageLesson }) {
  const sections = lesson.sections ?? [];
  const bars = lesson.totalBars;
  const energyOf = (bar: number): number => {
    const section = sections.find((item) => bar >= item.startBar && bar < item.startBar + item.bars);
    return section?.energy ?? 1;
  };
  const yOf = (energy: number) => BASE_Y - energy * UNIT;

  const stepPath = (() => {
    let d = `M ${PAD_L} ${yOf(energyOf(0))}`;
    for (let bar = 0; bar < bars; bar += 1) {
      const x1 = PAD_L + (bar + 1) * BAR_W;
      d += ` H ${x1}`;
      if (bar + 1 < bars) {
        const next = energyOf(bar + 1);
        if (next !== energyOf(bar)) d += ` V ${yOf(next)}`;
      }
    }
    return d;
  })();

  const fillPath = `${stepPath} L ${PAD_L + bars * BAR_W} ${BASE_Y} L ${PAD_L} ${BASE_Y} Z`;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${RIGHT} 224`}
        role="img"
        aria-label="能量曲线：主歌的能量是 1.0，副歌抬到 1.5，中间的台阶就是抬层"
      >
        <title>段落与能量曲线</title>

        {/* 段落底色。 */}
        {sections.map((section) => (
          <rect
            key={section.name}
            x={PAD_L + section.startBar * BAR_W}
            y={30}
            width={section.bars * BAR_W}
            height={BASE_Y - 30}
            className={section.energy && section.energy > 1 ? "dg-zone dg-zone-chorus" : "dg-zone"}
          />
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

        {/* 主歌的高度：拉一条虚线出去，副歌要比它高 1.5 倍。 */}
        <line
          x1={PAD_L}
          y1={yOf(1)}
          x2={RIGHT - 54}
          y2={yOf(1)}
          className="dg-ref-line"
        />

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

        {/* 每段的能量值。 */}
        {sections.map((section) => (
          <text
            key={`energy-${section.name}`}
            x={PAD_L + (section.startBar + section.bars / 2) * BAR_W}
            y={yOf(section.energy ?? 1) - 12}
            textAnchor="middle"
            className="dg-small dg-strong"
          >
            能量 {(section.energy ?? 1).toFixed(1)}
          </text>
        ))}

        {/* 1.5 倍的尺子。 */}
        <line
          x1={RIGHT - 40}
          y1={yOf(1)}
          x2={RIGHT - 40}
          y2={yOf(1.5)}
          className="dg-arrow dg-strong-stroke"
        />
        <text x={RIGHT - 32} y={yOf(1.25) + 4} className="dg-small dg-strong">
          1.5 倍
        </text>
      </svg>
    </DiagramFrame>
  );
}
