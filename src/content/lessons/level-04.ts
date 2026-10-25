// 第 4 关 · 大三和弦与小三和弦
import { defineLesson, chord, choice } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 4,
  title: "大三和弦与小三和弦",
  stage: "foundation",
  ability: "harmony",
  anchor: {
    id: "stack-thirds",
    name: "三度堆叠法",
    hook: "和弦是三度叠起来的，性质只看中间那个音。",
    steps: [
      "从根音开始，每往上隔一个音叠一层：三音、五音。",
      "先定大小：看三音是几度——大三度就是大和弦，小三度就是小和弦。",
      "五音不用管：在自然小调里它永远是纯五度。",
      "想换情绪就动三音：降半音变暗（C E G → C E♭ G）；要更拧巴就升五音（C E G → C E G♯）。",
    ],
    takeaway: [
      "三和弦 = 根音 + 三音 + 五音，是按三度叠出来的。",
      "大/小只由三音决定，五音在自然小调里永远是纯五度。",
      "记号：大写 = 大三（C），小写 = 小三（cm），加 ° = 减（C°）。",
      "同根音换性质（加 m）是最快的情绪切换。",
      "升五音得到增和弦（C E G♯），听上去拧巴，不是亮。",
    ],
  },
  concept: [
    "和弦是几个音按三度叠起来的。三和弦叠三层：根音、三音、五音。C 往上叠：C 是根音，E 是三音，G 是五音。",
    "性质只看三音。三音是大三度 → 大三和弦；是小三度 → 小三和弦。五音在自然小调里永远是纯五度，不用操心。",
    "所以大三 C E G、小三 C E♭ G 的区别只有中间那个音：三音降了半音，整和弦就变暗。这一个音就是和弦的情绪开关。",
    "性质还能往别的方向变：升五音。大三 C E G 把五音 G 升成 G♯，就变成 C E G♯——三度没动，五度从纯五度变成大三度，三和弦成了增和弦（听上去拧巴）。这说明和弦性质完全由内部音程决定。",
    "大小写记号：大写字母表示大三和弦（C），小写字母表示小三和弦（cm），后面加 ° 是减和弦（C°，也常写成 co）。",
    "编曲里的用处：调内进行要想「明亮」就用大三和弦，想要「忧柔」就换成同根音的小三和弦——同根音换性质是最省事也最有效的情绪切换。",
  ],
  earPass: 6,
  ear: [
    {
      id: "which-major",
      prompt: "哪个是大三和弦？",
      choices: [
        { label: "C E G", midis: [60, 64, 67] },
        { label: "C E♭ G", midis: [60, 63, 67] },
        { label: "C F G", midis: [60, 65, 67] },
      ],
      correct: 0,
      explain: "C 到 E 是大三度，所以是大三和弦。C 到 E♭ 是小三度，C 到 F 是纯四度，都不是。",
    },
    {
      id: "which-minor",
      prompt: "哪个是小三和弦？",
      choices: [
        { label: "F A♭ C", midis: [65, 68, 72] },
        { label: "F A C", midis: [65, 69, 72] },
        { label: "F B♭ C", midis: [65, 70, 72] },
      ],
      correct: 0,
      explain: "F 到 A♭ 是小三度，所以是小三和弦。",
    },
    {
      id: "major-third",
      prompt: "C 大三和弦的三音是？",
      choices: [
        { label: "E", midis: [60, 64] },
        { label: "E♭", midis: [60, 63] },
        { label: "G", midis: [60, 67] },
      ],
      correct: 0,
      explain: "三音是夹在根音和五音中间那个：C → E → G，E 是三音。",
    },
    {
      id: "minor-third",
      prompt: "Cm 的三音是？",
      choices: [
        { label: "C", midis: [60, 60] },
        { label: "E♭", midis: [60, 63] },
        { label: "G", midis: [60, 67] },
      ],
      correct: 1,
      explain: "Cm 是 C E♭ G。根音 C，五音 G，三音就是 E♭。",
    },
    {
      id: "a-minor",
      prompt: "哪个是 A 小三和弦？",
      choices: [
        { label: "A C E", midis: [69, 72, 76] },
        { label: "A C♯ E", midis: [69, 73, 76] },
        { label: "A D E", midis: [69, 74, 76] },
      ],
      correct: 0,
      explain: "A 到 C 是小三度，所以是 A 小三和弦。A C♯ E 是大三和弦。",
    },
    {
      id: "which-note-differs",
      prompt: "大三和小三差在哪个音上？",
      choices: [
        { label: "三音", midis: [63, 64] },
        { label: "根音", midis: [60, 60] },
        { label: "五音", midis: [67, 67] },
      ],
      correct: 0,
      explain: "根音和五音一样，只有中间那个三音差半音。",
    },
    {
      id: "brighter",
      prompt: "哪个更亮？",
      choices: [
        { label: "C E G", midis: [60, 64, 67] },
        { label: "C E♭ G", midis: [60, 63, 67] },
        { label: "C E G♯", midis: [60, 64, 68] },
      ],
      correct: 0,
      explain: "大三和弦比小三和弦亮。C E♭ G 把三音降了半音，所以暗；C E G♯ 是增和弦，拧巴、有张力，不是亮。",
    },
    {
      id: "eb-major",
      prompt: "哪个是 E♭ 大三和弦？",
      choices: [
        { label: "E♭ G B♭", midis: [63, 67, 70] },
        { label: "E♭ G♭ B♭", midis: [63, 66, 70] },
        { label: "E♭ G B", midis: [63, 67, 71] },
      ],
      correct: 0,
      explain: "E♭ 到 G 是大三度，到 B♭ 是纯五度。",
    },
  ],
  handPrompt: "选出 C 小三和弦。",
  handChoices: [
    choice("C E G", [], [chord(0, [60, 64, 67], "C")]),
    choice("C E♭ G", [], [chord(0, [60, 63, 67], "Cm")]),
    choice("C F G", [], [chord(0, [60, 65, 67], "Csus4")]),
    choice("C E♭ G♭", [], [chord(0, [60, 63, 66], "Cdim")]),
  ],
  handCorrect: 1,
  bpm: 120,
  keyRoot: 0,
  keyScale: "major",
  totalBars: 1,
  marker: "Level4",
  prereq: [3],
});
