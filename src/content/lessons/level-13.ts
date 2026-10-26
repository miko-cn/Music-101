// 第 13 关 · 段落与能量曲线
import { defineLesson, notesAt, track, choice, ear } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 13,
  title: "段落与能量曲线",
  stage: "arrangement",
  ability: "structure",
  anchor: {
    id: "one-point-five-and-one",
    name: "1.5 倍 + 1 层",
    hook: "抬层要同时满足：能量 1.5 倍，层数多 1。",
    steps: [
      "先把段落标出来：主歌 / 副歌各占几小节。",
      "能量 = 层数 × 音区权重 × 平均力度。",
      "音区权重：最低音 < 60 记 1.0，60–79 记 0.6，≥ 80 记 0.4。",
      "副歌平均能量 ≥ 主歌 × 1.5，且副歌层数 ≥ 主歌层数 + 1。",
    ],
    takeaway: [
      "先标段落，再比能量。",
      "能量 = 层数 × 音区权重 × 平均力度。",
      "越低的声音权重越大（< 60 记 1.0）。",
      "抬层两条同时成立才算：1.5 倍能量 + 多 1 层。",
    ],
  },
  mistakeKinds: { 1: "chorus-flat" },
  fixes: [{ kind: "chorus-flat", advice: "看能量曲线" }],
  marker: "Level13",
  totalBars: 8,
  showEnergy: true,
  prereq: [12],
  sections: [
    { name: "Verse", startBar: 0, bars: 4, energy: 1 },
    { name: "Chorus", startBar: 4, bars: 4, energy: 1.5 },
  ],
  concept: [
    "主歌和副歌要标出来。能量按「层数 × 音区权重 × 平均力度」算。",
    "副歌抬层要同时满足两件：平均能量至少是主歌的 1.5 倍，而且平均层数至少多 1。",
    "为什么是 1.5 倍而不是「高一点」：耳朵对整体响度的感知是对数的，小幅提升在混音里会被自动响度处理吃掉。1.5 倍是刚好能被听成「换了一段」的下限。",
    "音区权重这一项常被忽略：低频权重高（最低音 < 60 记 1.0），所以「加一条低频」比「加一条高音」对能量的贡献更大。这解释了为什么副歌加 808 常常比加 hat 更有效——但那是另一种思路，本关教的是算得准。",
    "实际用法：编完先看能量曲线是不是有台阶。如果副歌那四小节是平的，说明抬层没做到，或者抬的层太轻。",
  ],
  ear: [
    ear("names", "哪两个段落是拿来比能量的？", "主歌和副歌", "前奏和尾奏", "抬层看的是副歌相对主歌。", [60], [60], { label: "第一小节和最后一小节", midis: [60] }),
    ear("ratio", "副歌能量至少要到主歌的几倍？", "1.5 倍", "一样就行", "只高一点点不算抬起来。", [60], [60], { label: "3 倍", midis: [60] }),
    ear("layers", "除了能量，层数还要怎样？", "至少多 1 层", "可以更少", "两条都要满足。", [60], [60], { label: "必须多 3 层", midis: [60] }),
    ear("weight", "最低音在 MIDI 60 以下，音区权重是？", "1.0", "0.4", "越低的音，能量权重越大。", [48], [72], { label: "0.6", midis: [60] }),
    ear("marker", "段落写进 MIDI 的哪里？", "Marker", "和弦 meta 事件", "首版只写 Marker，不写和弦 meta。", [60], [60], { label: "tempo 事件", midis: [60] }),
    ear("weight-80", "MIDI 80 的音，音区权重是多少？", "0.4", "0.6", "80 已经进入中高位区，权重降到 0.4。", [80], [60], { label: "1.0", midis: [48] }),
  ],
  handPrompt: "选出副歌真的抬起来的编配。",
  handChoices: [
    choice("副歌多一条 supersaw", [], [], [
      track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80)),
      track("SUPERSAW", 2, notesAt([4, 5, 6, 7], 72, 100)),
    ]),
    choice("主歌副歌都只有贝斯", [], [], [track("BASS", 0, notesAt([0, 1, 2, 3, 4, 5, 6, 7], 48, 80))]),
  ],
  handCorrect: 0,
  diagrams: [
    {
      kind: "energy-curve",
      caption:
        "副歌那一截要明显高过主歌：能量至少 1.5 倍，而且层数至少多 1 层——两条同时成立才算抬层。曲线是平的，说明这一段没抬起来。",
    },
  ],
});
