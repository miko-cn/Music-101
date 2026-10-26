import type { StageLesson } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 26 关 · 从零编 16 小节。
 *
 * 这一关讲的是「结构」：16 小节不是 16 小节，是四段。
 * 图上就是一条时间轴——每段一个色块，块宽就是它占几小节，
 * 小节号标在下面。段和段的分界一眼就看见了。
 *
 * 段名中英对照放 UI 侧的映射表里：图上给中文，
 * 正文和导出的 MIDI marker 仍用原名（Intro / Verse …）。
 */
const BAR_W = 38;
const PAD_L = 26;
const BLOCK_TOP = 62;
const BLOCK_H = 62;
const RIGHT = PAD_L + 16 * BAR_W + 8;

/** 段落名的中文说法。图上给中文，正文和 MIDI marker 仍用原名。 */
const SECTION_CN: Record<string, string> = {
  Intro: "前奏",
  Verse: "主歌",
  PreChorus: "预副歌",
  Chorus: "副歌",
  Bridge: "桥段",
  Outro: "尾奏",
};

/** 段与段交替配色，让分界更清楚。 */
const SLOT_CLASS = ["dg-slot-a", "dg-slot-b", "dg-slot-c", "dg-slot-d"];

export function SectionTimelineDiagram({
  caption,
  lesson,
}: DiagramProps & { caption: string; lesson: StageLesson }) {
  const sections = lesson.sections ?? [];
  const bars = lesson.totalBars;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${RIGHT} 196`}
        role="img"
        aria-label={`结构时间轴：${sections
          .map((section) => `${section.name} ${section.bars} 小节`)
          .join("，")}`}
      >
        <title>歌曲结构时间轴</title>

        {/* 每个小节一格竖线，分界更清楚。 */}
        {Array.from({ length: bars + 1 }, (_, index) => (
          <line
            key={index}
            x1={PAD_L + index * BAR_W}
            y1={BLOCK_TOP - 6}
            x2={PAD_L + index * BAR_W}
            y2={BLOCK_TOP + BLOCK_H + 6}
            className="dg-axis"
          />
        ))}

        {/* 小节号。 */}
        {Array.from({ length: bars }, (_, index) => (
          <text
            key={index}
            x={PAD_L + index * BAR_W + BAR_W / 2}
            y={BLOCK_TOP + BLOCK_H + 24}
            textAnchor="middle"
            className="dg-tiny dg-muted"
          >
            {index + 1}
          </text>
        ))}

        {/* 段落块。 */}
        {sections.map((section, index) => {
          const x = PAD_L + section.startBar * BAR_W;
          const width = section.bars * BAR_W;
          return (
            <g key={section.name}>
              <rect
                x={x}
                y={BLOCK_TOP}
                width={width}
                height={BLOCK_H}
                rx={8}
                className={SLOT_CLASS[index % SLOT_CLASS.length]}
              />
              <text
                x={x + width / 2}
                y={BLOCK_TOP + 26}
                textAnchor="middle"
                className="dg-column-title"
              >
                {SECTION_CN[section.name] ?? section.name}
              </text>
              <text
                x={x + width / 2}
                y={BLOCK_TOP + 46}
                textAnchor="middle"
                className="dg-tiny dg-muted"
              >
                {section.name}
              </text>
              <text
                x={x + width / 2}
                y={BLOCK_TOP + 60}
                textAnchor="middle"
                className="dg-tiny dg-muted"
              >
                {section.bars} 小节
              </text>
            </g>
          );
        })}

        <text x={PAD_L} y={30} className="dg-small dg-muted">
          一首歌的结构：一段一段接起来，每段占几小节
        </text>
        <text x={PAD_L} y={48} className="dg-tiny dg-muted">
          宽度就是长度——段落的长短不是感觉，是小节数
        </text>
      </svg>
    </DiagramFrame>
  );
}
