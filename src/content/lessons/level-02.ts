// 第 2 关 · 半音与全音
import { defineLesson, melody, choice } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 2,
  title: "半音与全音",
  stage: "foundation",
  ability: "harmony",
  anchor: {
    id: "adjacent-key",
    name: "相邻键法",
    hook: "半音是隔壁，全音隔一个。",
    steps: [
      "在键盘上找到两个音的位置，别去数黑键。",
      "挨着没有键隔开 → 半音。中间夹一个键 → 全音。",
      "两个例外要记牢：E–F、B–C 没有黑键夹着，所以是半音。",
      "全音永远是半音的两倍：向上一个全音就是走两步。",
    ],
    takeaway: [
      "半音 = 键盘上相邻的两个键；全音 = 相邻两个半音。",
      "E–F 和 B–C 是唯二的天然半音，因为那里没有黑键。",
      "升降号就是半音，所以调外音的本质是「挪半音」。",
    ],
  },
  concept: [
    "半音就是键盘上挨着的两个键，一个黑键一个白键，只差一步。全音是两个半音，中间夹着一个键。",
    "整台钢琴只有两处例外：E 和 F 挨着、B 和 C 挨着，中间没有黑键，所以它们天生是半音。其余每一对白键之间都夹着一个黑键，是全音。",
    "这条例外很重要，因为它解释了为什么 C 大调音阶里 E 到 F 是半音、B 到 C 也是半音——那两个位置正好是例外。",
    "记的时候不要去数黑键。直接看键盘：目标音在哪，先找到它，再看中间隔了几个键。",
    "编曲里的用处：调外音最省事的写法就是升降号，而升降号就是半音。你想给一个和弦加一点张力，通常就是把某个音升或降半音。",
  ],
  earPass: 6,
  ear: [
    {
      id: "semi-or-whole",
      prompt: "哪一对是半音？",
      choices: [
        { label: "C4 → C♯4", midis: [60, 61] },
        { label: "C4 → D4", midis: [60, 62] },
        { label: "E4 → F4", midis: [64, 65] },
      ],
      correct: 0,
      explain: "C 到 C♯ 只隔一个键。C 到 D 隔了一个黑键，是全音。",
    },
    {
      id: "whole-ef",
      prompt: "哪一对是全音？",
      choices: [
        { label: "E4 → F♯4", midis: [64, 66] },
        { label: "E4 → F4", midis: [64, 65] },
        { label: "B4 → C5", midis: [71, 72] },
      ],
      correct: 0,
      explain: "E 到 F 是半音。再高一个半音到 F♯，才是全音。B 到 C 同样是半音。",
    },
    {
      id: "semi-bc",
      prompt: "哪一对是半音？",
      choices: [
        { label: "B4 → C5", midis: [71, 72] },
        { label: "A4 → B4", midis: [69, 71] },
        { label: "F4 → G4", midis: [65, 67] },
      ],
      correct: 0,
      explain: "B 和 C 之间没有黑键，是半音。A 到 B、F 到 G 都隔着黑键，是全音。",
    },
    {
      id: "whole-fg",
      prompt: "哪一对是全音？",
      choices: [
        { label: "F4 → G4", midis: [65, 67] },
        { label: "F4 → F♯4", midis: [65, 66] },
        { label: "E4 → F4", midis: [64, 65] },
      ],
      correct: 0,
      explain: "F 到 G 跨过 F♯，是全音。F 到 F♯ 只是半音；E 到 F 也是半音。",
    },
    {
      id: "narrower",
      prompt: "哪一对更窄？",
      choices: [
        { label: "C4 → C♯4", midis: [60, 61] },
        { label: "C4 → D4", midis: [60, 62] },
        { label: "C4 → E4", midis: [60, 64] },
      ],
      correct: 0,
      explain: "半音比全音窄。更窄的是 C 到 C♯。",
    },
    {
      id: "ef-count",
      prompt: "E4 到 F4 是几个半音？",
      choices: [
        { label: "1 个", midis: [64, 65] },
        { label: "2 个", midis: [64, 66] },
        { label: "3 个", midis: [64, 67] },
      ],
      correct: 0,
      explain: "E 到 F 挨着，是 1 个半音。它们中间没有黑键。",
    },
    {
      id: "cd-count",
      prompt: "C4 到 D4 是几个半音？",
      choices: [
        { label: "1 个", midis: [60, 61] },
        { label: "2 个", midis: [60, 62] },
        { label: "4 个", midis: [60, 64] },
      ],
      correct: 1,
      explain: "C 到 C♯ 一步，C♯ 到 D 再一步，一共 2 个半音。",
    },
    {
      id: "up-whole",
      prompt: "从 C4 往上走一个全音到哪？",
      choices: [
        { label: "D4", midis: [60, 62] },
        { label: "C♯4", midis: [60, 61] },
        { label: "E4", midis: [60, 64] },
      ],
      correct: 0,
      explain: "一个全音 = 两个半音。C 往上两步：C♯ 是 1 步，D 是 2 步。",
    },
  ],
  handPrompt: "下面哪一对是全音？",
  handChoices: [
    choice("C4 → C♯4", melody([60, 61])),
    choice("C4 → D4", melody([60, 62])),
    choice("E4 → F4", melody([64, 65])),
    choice("B4 → C5", melody([71, 72])),
  ],
  handCorrect: 1,
  bpm: 120,
  keyRoot: 0,
  keyScale: "major",
  totalBars: 1,
  marker: "Level2",
  prereq: [1],
});
