/**
 * 课程内容的类型。
 *
 * 单独一个文件，是因为内容已经拆成一关一个文件了——
 * 每个关卡文件都要引用同一套类型，类型放在自己那儿会让 27 个文件各写一遍。
 */
import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote, TrackRole } from "../core/midi/project.ts";
import type { MistakeKind } from "../core/lesson/mistakes.ts";

/** 关卡文件要用到的核心类型，从这里统一转出去，import 就不用写三条路径。 */
export type { PitchClass, ScaleId, SkeletonChord, SkeletonNote, TrackRole };

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
 * 记忆锚库：一关留给学习者的那一个"抓得住的东西"。
 *
 * 依据 Open Music Theory v2 的做法：每章开头都有 KEY TAKEAWAYS，
 * 而每个可操作的概念都配一条"判定流程"（例如音程性质用"主音想象法"，
 * 而不是数半音）。流程比结论更好记，因为它能自己走一遍。
 *
 * hook     = 能背下来的那一句
 * steps    = 能自己走一遍的判定流程
 * takeaway = 带走这一关的结论清单
 */
export interface MemoryAnchor {
  /** 锚点代号，例如 "tonic-imagine"。 */
  id: string;
  /** 锚点名字，例如 "主音想象法"。 */
  name: string;
  /** 一句话口诀。 */
  hook: string;
  /** 判定流程，从上往下走。 */
  steps: string[];
  /** 带走这一关的结论（KEY TAKEAWAYS 风格）。 */
  takeaway: string[];
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

/** 阶段：课程分几大段。 */
export type StageId = "foundation" | "arrangement" | "style";

/** 能力维度：进度页的能力雷达按它统计。 */
export type AbilityId = "harmony" | "rhythm" | "arrangement" | "structure";

/**
 * 一关的补救措施。
 *
 * 关卡自己声明「我能补救哪一类错、具体怎么补救」，
 * 这样「这类错该去复习哪一关」就不用再手写关号。
 */
export interface LessonFix {
  /** 补救的错误类型。 */
  kind: MistakeKind;
  /** 具体动作——这一关特有的说法。 */
  advice: string;
}

/**
 * 一关的全部内容，自包含。
 *
 * 加一关 = 加一个文件 + 在 index.ts 的清单里加一行。
 * 关号、标题、阶段、能力、前置、记忆锚全在这一关里，
 * 别处不再重复写这些数字。
 */
export interface StageLessonEntry extends StageLesson {
  /** 阶段：地基 / 编曲 / 风格。 */
  stage: StageId;
  /** 能力维度，进度页的能力雷达按它统计。 */
  ability: AbilityId;
  /** 手做第几题选错，算哪一类错误。 */
  mistakeKinds?: Record<number, MistakeKind>;
  /** 这一关能补救哪一类错误——决定「这类错该去复习哪一关」。 */
  fixes?: LessonFix[];
}

/**
 * 走自己流程的关卡。
 *
 * 目前只有第 1 关：它用 16 格步进器和琴键选音，
 * 跟「单选题 + 概念卡」那套流程不是一回事，硬套会造假数据。
 * 但它的编号、标题、阶段、能力、记忆锚照样要跟别的关卡放在同一个体系里。
 */
export interface SpecialLessonEntry {
  id: number;
  title: string;
  stage: StageId;
  ability: AbilityId;
  anchor: MemoryAnchor;
  /** 概念段落。 */
  concept: string[];
}

/** 全部关卡。 */
export type LessonEntry = StageLessonEntry | SpecialLessonEntry;

/** 判断是不是走标准流程的关卡。 */
export function isStageLesson(entry: LessonEntry): entry is StageLessonEntry {
  return "handChoices" in entry;
}
