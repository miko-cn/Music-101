// 第 3 关 · 音程与协和度
import { defineLesson, melody, choice } from "../helpers.ts";
import type { StageLessonEntry } from "../types.ts";

export const lesson: StageLessonEntry = defineLesson({
  id: 3,
  title: "音程与协和度",
  stage: "foundation",
  ability: "harmony",
  anchor: {
    id: "tonic-imagine",
    name: "主音想象法",
    hook: "把低音当成主音，上音在大调里就是标准性质。",
    steps: [
      "先数大小：低音自己算 1，一度二度三度一路数上去（数音名，不数半音）。",
      "把低音想象成某个大调的主音。",
      "看高音在不在这个大调里：在 → 性质是标准的。",
      "一、四、五、八度是纯；二、三、六、七度是大或小；不在大调里就是小（或增/减）。",
    ],
    takeaway: [
      "每个音程有两件事：大小 + 性质。别把两者混成一个。",
      "数大小第一个音算 1，而且按音名数：C 到 C♯ 也是二度。",
      "定性质用主音想象法，不要去数半音——数半音慢而且容易错。",
      "纯一、纯四、纯五、纯八最稳；小二度最挤，七度和三全音最紧张。",
    ],
  },
  concept: [
    "音程就是两个音隔多远。每个音程有两件事：大小（几度）和性质（纯/大/小）。",
    "数大小只看音名，而且第一个音算 1：C 到 D 是二度，C 到 E 是三度，C 到 G 是五度，C 到 C5 是八度。注意 C 到 C♯ 也是二度——度数按字母数，不按半音数。",
    "性质用「主音想象法」判定，这是 Open Music Theory 明确推荐的方法（它明确说不要去数半音）：把低音想象成某个大调的主音，如果高音在这个大调里，这个音程就是标准的性质。",
    "跑一遍：C 到 E，想象 C 大调（C D E F G A B），E 在里面，三度里 E 是大三度 → 大三度。C 到 G，同样在 C 大调里，五度是纯五度。C 到 C♯，C♯ 不在 C 大调里 → 小二度。",
    "大小和性质的关系：一度、四度、五度、八度只能是「纯」的（再加变化就是增/减）；二度、三度、六度、七度只能是「大/小」的。",
    "协和度：完美音程（纯一、纯四、纯五、纯八）最稳；大/小三度、大/小六度也稳；小二度最挤，七度和三全音最紧张。编曲里，紧张音程就是要「解决」的那一个。",
    "编曲里的用处：贝斯线和旋律线的第一个音如果撞成小二度会很难听，那是错的解决位置；属七的七音（降七度）天生要往下解决半音，这种「想要往下走」的感觉就是挂留感的来源。",
  ],
  earPass: 6,
  ear: [
    {
      id: "size-m3",
      prompt: "C4 → E4 是几度？",
      choices: [
        { label: "三度", midis: [60, 64] },
        { label: "二度", midis: [60, 62] },
        { label: "四度", midis: [60, 65] },
      ],
      correct: 0,
      explain: "C=1、D=2、E=3，所以是三度。",
    },
    {
      id: "size-m2-trap",
      prompt: "C4 → C♯4 是几度？",
      choices: [
        { label: "二度", midis: [60, 61] },
        { label: "一度", midis: [60, 60] },
        { label: "三度", midis: [60, 63] },
      ],
      correct: 0,
      explain: "度数按音名数：C♯ 是第二个音名，所以是二度。只隔一个半音不代表是「一度」。",
    },
    {
      id: "size-p5",
      prompt: "C4 → G4 是几度？",
      choices: [
        { label: "五度", midis: [60, 67] },
        { label: "四度", midis: [60, 65] },
        { label: "七度", midis: [60, 71] },
      ],
      correct: 0,
      explain: "C D E F G，五步到 G，是五度。",
    },
    {
      id: "size-p4",
      prompt: "C4 → F4 是几度？",
      choices: [
        { label: "四度", midis: [60, 65] },
        { label: "五度", midis: [60, 67] },
        { label: "三度", midis: [60, 64] },
      ],
      correct: 0,
      explain: "C D E F，四步到 F，是四度。F 比 G 近一截。",
    },
    {
      id: "size-m3-e",
      prompt: "E4 → G4 是几度？",
      choices: [
        { label: "三度", midis: [64, 67] },
        { label: "二度", midis: [64, 66] },
        { label: "四度", midis: [64, 68] },
      ],
      correct: 0,
      explain: "E=1、F=2、G=3，是三度。",
    },
    {
      id: "size-octave",
      prompt: "C4 → C5 是几度？",
      choices: [
        { label: "八度", midis: [60, 72] },
        { label: "七度", midis: [60, 71] },
        { label: "九度", midis: [60, 74] },
      ],
      correct: 0,
      explain: "音名又绕回来一遍，C 到下一个 C 是八度。",
    },
    {
      id: "p5-vs-m2",
      prompt: "哪个更协和？",
      choices: [
        { label: "C4 → G4（纯五）", midis: [60, 67] },
        { label: "C4 → C♯4（小二）", midis: [60, 61] },
        { label: "C4 → D4（大二）", midis: [60, 62] },
      ],
      correct: 0,
      explain: "C4 和 G4 离得开又合得上。C4 和 C♯4 只差一个键，听着挤。",
    },
    {
      id: "tighter",
      prompt: "哪个最挤？",
      choices: [
        { label: "C4 → C♯4", midis: [60, 61] },
        { label: "C4 → G4", midis: [60, 67] },
        { label: "C4 → C5", midis: [60, 72] },
      ],
      correct: 0,
      explain: "C4 到 C♯4 是相邻的两个键，最挤。C4 到 C5 是同一个音名高了八度，听起来开阔。",
    },
  ],
  handPrompt: "选出听起来最稳、最不挤的一对。",
  handChoices: [
    choice("C4 → C♯4（小二）", melody([60, 61])),
    choice("C4 → D4（大二）", melody([60, 62])),
    choice("C4 → G4（纯五）", melody([60, 67])),
    choice("C4 → C5（纯八）", melody([60, 72])),
  ],
  handCorrect: 2,
  bpm: 120,
  keyRoot: 0,
  keyScale: "major",
  totalBars: 1,
  marker: "Level3",
  prereq: [2],
});
