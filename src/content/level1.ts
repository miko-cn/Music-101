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
export const LEVEL1_EAR_PASS = 4;

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
    ],
    correct: 1,
    explain: "A3 比 A4 低一个八度。",
  },
];

export const LEVEL1_CONCEPT = [
  "音高就是这个音有多高。键盘上越往右越高。白键是 C D E F G A B，黑键是它们中间的升降音。",
  "中央 C 记成 C4，在 MIDI 里是 60。高一个八度变成 C5（72），音名还是 C，只是高了一截。",
  "这一关用 16 格步进器打四个四分音符。一格是一个十六分音符，一拍有四格，所以四分音符落在每拍的第一格：第 1、5、9、13 格。",
  "网页里听到的音色只是用来认音高。导出的 MIDI 带到 Cubase 之后，音色要在那里重新选，两者不会是同一个声音。",
];
