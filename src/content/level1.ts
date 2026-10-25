import { anchorOf } from "./anchors.ts";

export interface EarChoice {
  label: string;
  midi: number;
}

export interface EarQuestion {
  id: string;
  prompt: string;
  choices: readonly EarChoice[];
  correct: number;
  explain: string;
}

export const LEVEL1_BPM = 120;
export const LEVEL1_TARGET_PITCH = 60;
export const LEVEL1_EAR_PASS = 6;

/** 第 1、5、9、13 格（从 1 数）打开，其余关掉。 */
export const LEVEL1_TARGET_STEPS: readonly boolean[] = [
  true, false, false, false,
  true, false, false, false,
  true, false, false, false,
  true, false, false, false,
];

export const LEVEL1_EAR: readonly EarQuestion[] = [
  {
    id: "higher-c-g",
    prompt: "哪个音更高？",
    choices: [
      { label: "C4", midi: 60 },
      { label: "G4", midi: 67 },
      { label: "E4", midi: 64 },
    ],
    correct: 1,
    explain: "G4 在 C4 右边，音高更高。",
  },
  {
    id: "higher-octave",
    prompt: "同一个音名，哪个更高？",
    choices: [
      { label: "C5", midi: 72 },
      { label: "C4", midi: 60 },
      { label: "C3", midi: 48 },
    ],
    correct: 0,
    explain: "C5 比 C4 高一个八度，MIDI 是 72 而不是 60。",
  },
  {
    id: "higher-e-d",
    prompt: "哪个音更高？",
    choices: [
      { label: "D4", midi: 62 },
      { label: "E4", midi: 64 },
      { label: "C4", midi: 60 },
    ],
    correct: 1,
    explain: "E 在 D 的右边，所以 E4 更高。",
  },
  {
    id: "which-c4",
    prompt: "哪个是中央 C（C4）？",
    choices: [
      { label: "C4", midi: 60 },
      { label: "D4", midi: 62 },
      { label: "E4", midi: 64 },
    ],
    correct: 0,
    explain: "中央 C 记成 C4，MIDI 音高是 60。",
  },
  {
    id: "lower-a",
    prompt: "哪个音更低？",
    choices: [
      { label: "A4", midi: 69 },
      { label: "A3", midi: 57 },
      { label: "G4", midi: 67 },
    ],
    correct: 1,
    explain: "A3 比 A4 低一个八度。",
  },
  {
    id: "black-key-group",
    prompt: "黑键在键盘上是怎么排的？",
    choices: [
      { label: "两个一组、三个一组，循环重复", midi: 60 },
      { label: "每两个白键之间一个黑键，均匀排", midi: 61 },
      { label: "全部连在一起的长条", midi: 62 },
    ],
    correct: 0,
    explain: "黑键永远是「二、二、三」循环：两组两个黑键，一组三个黑键。",
  },
  {
    id: "which-is-f",
    prompt: "三个黑键那一组，左边紧挨着的白键是哪个？",
    choices: [
      { label: "F", midi: 65 },
      { label: "C", midi: 60 },
      { label: "G", midi: 67 },
    ],
    correct: 0,
    explain: "三黑键组左边是 F，两黑键组左边是 C。这是键盘上两个最好记的定位点。",
  },
  {
    id: "note-names-cycle",
    prompt: "从 C 往上数，第 8 个音名是？",
    choices: [
      { label: "C（高八度）", midi: 72 },
      { label: "B", midi: 71 },
      { label: "D", midi: 74 },
    ],
    correct: 0,
    explain: "C D E F G A B 念完一遍又回到 C，所以第 8 个是 C，高了一个八度。",
  },
];

export const LEVEL1_CONCEPT = [
  "音高就是这个音有多高。键盘上越往右越高。白键是 C D E F G A B，黑键是它们中间的升降音。",
  "整台钢琴的黑键永远是「两个一组、三个一组」重复排下去的。看清这个分组，不用认字也知道自己在哪个键上——这是键盘给你的骨架。",
  "记住两个定位点：两个黑键那一组，左边紧挨着的白键是 C；三个黑键那一组，左边紧挨着的白键是 F。从 C 开始往上数 C D E F G A B，绕回 C 就是高八度。",
  "中央 C 记成 C4，在 MIDI 里是 60。高一个八度变成 C5（72），音名还是 C，只是高了一截。C4 是整台钢琴所有编号的锚点。",
  "这一关用 16 格步进器打四个四分音符。一格是一个十六分音符，一拍有四格，所以四分音符落在每拍的第一格：第 1、5、9、13 格。",
  "点琴键听到的是电钢音色。记住 C4 听起来是什么样，比记住字母管用——以后在 Cubase 里换成别的乐器，你也知道刚才那一下是哪个音。",
  "听辨题故意用纯音：把音色剥掉，只留音高。这样才不会把「听着像」误听成「音高近」。",
  "导出的 MIDI 带到 Cubase 之后，音色要在那里重新选，两者不会是同一个声音。",
];

export const LEVEL1_ANCHOR = anchorOf(1);
