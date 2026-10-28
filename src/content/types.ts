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

/**
 * 一道听辨题。
 *
 * 三个文案字段各管一件事，缺一不可：
 *
 * - `explain` —— **解析**。为什么是这个答案。
 * - `wrongHint` —— **答错时的引导方向**。指出该用什么方法判断，但不给答案。
 * - `encourage` —— **答对时的反应**。把刚做对的事再说一遍，强化记忆。
 *
 * 为什么 `explain` 不能兼任错误提示：解析里通常直接写着答案
 * （「C 到 C♯ 只隔一个键」），学习者答错后看到它，等于被告知选哪个。
 * 错误提示必须给**方法**而不是**结论**——
 * 记住「那一题选了 B」没用，记住「怎么判断出是 B」才有用。
 */
export interface StageEar {
  id: string;
  prompt: string;
  choices: { label: string; midis: number[] }[];
  correct: number;
  /** 解析：为什么是这个答案。 */
  explain: string;
  /** 答错时的引导方向：指向判定方法，不给答案。 */
  wrongHint?: string;
  /** 答对时的反应：把刚做对的事再说一遍。 */
  encourage?: string;
  /**
   * 盲听：选项文字等检查之后才显示，只能靠耳朵分。
   *
   * 只给「选项文字就是这个声音本身的名字」的题开（音名、和弦名、进行名），
   * 而且选项的声音必须两两不同——守卫在 tests/lesson/ear-feedback.test.ts。
   */
  blind?: boolean;
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
  sections?: { name: string; startBar: number; bars: number; energy?: number; velocity?: number }[];
  /** 手做步播放一段侧链泵动。 */
  audition?: "sidechain";
  /** 手做步按当前选项画能量曲线。 */
  showEnergy?: boolean;
  /** 参考曲：从候选里选 BPM、调、结构。 */
  reference?: boolean;
  /** 这一关要配哪些教学图。图是内容的一部分，文字讲不清的形状交给它。 */
  diagrams?: DiagramSpec[];
  /** 和弦进行（第 7 关的 I–V–vi–IV）：图上画的每一步。 */
  progression?: ProgressionStep[];
  /** 频段分工（第 18 关）：每个角色占哪一段频率。 */
  frequencyBands?: FrequencyBandsSpec;
  /** 分层骨架（第 22 关）：主歌和副歌各有哪些层。 */
  layerStack?: LayerStackColumn[];
  /** 音程对照（第 3 关）：每一对音隔多远、几度几半音、协和度如何。 */
  intervals?: IntervalSpec[];
  /** 和弦三度堆叠（第 4 关）：根音 / 三音 / 五音怎么叠出来的。 */
  chordStack?: ChordStackSpec[];
  /** 音阶级数（第 5 关）：一个调里七个音各是第几级。 */
  scaleSteps?: ScaleStepSpec[];
  /** 和声功能（第 15 关）：T / S / D 各是什么、怎么循环。 */
  functions?: FunctionSpec[];
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
  /** 这一关要配哪些教学图。 */
  diagrams?: DiagramSpec[];
}

/** 全部关卡。 */
export type LessonEntry = StageLessonEntry | SpecialLessonEntry;

/** 判断是不是走标准流程的关卡。 */
export function isStageLesson(entry: LessonEntry): entry is StageLessonEntry {
  return "handChoices" in entry;
}

/*
 * 教学示意图
 * ----------
 *
 * 不少关卡的文案在描述**形状**：踢在第 1 和第 9 格、kick 只管 60Hz 以下、
 * kick 一响就把音量压下去。这些用文字读三遍也读不出形状，画一张图就一眼懂了。
 *
 * 但内容层只说「要哪张图 + 图注」，画法全在 UI 层：
 * 内容文件保持纯数据，不 import React，几何和配色改一处就全站生效。
 *
 * 图一律画成 SVG：音名、格数、频率刻度必须是准的，
 * 位图生不出来（会拼错音名、数错格子），而且 SVG 能跟着暗色主题走。
 */

/** 教学图的种类。新增一种就在 ui/diagrams/ 里加一个组件并登记。 */
export type DiagramKind =
  /** 键盘布局：黑键 2-3 分组、C 和 F 的定位点。 */
  | "keyboard-layout"
  /** 半音与全音：C 大调音阶里哪两处是半音。 */
  | "semitone-ruler"
  /** 和弦进行：I–V–vi–IV 这类循环。 */
  | "chord-progression"
  /** 鼓型网格：四件套在 16 格里落在哪。 */
  | "drum-grid"
  /** 侧链泵动：kick 一响把别的轨压下去。 */
  | "sidechain"
  /** 能量曲线：段落和层数撑起来的台阶。 */
  | "energy-curve"
  /** 频段分工：每个角色占哪一段频率。 */
  | "frequency-bands"
  /** 分层骨架：主歌两层、副歌多哪几层。 */
  | "layer-stack"
  /** 音程：两个音隔多远，几度几半音，挤不挤。 */
  | "interval-size"
  /** 和弦三度堆叠：根音、三音、五音一层层叠上去。 */
  | "chord-build"
  /** 音阶级数：一个调里七个音各是第几级。 */
  | "scale-degrees"
  /** 和声功能：T / S / D 怎么循环。 */
  | "harmony-function"
  /** 力度曲线：主歌收着、副歌推上去。 */
  | "dynamic-curve"
  /** 段落时间轴：一首歌分成哪几段。 */
  | "section-timeline";

