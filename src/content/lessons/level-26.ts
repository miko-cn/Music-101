// 第 26 关 · 从零编 16 小节
import { defineLesson, notesAt, kicks, loopChords, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 26,
  title: "从零编 16 小节",
  stage: "style",
  ability: "structure",
  anchor: {
    id: "four-four-eight",
    name: "16 小节 = 4 + 4 + 8",
    hook: "前奏 4、主歌 4、副歌 8，副歌多一条 supersaw。",
    steps: [
      "先定段落：Intro 4 小节 / Verse 4 小节 / Chorus 8 小节。",
      "和声循环 I–V–vi–IV，用已经练过的那条。",
      "kick 和 808 从头接住根音和拍子。",
      "副歌加 supersaw 层，别的都不动。",
    ],
    takeaway: [
      "结构 = 4 + 4 + 8。",
      "和声用练过的 I–V–vi–IV。",
      "副歌多 supersaw，kick / 808 不动。",
      "这是能听完的最小骨架。",
    ],
  },
  mistakeKinds: { 1: "chorus-flat" },
  marker: "Level26",
  totalBars: 16,
  bpm: 150,
  prereq: [25, 22],
  sections: [
    { name: "Intro", startBar: 0, bars: 4 },
    { name: "Verse", startBar: 4, bars: 4 },
    { name: "Chorus", startBar: 8, bars: 8 },
  ],
  concept: [
    "16 小节够放前奏、主歌和副歌。前奏 4，主歌 4，副歌 8。和声可以循环 I–V–vi–IV。",
    "副歌比主歌多 supersaw 这一层，踢和 808 从头把根音和拍子接住。这就是一首能听完的最小骨架。",
    "为什么副歌给 8 小节而不是 4：副歌是记忆点，需要够长让听众记住。4 小节的副歌刚起势就结束了，没有落点。",
    "前奏的 4 小节不是白给的：它给听众一个「进副歌之前先别走」的悬念，同时让 kick 和 808 的节奏先建立起来。前奏里放的和声通常是主歌和声的预演。",
    "编完 16 小节后要做三件事：听一遍能量曲线有没有台阶 → 检查所有和弦在不在调内 → 确认副歌比主歌多一条轨。这三条过了，这首歌的骨架就成立了，剩下的都是 Cubase 里的活。",
  ],
  ear: [
    ear("length", "这一关的长度是？", "16 小节", "1 小节", "要够放前奏、主歌、副歌。", [36], [36], { label: "4 小节", midis: [36] }),
    ear("intro", "前奏占几小节？", "4", "16", "前 4 小节是 Intro。", [36], [36], { label: "8", midis: [36] }),
    ear("chorus-len", "副歌从第 9 小节开始，占几小节？", "8", "2", "后一半留给副歌。", [36], [36], { label: "16", midis: [36] }),
    ear("harmony", "循环的进行是？", "I–V–vi–IV", "随便四个调外和弦", "用已经练过的那条进行。", [60, 67, 69, 65], [60, 66, 69, 65], { label: "只有 I 和 V", midis: [60, 67] }),
    ear("lift", "副歌相对主歌？", "多 supersaw", "把踢删掉", "抬的是和弦层，不是拆掉节奏。", [72], [36], { label: "把 808 删掉", midis: [36] }),
    ear("808-job", "这首 16 小节里 808 的作用是？", "接住根音", "提供高频", "808 管低频根音，高频交给 supersaw。", [36], [72], { label: "代替 supersaw", midis: [72] }),
  ],
  handPrompt: "选出结构完整的 16 小节。",
  handChoices: [
    choice("前奏、主歌、抬起来的副歌", [], loopChords(16), [
      track("KICK", 9, kicks(16)),
      track("808", 0, notesAt(Array.from({ length: 16 }, (_, index) => index), 36, 96, BAR - 20)),
      track("SUPERSAW", 2, notesAt([8, 9, 10, 11, 12, 13, 14, 15], 72, 90)),
    ]),
    choice("16 小节但副歌没有新层", [], loopChords(16), [
      track("KICK", 9, kicks(16)),
      track("808", 0, notesAt(Array.from({ length: 16 }, (_, index) => index), 36, 96, BAR - 20)),
    ]),
  ],
  handCorrect: 0,
});
