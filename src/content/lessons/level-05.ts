// 第 5 关 · 音阶与调
import { defineLesson, melody, choice } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 5,
  title: "音阶与调",
  stage: "foundation",
  ability: "harmony",
  anchor: {
    id: "circle-of-fifths",
    name: "五度圈",
    hook: "C 在 12 点，顺时针加升号，逆时针加降号。",
    steps: [
      "先记住大调音阶的顺序：W‑W‑H‑W‑W‑W‑H（W 是全音，H 是半音）。",
      "在五度圈上找到 C，摆在 12 点钟。",
      "顺时针每走一格，调号多一个升号（C → G → D → A → E → B）。",
      "逆时针每走一格，调号多一个降号（C → F → B♭ → E♭）。",
      "调号定下来了，剩下的音就是调内音；不在里面的就是调外音。",
    ],
    takeaway: [
      "C 大调 = C D E F G A B，全是白键。",
      "大调音阶的半音全音顺序固定：W‑W‑H‑W‑W‑W‑H（W 全音，H 半音）。",
      "主音 = 调名里那个音 = 第 1 级 = 听起来「回家」的音。",
      "五度圈：C 在 12 点，顺时针升号，逆时针降号。",
      "调内音之外的叫调外音，它不是错，是有意的借用。",
    ],
  },
  concept: [
    "音阶是一串按固定半音/全音顺序排上去的音。C 大调是 C D E F G A B，恰好全是白键，所以 C 大调是最好认的调。",
    "大调音阶的半音全音顺序固定是 W‑W‑H‑W‑W‑W‑H（W 是全音 Whole，H 是半音 Half，从主音数到下一个主音）。这就是为什么 E 到 F、B 到 C 是半音：那两个位置正好落在 H 上。",
    "级数就是位置：主音是第 1 级，往上数到第 7 级。主音 = 调名里那个音 = 听起来「回家」的那个音。",
    "五度圈是这一关的地图：C 在 12 点钟位置，顺时针每走一格多一个升号，逆时针每走一格多一个降号。走到 G 是一个升号，走到 F 是一个降号。",
    "有了调，别的音才有归属。音阶里的七个音叫调内音，之外的叫调外音。调外音不是错误，是有意的借用——下一关之后会讲怎么用。",
    "编曲里的用处：判断一段 MIDI 「在不在调内」靠的就是这个集合。C 大调里出现 F♯ 就说明你要么换了调，要么故意借了音。",
  ],
  earPass: 6,
  ear: [
    {
      id: "major-scale",
      prompt: "哪个是 C 大调音阶？",
      choices: [
        { label: "C D E F G A B", midis: [60, 62, 64, 65, 67, 69, 71] },
        { label: "C D E♭ F G A♭ B♭", midis: [60, 62, 63, 65, 67, 68, 70] },
        { label: "C D E F G A B♭", midis: [60, 62, 64, 65, 67, 69, 70] },
      ],
      correct: 0,
      explain: "全是白键的那条是 C 大调。带 E♭、A♭、B♭ 的是 C 小调；最后 B♭ 那条是 C 和弦七声。",
    },
    {
      id: "outside",
      prompt: "哪个不在 C 大调里？",
      choices: [
        { label: "F♯4", midis: [66] },
        { label: "F4", midis: [65] },
        { label: "G4", midis: [67] },
      ],
      correct: 0,
      explain: "C 大调有 F，没有 F♯。",
    },
    {
      id: "inside",
      prompt: "哪个在 C 大调里？",
      choices: [
        { label: "B4", midis: [71] },
        { label: "B♭4", midis: [70] },
        { label: "A♯4", midis: [70] },
      ],
      correct: 0,
      explain: "B 是 C 大调的第 7 级。B♭ 不是。",
    },
    {
      id: "degree-5",
      prompt: "C 大调的第 5 级是哪个？",
      choices: [
        { label: "G4", midis: [67] },
        { label: "A4", midis: [69] },
        { label: "E4", midis: [64] },
      ],
      correct: 0,
      explain: "C D E F G，数到第 5 个是 G。",
    },
    {
      id: "degree-3",
      prompt: "C 大调的第 3 级是哪个？",
      choices: [
        { label: "E4", midis: [64] },
        { label: "E♭4", midis: [63] },
        { label: "D4", midis: [62] },
      ],
      correct: 0,
      explain: "C D E，第三级是 E。大三度，所以 C 大调的主和弦才是大三和弦。",
    },
    {
      id: "tonic",
      prompt: "C 大调的主音是哪个？",
      choices: [
        { label: "C4", midis: [60] },
        { label: "G4", midis: [67] },
        { label: "F4", midis: [65] },
      ],
      correct: 0,
      explain: "调名里的那个音就是主音。C 大调的主音是 C。",
    },
    {
      id: "third-fourth-gap",
      prompt: "C 大调里第 3 级到第 4 级是几个半音？",
      choices: [
        { label: "1 个", midis: [64, 65] },
        { label: "2 个", midis: [64, 66] },
        { label: "3 个", midis: [64, 67] },
      ],
      correct: 0,
      explain: "E 到 F 是半音。这是 W‑W‑H‑W‑W‑W‑H 里的第一个 H。",
    },
    {
      id: "five-sharps",
      prompt: "五个升号的调是哪个？",
      choices: [
        { label: "B 大调", midis: [71, 75, 78] },
        { label: "G 大调", midis: [67, 71, 74] },
        { label: "D 大调", midis: [62, 66, 69] },
      ],
      correct: 0,
      explain: "五度圈从 C 顺时针：C(0) → G(1) → D(2) → A(3) → E(4) → B(5)。五个升号是 B 大调。",
    },
  ],
  handPrompt: "C 大调里没有哪个音？",
  handChoices: [
    choice("F♯4", melody([66])),
    choice("E4", melody([64])),
    choice("G4", melody([67])),
    choice("B4", melody([71])),
  ],
  handCorrect: 0,
  bpm: 120,
  keyRoot: 0,
  keyScale: "major",
  totalBars: 1,
  marker: "Level5",
  prereq: [3, 4],
  scaleSteps: [
    { name: "C", midi: 60, degree: "1", role: "主音" },
    { name: "D", midi: 62, degree: "2", role: "上主音" },
    { name: "E", midi: 64, degree: "3", role: "中音" },
    { name: "F", midi: 65, degree: "4", role: "下属音" },
    { name: "G", midi: 67, degree: "5", role: "属音" },
    { name: "A", midi: 69, degree: "6", role: "下中音" },
    { name: "B", midi: 71, degree: "7", role: "导音" },
  ],
  diagrams: [
    {
      kind: "scale-degrees",
      caption:
        "一个调 = 键盘上一组固定的键。C 大调就是这七个白键，黑键全被压暗——调外音不是错，是有意的借用。级数就是位置：主音是第 1 级，听起来「回家」的那个音。点键能听出来。",
    },
  ],
});
