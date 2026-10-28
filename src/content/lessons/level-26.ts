// 第 26 关 · 从零编 16 小节
import { defineLesson, notesAt, kicks, loopChords, track, choice, ear, BAR } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

const CHORUS_BARS = [8, 9, 10, 11, 12, 13, 14, 15];
const ALL_BARS = Array.from({ length: 16 }, (_, index) => index);

function bed() {
  return [
    track("KICK", 9, kicks(16)),
    track("808", 0, notesAt(ALL_BARS, 36, 96, BAR - 20)),
  ];
}

function liftedPad() {
  return track("SUPERSAW", 2, notesAt(CHORUS_BARS, 72, 114));
}

export const lesson: StageLessonEntry = defineLesson({
  id: 26,
  title: "从零编 16 小节",
  stage: "style",
  ability: "structure",
  anchor: {
    id: "four-four-eight",
    name: "16 小节 = 4 + 4 + 8",
    hook: "前奏 4、主歌 4、副歌 8，副歌多一层和弦。",
    steps: [
      "先定段落：Intro 4 小节 / Verse 4 小节 / Chorus 8 小节。",
      "和声选一条教过的：I–V–vi–IV 或 i–♭VI–♭III–♭VII。",
      "色彩选三和弦、add9 或 maj7，音要留在调内。",
      "副歌加一层，能量到 1.5 倍；最后收在 T。",
    ],
    takeaway: [
      "结构 = 4 + 4 + 8。",
      "和声用 I–V–vi–IV 或 i–♭VI–♭III–♭VII。",
      "色彩：三和弦 / add9 / maj7，都要在调内。",
      "副歌多一层且能量 1.5 倍，结尾落在 T。",
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
    "16 小节够放前奏、主歌和副歌。前奏 4，主歌 4，副歌 8。和声用已经练过的两条：I–V–vi–IV，或它的小调姐妹 i–♭VI–♭III–♭VII。",
    "色彩可以叠三和弦、add9 或 maj7，但音必须留在调内。副歌比主歌多一层和弦，踢和 808 从头把根音和拍子接住。最后要落在 T，才算收完。",
    "为什么副歌给 8 小节而不是 4：副歌是记忆点，需要够长让听众记住。4 小节的副歌刚起势就结束了，没有落点。",
    "前奏的 4 小节不是白给的：它给听众一个「进副歌之前先别走」的悬念，同时让 kick 和 808 的节奏先建立起来。前奏里放的和声通常是主歌和声的预演。",
    "编完 16 小节后要做四件事：听一遍能量曲线有没有台阶 → 检查所有和弦在不在调内 → 确认副歌比主歌多一条轨 → 最后一小节落在 T。这四条过了，这首歌的骨架就成立了。",
  ],
  ear: [
    ear("length", "这一关的长度是？", "16 小节", "1 小节", "要够放前奏、主歌、副歌。", [36], [36, 36, 36, 36], { label: "4 小节", midis: [36, 36] }, { wrongHint: "先看这一关要装下哪几段，再数每段各要几小节，加起来是多少。", encourage: "对，16 小节够放下前奏、主歌和副歌。" }),
    ear("intro", "前奏占几小节？", "4", "16", "前 4 小节是 Intro。", [36, 36], [36, 36, 36, 36, 36, 36], { label: "8", midis: [36, 36, 36, 36] }, { wrongHint: "把总长度按前奏、主歌、副歌三段切开，看第一段留了多少小节。", encourage: "对，前奏占 4 小节，给听众一个进副歌前的悬念。" }),
    ear("chorus-len", "副歌从第 9 小节开始，占几小节？", "8", "2", "后一半留给副歌。", [36, 36, 36, 36], [36], { label: "16", midis: [36, 36, 36, 36, 36, 36] }, { wrongHint: "用总长度减去副歌开始的位置，剩下的那段就是它的长度。", encourage: "对，副歌占 8 小节，才够让听众记住这个记忆点。" }),
    ear("harmony", "循环可以用哪条？", "I–V–vi–IV 或小调姐妹", "随便四个调外和弦", "用已经练过的那两条进行。", [60, 67, 69, 65], [60, 66, 69, 65], { label: "只有 I 和 V", midis: [60, 67] }, { wrongHint: "先定主和弦，再看它是大调骨架还是小调那条姐妹进行。", encourage: "对，两条教过的循环都能用。" }),
    ear("lift", "副歌相对主歌？", "多一层和弦", "把踢删掉", "抬的是和弦层，不是拆掉节奏。", [36, 48, 72], [36], { label: "把 808 删掉", midis: [36, 36] }, { wrongHint: "对比主歌和副歌的和弦层，看副歌那层是多了还是被换掉了。", encourage: "对，副歌多一层和弦，踢和 808 不动。" }),
    ear("cadence", "16 小节最后要落在哪？", "T（I / i / vi）", "停在 V 上", "收尾要回到主功能。", [60], [67], { label: "停在 IV 上", midis: [65] }, { wrongHint: "看最后那个和弦想不想回家：能停稳的才是 T。", encourage: "对，最后落在 T，这首骨架才收得住。" }),
  ],
  handPrompt: "选出结构、和声、色彩和副歌层都对的 16 小节。",
  handChoices: [
    choice("4+4+8 · I–V–vi–IV · 三和弦 · 副歌加层 · 收在 I", [], loopChords(16, { cadenceT: true }), [
      ...bed(),
      liftedPad(),
    ]),
    choice("4+4+8 · I–V–vi–IV · 三和弦 · 副歌没加层", [], loopChords(16, { cadenceT: true }), bed()),
    choice("4+4+8 · i–♭VI–♭III–♭VII · add9 · 副歌加层 · 收在 i", [], loopChords(16, {
      progression: "i-bVI-bIII-bVII",
      color: "add9",
      cadenceT: true,
    }), [
      ...bed(),
      liftedPad(),
    ]),
    choice("16 小节调外和弦", [], loopChords(16).map((item, index) =>
      index === 1 || index === 15 ? { ...item, pitches: [66, 70, 73], text: "F#" } : item,
    ), [
      ...bed(),
      liftedPad(),
    ]),
    choice("4+4+8 · I–V–vi–IV · maj7 · 副歌加层 · 收在 I", [], loopChords(16, { color: "maj7", cadenceT: true }), [
      ...bed(),
      liftedPad(),
    ]),
    choice("4+4+8 · I–V–vi–IV · 三和弦 · 副歌加层 · 停在 IV", [], loopChords(16), [
      ...bed(),
      liftedPad(),
    ]),
  ],
  handCorrect: 0,
  diagrams: [
    {
      kind: "section-timeline",
      caption:
        "16 小节不是 16 小节，是三段：前奏 4 + 主歌 4 + 副歌 8。段落的长短是小节数，不是感觉——副歌给 8 小节才够记住，4 小节刚起势就结束。",
    },
  ],
});
