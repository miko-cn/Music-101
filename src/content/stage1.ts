import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote, TrackRole } from "../core/midi/project.ts";
import { PPQ } from "../core/midi/types.ts";
import { ANCHORS, type MemoryAnchor } from "./anchors.ts";

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
  /** 多轨导出。有这个字段时优先于 notes。 */
  tracks?: { role: TrackRole; channel: number; notes: SkeletonNote[] }[];
}

export interface DrumLaneSpec {
  role: "KICK" | "SNARE" | "CLAP" | "HAT";
  label: string;
  target: boolean[];
}

/**
 * 记忆锚：一关留给学习者的那一个"抓得住的东西"。
 *
 * 定义见 ./anchors.ts —— 全课程共用一份锚点库，方便单独抽出「记忆点总表」。
 */
export type { MemoryAnchor };

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
  /** 这一关的记忆锚。必填：没有记忆点的关卡不允许存在。 */
  anchor: MemoryAnchor;
  /** 复习钩子：这些前置关卡是这一关的地基，忘了要回去补。 */
  prereq?: number[];
  /** 有鼓组时，手做改成把每条轨打成目标格子，不再用单选题。 */
  drums?: DrumLaneSpec[];
  sections?: { name: string; startBar: number; bars: number }[];
  /** 手做步播放一段侧链泵动。 */
  audition?: "sidechain";
  /** 手做步按当前选项画能量曲线。 */
  showEnergy?: boolean;
  /** 参考曲：从候选里选 BPM、调、结构。 */
  reference?: boolean;
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
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → D4", midis: [60, 62] },
          { label: "E4 → F4", midis: [64, 65] },
        ],
        correct: 0,
        explain: "C 到 C# 只隔一个键。C 到 D 隔了一个黑键，是全音。",
      },
      {
        id: "whole-ef",
        prompt: "哪一对是全音？",
        choices: [
          { label: "E4 → F#4", midis: [64, 66] },
          { label: "E4 → F4", midis: [64, 65] },
          { label: "B4 → C5", midis: [71, 72] },
        ],
        correct: 0,
        explain: "E 到 F 是半音。再高一个半音到 F#，才是全音。B 到 C 同样是半音。",
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
          { label: "F4 → F#4", midis: [65, 66] },
          { label: "E4 → F4", midis: [64, 65] },
        ],
        correct: 0,
        explain: "F 到 G 跨过 F#，是全音。F 到 F# 只是半音；E 到 F 也是半音。",
      },
      {
        id: "narrower",
        prompt: "哪一对更窄？",
        choices: [
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → D4", midis: [60, 62] },
          { label: "C4 → E4", midis: [60, 64] },
        ],
        correct: 0,
        explain: "半音比全音窄。更窄的是 C 到 C#。",
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
        explain: "C 到 C# 一步，C# 到 D 再一步，一共 2 个半音。",
      },
      {
        id: "up-whole",
        prompt: "从 C4 往上走一个全音到哪？",
        choices: [
          { label: "D4", midis: [60, 62] },
          { label: "C#4", midis: [60, 61] },
          { label: "E4", midis: [60, 64] },
        ],
        correct: 0,
        explain: "一个全音 = 两个半音。C 往上两步：C# 是 1 步，D 是 2 步。",
      },
    ],
    handPrompt: "下面哪一对是全音？",
    handChoices: [
      choice("C4 → C#4", melody([60, 61])),
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
    anchor: ANCHORS[2],
  },
  {
    id: 3,
    title: "音程与协和度",
    concept: [
      "音程就是两个音隔多远。每个音程有兩件事：大小（几度）和性质（纯/大/小）。",
      "数大小只看音名，而且第一个音算 1：C 到 D 是二度，C 到 E 是三度，C 到 G 是五度，C 到 C5 是八度。注意 C 到 C# 也是二度——度数按字母数，不按半音数。",
      "性质用「主音想象法」判定，这是 Open Music Theory 明确推荐的方法（它明确说不要去数半音）：把低音想象成某个大调的主音，如果高音在这个大调里，这个音程就是标准的性质。",
      "跑一遍：C 到 E，想象 C 大调（C D E F G A B），E 在里面，三度里 E 是大三度 → 大三度。C 到 G，同样在 C 大调里，五度是纯五度。C 到 C#，C# 不在 C 大调里 → 小二度。",
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
        prompt: "C4 → C#4 是几度？",
        choices: [
          { label: "二度", midis: [60, 61] },
          { label: "一度", midis: [60, 60] },
          { label: "三度", midis: [60, 63] },
        ],
        correct: 0,
        explain: "度数按音名数：C# 是第二个音名，所以是二度。只隔一个半音不代表是「一度」。",
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
          { label: "C4 → C#4（小二）", midis: [60, 61] },
          { label: "C4 → D4（大二）", midis: [60, 62] },
        ],
        correct: 0,
        explain: "C4 和 G4 离得开又合得上。C4 和 C#4 只差一个键，听着挤。",
      },
      {
        id: "tighter",
        prompt: "哪个最挤？",
        choices: [
          { label: "C4 → C#4", midis: [60, 61] },
          { label: "C4 → G4", midis: [60, 67] },
          { label: "C4 → C5", midis: [60, 72] },
        ],
        correct: 0,
        explain: "C4 到 C#4 是相邻的两个键，最挤。C4 到 C5 是同一个音名高了八度，听起来开阔。",
      },
    ],
    handPrompt: "选出听起来最稳、最不挤的一对。",
    handChoices: [
      choice("C4 → C#4（小二）", melody([60, 61])),
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
    anchor: ANCHORS[3],
  },
  {
    id: 4,
    title: "大三和弦与小三和弦",
    concept: [
      "和弦是几个音按三度叠起来的。三和弦叠三层：根音、三音、五音。C 往上叠：C 是根音，E 是三音，G 是五音。",
      "性质只看三音。三音是大三度 → 大三和弦；是小三度 → 小三和弦。五音在自然小调里永远是纯五度，不用操心。",
      "所以大三 C E G、小三 C Eb G 的区别只有中间那个音：三音降了半音，整和弦就变暗。这一个音就是和弦的情绪开关。",
      "再叠一层就变暗/变亮还有一个办法：把三音升高半音，C E♭ G 就变成 C E G♯——三度变成大三度，三和弦变成增和弦（听上去怪异）。这说明和弦性质完全由内部音程决定。",
      "大小写记号：大写字母表示大三和弦（C），小写字母表示小三和弦（cm），后面加 o 是减和弦（co）。",
      "编曲里的用处：调内进行要想「明亮」就用大三和弦，想要「忧柔」就换成同根音的小三和弦——同根音换性质是最省事也最有效的情绪切换。",
    ],
    earPass: 6,
    ear: [
      {
        id: "which-major",
        prompt: "哪个是大三和弦？",
        choices: [
          { label: "C E G", midis: [60, 64, 67] },
          { label: "C Eb G", midis: [60, 63, 67] },
          { label: "C F G", midis: [60, 65, 67] },
        ],
        correct: 0,
        explain: "C 到 E 是大三度，所以是大三和弦。C 到 Eb 是小三度，C 到 F 是纯四度，都不是。",
      },
      {
        id: "which-minor",
        prompt: "哪个是小三和弦？",
        choices: [
          { label: "F Ab C", midis: [65, 68, 72] },
          { label: "F A C", midis: [65, 69, 72] },
          { label: "F Bb C", midis: [65, 70, 72] },
        ],
        correct: 0,
        explain: "F 到 Ab 是小三度，所以是小三和弦。",
      },
      {
        id: "major-third",
        prompt: "C 大三和弦的三音是？",
        choices: [
          { label: "E", midis: [60, 64] },
          { label: "Eb", midis: [60, 63] },
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
          { label: "Eb", midis: [60, 63] },
          { label: "G", midis: [60, 67] },
        ],
        correct: 1,
        explain: "Cm 是 C Eb G。根音 C，五音 G，三音就是 Eb。",
      },
      {
        id: "a-minor",
        prompt: "哪个是 A 小三和弦？",
        choices: [
          { label: "A C E", midis: [69, 72, 76] },
          { label: "A C# E", midis: [69, 73, 76] },
          { label: "A D E", midis: [69, 74, 76] },
        ],
        correct: 0,
        explain: "A 到 C 是小三度，所以是 A 小三和弦。A C# E 是大三和弦。",
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
          { label: "C Eb G", midis: [60, 63, 67] },
          { label: "C E Gb", midis: [60, 64, 66] },
        ],
        correct: 0,
        explain: "大三和弦比小三和弦亮。降三音就变暗，升五音（C E Gb）听上去是拧巴的增和弦。",
      },
      {
        id: "eb-major",
        prompt: "哪个是 Eb 大三和弦？",
        choices: [
          { label: "Eb G Bb", midis: [63, 67, 70] },
          { label: "Eb Gb Bb", midis: [63, 66, 70] },
          { label: "Eb G B", midis: [63, 67, 71] },
        ],
        correct: 0,
        explain: "Eb 到 G 是大三度，到 Bb 是纯五度。",
      },
    ],
    handPrompt: "选出 C 小三和弦。",
    handChoices: [
      choice("C E G", [], [chord(0, [60, 64, 67], "C")]),
      choice("C Eb G", [], [chord(0, [60, 63, 67], "Cm")]),
      choice("C F G", [], [chord(0, [60, 65, 67], "Csus4")]),
      choice("C Eb Ab", [], [chord(0, [60, 63, 68], "Cdim")]),
    ],
    handCorrect: 1,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level4",
    prereq: [3],
    anchor: ANCHORS[4],
  },
  {
    id: 5,
    title: "音阶与调",
    concept: [
      "音阶是一串按固定半音/全音顺序排上去的音。C 大调是 C D E F G A B，恰好全是白键，所以 C 大调是最好认的调。",
      "大调音阶的半音全音顺序固定是 W‑W‑H‑W‑W‑W‑H（从主音到下一个主音）。这就是为什么 E 到 F、B 到 C 是半音：那两个位置正好落在 H 上。",
      "级数就是位置：主音是第 1 级，往上数到第 7 级。主音 = 调名里那个音 = 听起来「回家」的那个音。",
      "五度圈是这一关的地图：C 在 12 点钟位置，顺时针每走一格多一个升号，逆时针每走一格多一个降号。走到 G 是一个升号，走到 F 是一个降号。",
      "有了调，别的音才有归属。音阶里的七个音叫调内音，之外的叫调外音。调外音不是错误，是有意的借用——下一关之后会讲怎么用。",
      "编曲里的用处：判断一段 MIDI 「在不在调内」靠的就是这个集合。C 大调里出现 F# 就说明你要么换了调，要么故意借了音。",
    ],
    earPass: 6,
    ear: [
      {
        id: "major-scale",
        prompt: "哪个是 C 大调音阶？",
        choices: [
          { label: "C D E F G A B", midis: [60, 62, 64, 65, 67, 69, 71] },
          { label: "C D Eb F G Ab Bb", midis: [60, 62, 63, 65, 67, 68, 70] },
          { label: "C D E F G A Bb", midis: [60, 62, 64, 65, 67, 69, 70] },
        ],
        correct: 0,
        explain: "全是白键的那条是 C 大调。带 Eb、Ab、Bb 的是 C 小调；最后 Bb 那条是 C 和弦七声。",
      },
      {
        id: "outside",
        prompt: "哪个不在 C 大调里？",
        choices: [
          { label: "F#4", midis: [66] },
          { label: "F4", midis: [65] },
          { label: "G4", midis: [67] },
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
          { label: "A#4", midis: [70] },
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
          { label: "Eb4", midis: [63] },
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
      choice("F#4", melody([66])),
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
    anchor: ANCHORS[5],
  },
  {
    id: 6,
    title: "七和弦与色彩",
    concept: [
      "七和弦就是三和弦上面再叠一层三度：根音、三音、五音、七音。C E G 再往上叠就是 B，C E G B。",
      "性质还是看内部音程，但这次七音决定颜色。 Cmaj7 的七音是 B，七音和五音之间是大三度；C7 的七音是 Bb，是小三度。",
      "为什么 maj7 亮：因为七音 B 是导音，离下一个八度只差半音，整个和弦被「往上拉」。为什么属七紧：七音 Bb 是降七度，它想要往下解决到 C。",
      "五种最常见的七和弦性质：maj7（根大三+大七）、7（根大三+小七）、m7（根小三+小七）、m7♭5（根小三+减五+小七）、dim7（根小三+减五+减七）。",
      "add9 是另一类：在三和弦上加一个九度，但不动三音和五音。Cadd9 = C E G D，比 Cmaj7 更透，因为它的七度位置还是空的。",
      "编曲里的用处：future bass / kawaii bass 最常见的两个色彩就是 maj7 和 add9，用在副歌的上层旋律或铺底 pad 上，一首歌的「甜度」基本由它决定。",
    ],
    earPass: 6,
    ear: [
      {
        id: "which-maj7",
        prompt: "哪个是大七和弦？",
        choices: [
          { label: "C E G B", midis: [60, 64, 67, 71] },
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C Eb G B", midis: [60, 63, 67, 71] },
        ],
        correct: 0,
        explain: "七音是 B 而不是 Bb，且三音是大三度 E，所以是 Cmaj7。",
      },
      {
        id: "which-dom7",
        prompt: "哪个是属七和弦？",
        choices: [
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C E G B", midis: [60, 64, 67, 71] },
          { label: "C Eb G Bb", midis: [60, 63, 67, 70] },
        ],
        correct: 0,
        explain: "属七 = 大三和弦 + 小七。七音是降七度 Bb。",
      },
      {
        id: "maj7-seventh",
        prompt: "Cmaj7 的七音是？",
        choices: [
          { label: "B", midis: [60, 71] },
          { label: "Bb", midis: [60, 70] },
          { label: "A", midis: [60, 69] },
        ],
        correct: 0,
        explain: "maj7 的七音是导音 B，离八度只差半音，所以亮。",
      },
      {
        id: "dom7-seventh",
        prompt: "C7 的七音是？",
        choices: [
          { label: "Bb", midis: [60, 70] },
          { label: "B", midis: [60, 71] },
          { label: "A", midis: [60, 69] },
        ],
        correct: 0,
        explain: "C7 的七音是降七度 Bb，它想要往下解决到 C。",
      },
      {
        id: "cm7",
        prompt: "哪个是 Cm7？",
        choices: [
          { label: "C Eb G Bb", midis: [60, 63, 67, 70] },
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C Eb G B", midis: [60, 63, 67, 71] },
        ],
        correct: 0,
        explain: "m7 = 小三和弦 + 小七。所以三音要降半音，七音也是降的。",
      },
      {
        id: "resolve",
        prompt: "哪个最想往下解决、听起来最紧？",
        choices: [
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C E G B", midis: [60, 64, 67, 71] },
          { label: "C E G", midis: [60, 64, 67] },
        ],
        correct: 0,
        explain: "属七的降七度更紧，大七更亮、更松。",
      },
      {
        id: "add9",
        prompt: "哪个是加了九度的和弦？",
        choices: [
          { label: "C E G D", midis: [60, 64, 67, 74] },
          { label: "C E G Bb", midis: [60, 64, 67, 70] },
          { label: "C E G", midis: [60, 64, 67] },
        ],
        correct: 0,
        explain: "多出来的 D 是根音上面的九度，而且三音 E 没动，所以是 add9 不是 maj7。",
      },
      {
        id: "minor-maj7",
        prompt: "哪个是 Cm(maj7)？",
        choices: [
          { label: "C Eb G B", midis: [60, 63, 67, 71] },
          { label: "C E G B", midis: [60, 64, 67, 71] },
          { label: "C Eb G Bb", midis: [60, 63, 67, 70] },
        ],
        correct: 0,
        explain: "小七和弦 + 大七度 = Cm(maj7)：三音降半音，七音是 B。这个组合又暗又亮，很 kawaii。",
      },
    ],
    handPrompt: "选出 C 大七和弦。",
    handChoices: [
      choice("C E G Bb", [], [chord(0, [60, 64, 67, 70], "C7")]),
      choice("C E G B", [], [chord(0, [60, 64, 67, 71], "Cmaj7")]),
      choice("C Eb G Bb", [], [chord(0, [60, 63, 67, 70], "Cm7")]),
      choice("C Eb G B", [], [chord(0, [60, 63, 67, 71], "Cm(maj7)")]),
    ],
    handCorrect: 1,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 1,
    marker: "Level6",
    prereq: [4, 5],
    anchor: ANCHORS[6],
  },
  {
    id: 7,
    title: "I–V–vi–IV",
    concept: [
      "罗马数字是「级数 + 性质」的合体。数字告诉你根音在音阶里的第几级，大小写告诉你和弦的性质。",
      "C 大调里：C 是第 1 级 → I；D 是第 2 级，三和弦是 Dm → ii；E → iii；F → IV；G → V；A 是第 6 级，性质是小三 → vi；B → vii°（减和弦）。",
      "所以 I–V–vi–IV 在 C 大调里就是 C → G → Am → F。四个和弦全在调内，而且「两个大调夹一个小调」的明暗排列本身就很好听。",
      "大小写规则：大写 = 大三和弦，小写 = 小三和弦，后面加 o = 减。三度级数（iii）永远小写，二度级数（ii）也永远小写，因为它们天然是小三和弦。",
      "进行名字就是把这些数字连起来：I–V–vi–IV、vi–IV–I–V 都是常见的四小节循环。开头不同，情绪完全不同：I–V–vi–IV 从家出发往上走，vi–IV–I–V 从「不安」开始再回家。",
      "编曲里的用处：这个进行几乎就是流行/日系 BGM 的默认骨架。你只要会听级数，遇到一首新歌就能很快判断它是不是这一套。",
    ],
    earPass: 6,
    ear: [
      {
        id: "which-v",
        prompt: "哪个是 V 级？",
        choices: [
          { label: "G B D", midis: [67, 71, 74] },
          { label: "A C E", midis: [69, 72, 76] },
          { label: "D F A", midis: [62, 65, 69] },
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
          { label: "G B D", midis: [67, 71, 74] },
        ],
        correct: 0,
        explain: "第 6 级是 A。大调里第 6 级天然是小三和弦，记成小写 vi。",
      },
      {
        id: "which-iv",
        prompt: "哪个是 IV 级？",
        choices: [
          { label: "F A C", midis: [65, 69, 72] },
          { label: "G B D", midis: [67, 71, 74] },
          { label: "Bb D F", midis: [70, 74, 77] },
        ],
        correct: 0,
        explain: "第 4 级是 F，IV 是 F 大三和弦。",
      },
      {
        id: "lowercase-means",
        prompt: "哪个是小写级数（小三和弦）？",
        choices: [
          { label: "Am", midis: [69, 72, 76] },
          { label: "G", midis: [67, 71, 74] },
          { label: "F", midis: [65, 69, 72] },
        ],
        correct: 0,
        explain: "小写字母代表小三和弦。Am 是小写，G 和 F 是大写大三和弦。",
      },
      {
        id: "second-chord",
        prompt: "I–V–vi–IV 的第二个和弦是？",
        choices: [
          { label: "G", midis: [67, 71, 74] },
          { label: "Am", midis: [69, 72, 76] },
          { label: "F", midis: [65, 69, 72] },
        ],
        correct: 0,
        explain: "顺序就是 I、V、vi、IV，第二个是 V = G。",
      },
      {
        id: "which-ii",
        prompt: "C 大调的 ii 是？",
        choices: [
          { label: "Dm", midis: [62, 65, 69] },
          { label: "D", midis: [62, 66, 69] },
          { label: "Bdim", midis: [71, 74, 77] },
        ],
        correct: 0,
        explain: "第 2 级是 D，三和弦天然是小三，记成 ii（小写）。",
      },
      {
        id: "in-key-prog",
        prompt: "哪条进行全部在 C 大调里？",
        choices: [
          { label: "C G Am F", midis: [60, 67, 69, 65] },
          { label: "C G Bb F", midis: [60, 67, 70, 65] },
          { label: "C Gb Am F", midis: [60, 66, 69, 65] },
        ],
        correct: 0,
        explain: "Bb 和 Gb 都不在 C 大调里。C、G、A、F 都在。",
      },
      {
        id: "which-vii",
        prompt: "C 大调的 vii° 是什么？",
        choices: [
          { label: "Bdim", midis: [71, 74, 77] },
          { label: "B", midis: [71, 75, 78] },
          { label: "Bm", midis: [71, 74, 78] },
        ],
        correct: 0,
        explain: "第 7 级 B 上叠三音是减和弦，记成 vii°。它最想往下解决到 I。",
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
      choice(
        "C → G → Bb → F",
        [],
        [
          chord(0, [60, 64, 67], "C (I)"),
          chord(1, [67, 71, 74], "G (V)"),
          chord(2, [70, 74, 77], "Bb (♭VII)"),
          chord(3, [65, 69, 72], "F (IV)"),
        ],
      ),
    ],
    handCorrect: 0,
    bpm: 120,
    keyRoot: 0,
    keyScale: "major",
    totalBars: 4,
    marker: "Level7",
    prereq: [5, 6],
    anchor: ANCHORS[7],
  },
  {
    id: 8,
    title: "小调与借用",
    concept: [
      "A 自然小调是 A B C D E F G。它的主和弦是小三和弦 Am，记成 i（小写）。",
      "小调和同名大调只差三件事：第 3、6、7 级各降半音。所以学小调最快的办法是拿同名大调当尺子。",
      "用尺子量：相对 A 大调，F 低半音 → ♭VI；C 低半音 → ♭III；G 低半音 → ♭VII。这些和弦不在 A 小调里，但在小调歌里特别常用，叫做借用和弦（modal mixture）。",
      "和声小调把第 7 级升上去（G → G#），这样才能做出属和弦 Am → E（i → V），有归属感。E7 → Am 是小调里最重要的解决动作。",
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
          { label: "A C# E", midis: [69, 73, 76] },
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
          { label: "A B C# D E F# G", midis: [69, 71, 73, 74, 76, 78, 79] },
          { label: "A B C D E F# G", midis: [69, 71, 72, 74, 76, 78, 79] },
        ],
        correct: 0,
        explain: "自然小调 = 同名大调的第 3、6、7 级降半音，所以是 A B C D E F G。",
      },
      {
        id: "minor-i",
        prompt: "A 小调的 i 是？",
        choices: [
          { label: "A C E", midis: [69, 72, 76] },
          { label: "A C# E", midis: [69, 73, 76] },
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
          { label: "F# A# C#", midis: [66, 70, 73] },
          { label: "G Bb D", midis: [67, 70, 74] },
        ],
        correct: 0,
        explain: "A 小调里的 G 大三是 ♭VII。F# 是大调的导音，G Bb 是 G 小和弦，都不是。",
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
        explain: "自然小调第 7 级是 G，和声小调升成 G#，这样才能做出属和弦 E，导向 Am。",
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
    anchor: ANCHORS[8],
  },
];

export function stageLesson(id: number): StageLesson {
  const found = STAGE_LESSONS.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`没有第 ${id} 关`);
  return found;
}