/** 一张图 = 哪种图 + 一句图注。 */
export interface DiagramSpec {
  kind: DiagramKind;
  /** 图注：一句话说清这张图在讲什么。文字承担不了形状的部分，交给图。 */
  caption: string;
}

/** 和弦进行里的一步（第 7 关）。 */
export interface ProgressionStep {
  /** 罗马数字，如 "I"、"vi"。 */
  roman: string;
  /** 和弦符号，如 "C"、"Am"。 */
  symbol: string;
  /** 性质，如 "大三"、"小三"。 */
  quality?: string;
  /** 听感提示，如 "从家出发往上走"。 */
  feel?: string;
  /** 这个和弦的音（点了能听出来）。 */
  midis?: number[];
}

/** 频段分工里的一条（第 18 关）。 */
export interface FrequencyBand {
  /** 角色名，如 "踢 kick"。 */
  label: string;
  /** 角色代号，配色用，如 "kick"、"supersaw"。 */
  role?: string;
  /** 下限 Hz（0 表示没有下限）。 */
  from: number;
  /** 上限 Hz（0 表示没有上限）。 */
  to: number;
  /** 这个角色负责什么。 */
  note?: string;
  /** 示例音：点了能听见这个频段大概在什么音高。 */
  demoMidi?: number;
}

/** 频段分工的完整描述（第 18 关）。 */
export interface FrequencyBandsSpec {
  bands: FrequencyBand[];
  /** 谁都不该挤的频段（画成底色）。 */
  zone?: { from: number; to: number; label: string };
  /** 频率轴的范围。 */
  axis: { min: number; max: number };
}

/** 分层骨架的一列（第 22 关）：一列一层。 */
export interface LayerStackColumn {
  /** 列标题，如 "主歌"、"副歌"。 */
  title: string;
  layers: {
    /** 层名，如 "supersaw 和弦"。 */
    name: string;
    /** 这层负责什么。 */
    note?: string;
    /** 是不是这一段新加的层（加进来的用金色标出来）。 */
    added?: boolean;
    /**
     * 是不是装饰轨（FX / CHOP）。
     * 装饰轨不算进层数——第 9 关专门讲这条，图上要标出来。
     */
    decorative?: boolean;
  }[];
}

/** 音程对照里的一对音（第 3 关）。 */
export interface IntervalSpec {
  /** 低音的音高。 */
  from: number;
  /** 高音的音高。 */
  to: number;
  /** 度数名，如 "三度"。 */
  size: string;
  /** 性质，如 "大三度"。 */
  quality: string;
  /** 隔了几个半音。 */
  semitones: number;
  /** 协和度：稳 / 挤 / 紧张。 */
  harmony?: "稳" | "挤" | "紧张";
  /** 一句话说明。 */
  note?: string;
}

/** 和弦三度堆叠里的一列（第 4 关）。 */
export interface ChordStackSpec {
  /** 和弦符号，如 "C"、"Cm"。 */
  symbol: string;
  /** 性质，如 "大三"、"小三"。 */
  quality: string;
  /** 三个音，从低到高。 */
  midis: number[];
  /**
   * 每个音的显示拼写，如 ["C", "E♭", "G"]。
   *
   * 不写就按音高推（默认升号拼法），但同一个音高有好几种写法：
   * MIDI 63 既可以是 D♯ 也可以是 E♭，在 C 小调里必须写 E♭——
   * 正文说 E♭、图上写 D♯，学习者会以为这是两个不同的音。
   */
  names?: string[];
  /** 每个音的角色，如 "根音"、"三音"、"五音"。 */
  roles: string[];
  /** 这一列要强调什么。 */
  note?: string;
}

/** 音阶级数里的一步（第 5 关）。 */
export interface ScaleStepSpec {
  /** 音名，如 "C"、"E♭"。 */
  name: string;
  /** 音高。 */
  midi: number;
  /** 级数，如 "1"、"2"、"♭3"。 */
  degree: string;
  /** 这个音在调里干什么。 */
  role?: string;
}

/** 和声功能里的一块（第 15 关）。 */
export interface FunctionSpec {
  /** 代号：T / S / D。 */
  code: string;
  /** 中文名，如 "主功能"。 */
  label: string;
  /** 作用说明。 */
  role: string;
  /** 代表和弦符号。 */
  symbol?: string;
  /** 代表和弦的音（点了能听）。 */
  midis?: number[];
}
