import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote } from "../core/midi/project.ts";
import { PPQ } from "../core/midi/types.ts";

export interface StageEar {
  id: string;
  prompt: string;
  choices: { label: string; midis: number[] }[];
  correct: number;
  explain: string;
}

export interface StageChoice {
  label: string;
  notes: SkeletonNote[];
  chords: SkeletonChord[];
}

export interface StageLesson {
  id: number;
  title: string;
  concept: string[];
  ear: StageEar[];
  earPass: number;
  handPrompt: string;
  handChoices: StageChoice[];
  handCorrect: number;
  bpm: number;
  keyRoot: PitchClass;
  keyScale: ScaleId;
  totalBars: number;
  marker: string;
}

const BAR = 4 * PPQ;

function melody(pitches: readonly number[], step = PPQ): SkeletonNote[] {
  return pitches.map((pitch, index) => ({
    tick: index * step,
    dur: Math.max(60, step - 40),
    pitch,
    vel: 96,
  }));
}

function chord(bar: number, pitches: number[], text: string): SkeletonChord {
  return { tick: bar * BAR, pitches, text };
}

function choice(label: string, notes: SkeletonNote[] = [], chords: SkeletonChord[] = []): StageChoice {
  return { label, notes, chords };
}

export const STAGE_LESSONS: readonly StageLesson[] = [
  {
    id: 2,
    title: "半音与全音",
    concept: [
      "相邻的两个琴键是半音，中间隔一个键是全音。半音走 1，全音走 2。",
      "E 和 F、B 和 C 挨在一起，中间没有黑键，所以它们是半音。C 到 D 中间有黑键，是全音。",
    ],
    earPass: 4,
    ear: [
      {
        id: "semi-or-whole",
        prompt: "哪一对是半音？",
        choices: [
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → D4", midis: [60, 62] },
        ],
        correct: 0,
        explain: "C 到 C# 只隔一个半音。C 到 D 隔了两个，是全音。",
      },
      {
        id: "whole-ef",
        prompt: "哪一对是全音？",
        choices: [
          { label: "E4 → F#4", midis: [64, 66] },
          { label: "E4 → F4", midis: [64, 65] },
        ],
        correct: 0,
        explain: "E 到 F 是半音。再高一个半音到 F#，才是全音。",
      },
      {
        id: "semi-bc",
        prompt: "哪一对是半音？",
        choices: [
          { label: "B4 → C5", midis: [71, 72] },
          { label: "A4 → B4", midis: [69, 71] },
        ],
        correct: 0,
        explain: "B 和 C 之间没有黑键，是半音。A 到 B 是全音。",
      },
      {
        id: "whole-fg",
        prompt: "哪一对是全音？",
        choices: [
          { label: "F4 → G4", midis: [65, 67] },
          { label: "F4 → F#4", midis: [65, 66] },
        ],
        correct: 0,
        explain: "F 到 G 跨过 F#，是全音。F 到 F# 只是半音。",
      },
      {
        id: "narrower",
        prompt: "哪一对更窄？",
        choices: [
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → D4", midis: [60, 62] },
        ],
        correct: 0,
        explain: "半音比全音窄。更窄的是 C 到 C#。",
      },
    ],
    handPrompt: "下面哪一对是全音？",
    handChoices: [
      choice("C4 → C#4", melody([60, 61])),
      choice("C4 → D4", melody([60, 62])),
      choice("E4 → F4", melody([64, 65])),
    ],
    handCorrect: 1,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level2",
  },
  {
    id: 3,
    title: "音程与协和度",
    concept: [
      "两个音之间的距离叫音程。纯五很空、很稳；小二度两个音挤在一起，很不协和。",
      "可以记一个大致顺序：纯五比大三度协和，大三度比大二度协和，小二度最挤。",
    ],
    earPass: 4,
    ear: [
      {
        id: "p5-vs-m2",
        prompt: "哪个更协和？",
        choices: [
          { label: "C4 → G4（纯五）", midis: [60, 67] },
          { label: "C4 → C#4（小二）", midis: [60, 61] },
        ],
        correct: 0,
        explain: "纯五比小二度协和得多。",
      },
      {
        id: "m3-vs-m2",
        prompt: "哪个更协和？",
        choices: [
          { label: "C4 → E4（大三）", midis: [60, 64] },
          { label: "C4 → Db4（小二）", midis: [60, 61] },
        ],
        correct: 0,
        explain: "大三度是协和音程，小二度是不协和音程。",
      },
      {
        id: "which-p5",
        prompt: "哪个是纯五度？",
        choices: [
          { label: "C4 → G4", midis: [60, 67] },
          { label: "C4 → F4", midis: [60, 65] },
        ],
        correct: 0,
        explain: "C 到 G 是纯五。C 到 F 是纯四。",
      },
      {
        id: "tighter",
        prompt: "哪个更挤？",
        choices: [
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → C5", midis: [60, 72] },
        ],
        correct: 0,
        explain: "小二度挤在一起。纯八度是同一个音名，高一个八度，很开阔。",
      },
      {
        id: "which-m3",
        prompt: "哪个是大三度？",
        choices: [
          { label: "C4 → E4", midis: [60, 64] },
          { label: "C4 → Eb4", midis: [60, 63] },
        ],
        correct: 0,
        explain: "C 到 E 是大三度。C 到 Eb 是小三度。",
      },
    ],
    handPrompt: "选出最协和的一对。",
    handChoices: [
      choice("C4 → C#4（小二）", melody([60, 61])),
      choice("C4 → D4（大二）", melody([60, 62])),
      choice("C4 → G4（纯五）", melody([60, 67])),
    ],
    handCorrect: 2,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level3",
  },
  {
    id: 4,
    title: "大三和弦与小三和弦",
    concept: [
      "大三和弦是根音、高一个大三度、再高一个纯五：C E G。听起来亮。",
      "小三和弦把中间那个音降半音：C Eb G。听起来暗。两个和弦的根音和五音可以一样，差别在三音。",
    ],
    earPass: 4,
    ear: [
      {
        id: "which-minor",
        prompt: "哪个是小三和弦？",
        choices: [
          { label: "C Eb G", midis: [60, 63, 67] },
          { label: "C E G", midis: [60, 64, 67] },
        ],
        correct: 0,
        explain: "中间是 Eb 而不是 E，所以是小三和弦。",
      },
      {
        id: "which-major",
        prompt: "哪个是大三和弦？",
        choices: [
          { label: "F A C", midis: [65, 69, 72] },
          { label: "F Ab C", midis: [65, 68, 72] },
        ],
        correct: 0,
        explain: "F A C 的三音是大三度 A，是大三和弦。",
      },
      {
        id: "brighter",
        prompt: "哪个更亮？",
        choices: [
          { label: "C E G", midis: [60, 64, 67] },
          { label: "C Eb G", midis: [60, 63, 67] },
        ],
        correct: 0,
        explain: "大三和弦比小三和弦亮。",
      },
      {
        id: "third-lower",
        prompt: "小三和弦的三音比大三和弦怎样？",
        choices: [
          { label: "低半音", midis: [63, 64] },
          { label: "高半音", midis: [64, 63] },
        ],
        correct: 0,
        explain: "小三的三音比大三低一个半音。",
      },
      {
        id: "a-minor",
        prompt: "哪个是 A 小三和弦？",
        choices: [
          { label: "A C E", midis: [69, 72, 76] },
          { label: "A C# E", midis: [69, 73, 76] },
        ],
        correct: 0,
        explain: "A C E 是小三。A C# E 是大三。",
      },
    ],
    handPrompt: "选出 C 小三和弦。",
    handChoices: [
      choice("C E G", [], [chord(0, [60, 64, 67], "C")]),
      choice("C Eb G", [], [chord(0, [60, 63, 67], "Cm")]),
      choice("C F G", [], [chord(0, [60, 65, 67], "Csus4")]),
    ],
    handCorrect: 1,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level4",
  },
  {
    id: 5,
    title: "音阶与调",
    concept: [
      "C 大调是 C D E F G A B，在钢琴上全是白键。主音是 C，第 5 级是 G。",
      "不在这七个音里的，比如 F#，就是这个调的调外音。先认清调，后面的和弦才有归属。",
    ],
    earPass: 4,
    ear: [
      {
        id: "outside",
        prompt: "哪个不在 C 大调里？",
        choices: [
          { label: "F#4", midis: [66] },
          { label: "F4", midis: [65] },
        ],
        correct: 0,
        explain: "C 大调有 F，没有 F#。",
      },
      {
        id: "inside",
        prompt: "哪个在 C 大调里？",
        choices: [
          { label: "B4", midis: [71] },
          { label: "Bb4", midis: [70] },
        ],
        correct: 0,
        explain: "B 是 C 大调的第 7 级。Bb 不是。",
      },
      {
        id: "degree-5",
        prompt: "C 大调的第 5 级是哪个？",
        choices: [
          { label: "G4", midis: [67] },
          { label: "A4", midis: [69] },
        ],
        correct: 0,
        explain: "C D E F G，数到第 5 个是 G。",
      },
      {
        id: "white-scale",
        prompt: "哪个是 C 大调音阶？",
        choices: [
          { label: "C D E F G A B", midis: [60, 62, 64, 65, 67, 69, 71] },
          { label: "C D Eb F G Ab Bb", midis: [60, 62, 63, 65, 67, 68, 70] },
        ],
        correct: 0,
        explain: "全是白键的那条是 C 大调。带 Eb、Ab、Bb 的是 C 小调。",
      },
      {
        id: "tonic",
        prompt: "C 大调的主音是哪个？",
        choices: [
          { label: "C4", midis: [60] },
          { label: "D4", midis: [62] },
        ],
        correct: 0,
        explain: "调名里的那个音就是主音。C 大调的主音是 C。",
      },
    ],
    handPrompt: "C 大调里没有哪个音？",
    handChoices: [
      choice("F#4", melody([66])),
      choice("E4", melody([64])),
      choice("G4", melody([67])),
    ],
    handCorrect: 0,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level5",
  },
  {
    id: 6,
    title: "七和弦与色彩",
    concept: [
      "在大三和弦上面再加一个七度，就成了七和弦。大七是 C E G B，七音离根音的高八度只差半音，很亮。",
      "属七是 C E G Bb，七音再低半音，更想往下解决。加九则是在大三上再加一个九度 D：C E G D。",
    ],
    earPass: 4,
    ear: [
      {
        id: "which-maj7",
        prompt: "哪个是大七和弦？",
        choices: [
          { label: "C E G B", midis: [60, 64, 67, 71] },
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
        ],
        correct: 0,
        explain: "七音是 B 而不是 Bb，这是大七。",
      },
      {
        id: "which-dom7",
        prompt: "哪个是属七和弦？",
        choices: [
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C E G B", midis: [60, 64, 67, 71] },
        ],
        correct: 0,
        explain: "属七的七音是降七度 Bb。",
      },
      {
        id: "seventh-higher",
        prompt: "大七的七音比属七的七音怎样？",
        choices: [
          { label: "高半音", midis: [70, 71] },
          { label: "低半音", midis: [71, 70] },
        ],
        correct: 0,
        explain: "B 比 Bb 高一个半音。",
      },
      {
        id: "add9",
        prompt: "哪个是加了九度的和弦？",
        choices: [
          { label: "C E G D", midis: [60, 64, 67, 74] },
          { label: "C E G", midis: [60, 64, 67] },
        ],
        correct: 0,
        explain: "多出来的 D 是根音上面的九度。",
      },
      {
        id: "darker-seven",
        prompt: "哪个更想往下解决、听起来更紧？",
        choices: [
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C E G B", midis: [60, 64, 67, 71] },
        ],
        correct: 0,
        explain: "属七的降七度更紧，大七更亮、更松。",
      },
    ],
    handPrompt: "选出 C 大七和弦。",
    handChoices: [
      choice("C E G Bb", [], [chord(0, [60, 64, 67, 70], "C7")]),
      choice("C E G B", [], [chord(0, [60, 64, 67, 71], "Cmaj7")]),
      choice("C Eb G Bb", [], [chord(0, [60, 63, 67, 70], "Cm7")]),
    ],
    handCorrect: 1,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level6",
  },
  {
    id: 7,
    title: "I–V–vi–IV",
    concept: [
      "在 C 大调里，I 是 C 大三，V 是 G 大三，vi 是 A 小三，IV 是 F 大三。",
      "I–V–vi–IV 就是 C → G → Am → F。四个和弦都在调里，是很常见的一条进行。",
    ],
    earPass: 4,
    ear: [
      {
        id: "which-v",
        prompt: "哪个是 V 级？",
        choices: [
          { label: "G B D", midis: [67, 71, 74] },
          { label: "A C E", midis: [69, 72, 76] },
        ],
        correct: 0,
        explain: "C 大调的第 5 级是 G，所以 V 是 G 大三和弦。",
      },
      {
        id: "which-vi",
        prompt: "哪个是 vi 级？",
        choices: [
          { label: "A C E", midis: [69, 72, 76] },
          { label: "F A C", midis: [65, 69, 72] },
        ],
        correct: 0,
        explain: "第 6 级是 A，大调里它是小三和弦，记成 vi。",
      },
      {
        id: "which-iv",
        prompt: "哪个是 IV 级？",
        choices: [
          { label: "F A C", midis: [65, 69, 72] },
          { label: "G B D", midis: [67, 71, 74] },
        ],
        correct: 0,
        explain: "第 4 级是 F，IV 是 F 大三和弦。",
      },
      {
        id: "first-chord",
        prompt: "I–V–vi–IV 的第一个和弦是？",
        choices: [
          { label: "C E G", midis: [60, 64, 67] },
          { label: "G B D", midis: [67, 71, 74] },
        ],
        correct: 0,
        explain: "I 是主和弦，C 大调里就是 C。",
      },
      {
        id: "in-key-prog",
        prompt: "哪条进行全部在 C 大调里？",
        choices: [
          { label: "C G Am F", midis: [60, 67, 69, 65] },
          { label: "C G Bb F", midis: [60, 67, 70, 65] },
        ],
        correct: 0,
        explain: "Bb 不在 C 大调里。C、G、A、F 都在。",
      },
    ],
    handPrompt: "选出 I–V–vi–IV。",
    handChoices: [
      choice(
        "C → G → Am → F",
        [],
        [
          chord(0, [60, 64, 67], "C (I)"),
          chord(1, [67, 71, 74], "G (V)"),
          chord(2, [69, 72, 76], "Am (vi)"),
          chord(3, [65, 69, 72], "F (IV)"),
        ],
      ),
      choice(
        "C → Am → F → G",
        [],
        [
          chord(0, [60, 64, 67], "C (I)"),
          chord(1, [69, 72, 76], "Am (vi)"),
          chord(2, [65, 69, 72], "F (IV)"),
          chord(3, [67, 71, 74], "G (V)"),
        ],
      ),
      choice(
        "C → F → G → Am",
        [],
        [
          chord(0, [60, 64, 67], "C (I)"),
          chord(1, [65, 69, 72], "F (IV)"),
          chord(2, [67, 71, 74], "G (V)"),
          chord(3, [69, 72, 76], "Am (vi)"),
        ],
      ),
    ],
    handCorrect: 0,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 4,
    marker: "Level7",
  },
  {
    id: 8,
    title: "小调与借用",
    concept: [
      "A 自然小调是 A B C D E F G。主和弦是小三和弦 Am，记成 i。",
      "拿 A 大调来当尺子，F 大三是 ♭VI，C 大三是 ♭III，G 大三是 ♭VII。它们不在 A 大调里，但在小调歌曲里很常用，叫做借用。",
    ],
    earPass: 4,
    ear: [
      {
        id: "minor-tonic",
        prompt: "A 小调的主和弦是哪个？",
        choices: [
          { label: "A C E", midis: [69, 72, 76] },
          { label: "A C# E", midis: [69, 73, 76] },
        ],
        correct: 0,
        explain: "小调的主和弦是小三和弦，所以是 A C E。",
      },
      {
        id: "flat-six",
        prompt: "F 大三在 A 小调里记成什么？",
        choices: [
          { label: "♭VI", midis: [65, 69, 72] },
          { label: "V", midis: [64, 68, 71] },
        ],
        correct: 0,
        explain: "以 A 大调为尺子，F 比第 6 级低半音，记成 ♭VI。",
      },
      {
        id: "flat-seven",
        prompt: "哪个是 ♭VII？",
        choices: [
          { label: "G B D", midis: [67, 71, 74] },
          { label: "F# A# C#", midis: [66, 70, 73] },
        ],
        correct: 0,
        explain: "A 小调里的 G 大三是 ♭VII。F# 是大调的导音，不是这个借用和弦。",
      },
      {
        id: "natural-note",
        prompt: "哪个音在 A 自然小调里？",
        choices: [
          { label: "F4", midis: [65] },
          { label: "F#4", midis: [66] },
        ],
        correct: 0,
        explain: "自然小调的第 6 级是 F，不是 F#。",
      },
      {
        id: "second-chord",
        prompt: "i → ♭VI → ♭III → ♭VII 的第二个和弦是？",
        choices: [
          { label: "F A C", midis: [65, 69, 72] },
          { label: "C E G", midis: [60, 64, 67] },
        ],
        correct: 0,
        explain: "第二个是 ♭VI，在 A 小调里就是 F 大三。",
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
        "A → F# → C → G",
        [],
        [
          chord(0, [57, 61, 64], "A (I)"),
          chord(1, [54, 58, 61], "F#"),
          chord(2, [48, 52, 55], "C"),
          chord(3, [55, 59, 62], "G"),
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
    ],
    handCorrect: 0,
    bpm: 120,
    keyRoot: 9,
    keyScale: "naturalMinor",
    totalBars: 4,
    marker: "Level8",
  },
];

export function stageLesson(id: number): StageLesson {
  const found = STAGE_LESSONS.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`没有第 ${id} 关`);
  return found;
}
