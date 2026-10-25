// 第 8 关 · 小调与借用
import { defineLesson, chord, choice } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 8,
  title: "小调与借用",
  stage: "foundation",
  ability: "harmony",
  anchor: {
    id: "major-as-ruler",
    name: "以大调为尺子",
    hook: "小调是拿同名大调当尺子，差半音的级数加 ♭。",
    steps: [
      "先写同名大调（A 小调就看 A 大调）。",
      "自然小调 = 大调的第 3、6、7 级各降半音。",
      "主和弦是小三，记成 i（小写）。",
      "和大调比低半音的级数前面加 ♭：♭III、♭VI、♭VII。",
      "不在自然小调里的级数就是借用；iv 也是常见借用。",
    ],
    takeaway: [
      "A 自然小调 = A B C D E F G = 同名大调降 3、6、7 级。",
      "小调主和弦是小三，记成 i（小写）。",
      "和声小调升第 7 级（G→G♯），为了做出 i→V→i 的解决。",
      "借用和弦：♭III、♭VI、♭VII、iv —— 都不在调内，但特别常用。",
      "i–♭VI–♭III–♭VII = Am→F→C→G，和 vi–IV–I–V 是同一串声音。",
    ],
  },
  mistakeKinds: { 1: "same-progression" },
  fixes: [{ kind: "same-progression", advice: "把借用和弦用上" }],
  concept: [
    "A 自然小调是 A B C D E F G。它的主和弦是小三和弦 Am，记成 i（小写）。",
    "小调和同名大调只差三件事：第 3、6、7 级各降半音。所以学小调最快的办法是拿同名大调当尺子。",
    "用尺子量：相对 A 大调，F 低半音 → ♭VI；C 低半音 → ♭III；G 低半音 → ♭VII。这些和弦不在 A 小调里，但在小调歌里特别常用，叫做借用和弦（modal mixture）。",
    "和声小调把第 7 级升上去（G → G♯），这样才能做出属和弦 Am → E（i → V），有归属感。E7 → Am 是小调里最重要的解决动作。",
    "小调最常见的进行是 i–♭VI–♭III–♭VII = Am → F → C → G，在 C 大调记法里它等价于 vi–IV–I–V——同一串声音，换个调记号就换了情绪。",
    "iv（小调的四级）也是常用暗色色彩：Am 歌里的 Dm，和 iv 一样不在自然小调里，但非常 kawaii。",
    "编曲里的用处：future bass / kawaii bass 大量用 i–♭VI–♭III–♭VII 和 iv 这类「借来的」和弦，因为它们听起来又甜又有点忧，和风格是绝配。",
  ],
  earPass: 6,
  ear: [
    {
      id: "minor-tonic",
      prompt: "A 小调的主和弦是哪个？",
      choices: [
        { label: "A C E", midis: [69, 72, 76] },
        { label: "A C♯ E", midis: [69, 73, 76] },
        { label: "A E G", midis: [69, 76, 79] },
      ],
      correct: 0,
      explain: "小调的主和弦是小三和弦，所以是 A C E，记成 i（小写）。",
    },
    {
      id: "natural-minor",
      prompt: "A 自然小调是哪个？",
      choices: [
        { label: "A B C D E F G", midis: [69, 71, 72, 74, 76, 77, 79] },
        { label: "A B C♯ D E F♯ G", midis: [69, 71, 73, 74, 76, 78, 79] },
        { label: "A B C D E F♯ G", midis: [69, 71, 72, 74, 76, 78, 79] },
      ],
      correct: 0,
      explain: "自然小调 = 同名大调的第 3、6、7 级降半音，所以是 A B C D E F G。",
    },
    {
      id: "minor-i",
      prompt: "A 小调的 i 是？",
      choices: [
        { label: "A C E", midis: [69, 72, 76] },
        { label: "A C♯ E", midis: [69, 73, 76] },
        { label: "A E G", midis: [69, 76, 79] },
      ],
      correct: 0,
      explain: "i 是小写，代表小三和弦。",
    },
    {
      id: "flat-six",
      prompt: "F 大三在 A 小调里记成什么？",
      choices: [
        { label: "♭VI", midis: [65, 69, 72] },
        { label: "VI", midis: [65, 69, 72] },
        { label: "V", midis: [64, 68, 71] },
      ],
      correct: 0,
      explain: "以 A 大调为尺子，F 比第 6 级低半音，记成 ♭VI。它不在 A 小调里，属于借用。",
    },
    {
      id: "flat-seven",
      prompt: "哪个是 ♭VII？",
      choices: [
        { label: "G B D", midis: [67, 71, 74] },
        { label: "F♯ A♯ C♯", midis: [66, 70, 73] },
        { label: "G B♭ D", midis: [67, 70, 74] },
      ],
      correct: 0,
      explain: "A 小调里的 G 大三和弦是 ♭VII。F♯ 是大调的导音，G B♭ 是 G 小和弦，都不是。",
    },
    {
      id: "borrowed-second",
      prompt: "i–♭VI–♭III–♭VII 的第二个和弦是？",
      choices: [
        { label: "F", midis: [65, 69, 72] },
        { label: "C", midis: [60, 64, 67] },
        { label: "G", midis: [67, 71, 74] },
      ],
      correct: 0,
      explain: "第二个是 ♭VI，也就是 F 大三。",
    },
    {
      id: "harmonic-minor",
      prompt: "和声小调相对自然小调改了什么？",
      choices: [
        { label: "第 7 级升高半音", midis: [79, 80] },
        { label: "第 3 级降低半音", midis: [72, 71] },
        { label: "第 6 级降低半音", midis: [77, 76] },
      ],
      correct: 0,
      explain: "自然小调第 7 级是 G，和声小调升成 G♯，这样才能做出属和弦 E，导向 Am。",
    },
    {
      id: "which-iv",
      prompt: "哪个是 A 小调里的 iv？",
      choices: [
        { label: "Dm", midis: [62, 65, 69] },
        { label: "D", midis: [62, 66, 69] },
        { label: "F", midis: [65, 69, 72] },
      ],
      correct: 0,
      explain: "第 4 级是 D，三和弦是小三，记成 iv。它不在自然小调里，但非常常用。",
    },
  ],
  handPrompt: "选出 A 小调里这条借用进行。",
  handChoices: [
    choice(
      "Am → F → C → G",
      [],
      [
        chord(0, [57, 60, 64], "Am (i)"),
        chord(1, [53, 57, 60], "F (♭VI)"),
        chord(2, [48, 52, 55], "C (♭III)"),
        chord(3, [55, 59, 62], "G (♭VII)"),
      ],
    ),
    choice(
      "Am → Dm → E → Am",
      [],
      [
        chord(0, [57, 60, 64], "Am (i)"),
        chord(1, [50, 53, 57], "Dm (iv)"),
        chord(2, [52, 56, 59], "E (V)"),
        chord(3, [57, 60, 64], "Am (i)"),
      ],
    ),
    choice(
      "A → F♯ → C → G",
      [],
      [
        chord(0, [57, 61, 64], "A (I)"),
        chord(1, [54, 58, 61], "F#"),
        chord(2, [48, 52, 55], "C"),
        chord(3, [55, 59, 62], "G"),
      ],
    ),
    choice(
      "Am → G → F → E",
      [],
      [
        chord(0, [57, 60, 64], "Am (i)"),
        chord(1, [55, 59, 62], "G (♭VII)"),
        chord(2, [53, 57, 60], "F (♭VI)"),
        chord(3, [52, 56, 59], "E (V)"),
      ],
    ),
  ],
  handCorrect: 0,
  bpm: 120,
  keyRoot: 9,
  keyScale: "naturalMinor",
  totalBars: 4,
  marker: "Level8",
  prereq: [5, 7],
});
