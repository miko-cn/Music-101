/**
 * 关卡内容的共享构造器。
 *
 * 几乎每一关都要用，抽出来单独放：一关一个文件之后，
 * 每个关卡文件只 import 自己用得上的那几个。
 */
import type { PitchClass } from "../core/theory/pitch.ts";
import type { ScaleId } from "../core/theory/scale.ts";
import type { SkeletonChord, SkeletonNote, TrackRole } from "../core/midi/project.ts";
import { PPQ } from "../core/midi/types.ts";
import type { DrumLaneSpec, StageChoice, StageEar, StageLessonEntry } from "./types.ts";

export const BAR = 4 * PPQ;

export function melody(pitches: readonly number[], step = PPQ): SkeletonNote[] {
  return pitches.map((pitch, index) => ({
    tick: index * step,
    dur: Math.max(60, step - 40),
    pitch,
    vel: 96,
  }));
}

export function notesAt(bars: number[], pitch: number, vel = 90, dur = BAR - 40): SkeletonNote[] {
  return bars.map((bar) => ({ tick: bar * BAR, dur, pitch, vel }));
}

export function kicks(bars: number): SkeletonNote[] {
  const notes: SkeletonNote[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    for (const beat of [0, 1, 2, 3]) {
      notes.push({ tick: bar * BAR + beat * PPQ, dur: 100, pitch: 36, vel: 114 });
    }
  }
  return notes;
}

export function chord(bar: number, pitches: number[], text: string): SkeletonChord {
  return { tick: bar * BAR, pitches, text };
}

export type LoopProgression = "I-V-vi-IV" | "i-bVI-bIII-bVII";
export type LoopColor = "triad" | "add9" | "maj7";

export interface LoopChordsOptions {
  progression?: LoopProgression;
  color?: LoopColor;
  /** 最后一小节改落在 T（I 或 i），不断在 IV / ♭VII 上。 */
  cadenceT?: boolean;
}

const LOOP_SHAPES: Record<LoopProgression, Record<LoopColor, { pitches: number[]; text: string }[]>> = {
  "I-V-vi-IV": {
    triad: [
      { pitches: [60, 64, 67], text: "C (I)" },
      { pitches: [67, 71, 74], text: "G (V)" },
      { pitches: [69, 72, 76], text: "Am (vi)" },
      { pitches: [65, 69, 72], text: "F (IV)" },
    ],
    add9: [
      { pitches: [60, 64, 67, 74], text: "Cadd9 (I)" },
      { pitches: [67, 71, 74, 81], text: "Gadd9 (V)" },
      { pitches: [69, 72, 76, 83], text: "Am(add9)" },
      { pitches: [65, 69, 72, 79], text: "Fadd9 (IV)" },
    ],
    maj7: [
      { pitches: [60, 64, 67, 71], text: "Cmaj7 (I)" },
      { pitches: [67, 71, 74, 77], text: "G7 (V)" },
      { pitches: [69, 72, 76, 79], text: "Am7 (vi)" },
      { pitches: [65, 69, 72, 76], text: "Fmaj7 (IV)" },
    ],
  },
  "i-bVI-bIII-bVII": {
    triad: [
      { pitches: [69, 72, 76], text: "Am (i)" },
      { pitches: [65, 69, 72], text: "F (♭VI)" },
      { pitches: [60, 64, 67], text: "C (♭III)" },
      { pitches: [67, 71, 74], text: "G (♭VII)" },
    ],
    add9: [
      { pitches: [69, 72, 76, 83], text: "Am(add9)" },
      { pitches: [65, 69, 72, 79], text: "Fadd9 (♭VI)" },
      { pitches: [60, 64, 67, 74], text: "Cadd9 (♭III)" },
      { pitches: [67, 71, 74, 81], text: "Gadd9 (♭VII)" },
    ],
    maj7: [
      { pitches: [69, 72, 76, 79], text: "Am7 (i)" },
      { pitches: [65, 69, 72, 76], text: "Fmaj7 (♭VI)" },
      { pitches: [60, 64, 67, 71], text: "Cmaj7 (♭III)" },
      { pitches: [67, 71, 74, 77], text: "G7 (♭VII)" },
    ],
  },
};

export function loopChords(count: number, options: LoopChordsOptions = {}): SkeletonChord[] {
  const progression = options.progression ?? "I-V-vi-IV";
  const color = options.color ?? "triad";
  const shapes = LOOP_SHAPES[progression][color];
  const chords = Array.from({ length: count }, (_, bar) => {
    const shape = shapes[bar % 4] ?? shapes[0];
    return { tick: bar * BAR, pitches: [...shape.pitches], text: shape.text };
  });
  if (options.cadenceT && count > 0) {
    const tonic = shapes[progression === "i-bVI-bIII-bVII" ? 0 : 0];
    chords[count - 1] = { tick: (count - 1) * BAR, pitches: [...tonic.pitches], text: tonic.text };
  }
  return chords;
}

export function lane(role: DrumLaneSpec["role"], label: string, on: number[]): DrumLaneSpec {
  const target = Array.from({ length: 16 }, () => false);
  for (const step of on) target[step] = true;
  return { role, label, target };
}

export function track(role: TrackRole, channel: number, notes: SkeletonNote[]) {
  return { role, channel, notes };
}

export function choice(
  label: string,
  notes: SkeletonNote[] = [],
  chords: SkeletonChord[] = [],
  tracks?: StageChoice["tracks"],
): StageChoice {
  return { label, notes, chords, tracks };
}

export const hats = [0, 2, 4, 6, 8, 10, 12, 14];

/**
 * 听辨题的位置轮转。
 *
 * 正确答案如果永远排在第一个，学习者会形成「永远选第一」的答题习惯，
 * 听辨能力就练不出来。这里按声明顺序轮换正确项所在位置。
 */
let earSlot = 0;

/**
 * 答对 / 答错的文案。
 *
 * 收成对象而不是再加两个位置参数：ear() 已经有 8 个位置参数了，
 * 再加两个会到 10 个——那已经没法读了。
 */
export interface EarFeedback {
  /** 答错时的引导方向：指向判定方法，不给答案。 */
  wrongHint: string;
  /** 答对时的反应：把刚做对的事再说一遍。 */
  encourage: string;
  /**
   * 盲听：选项文字等检查之后才显示。
   * 手写题直接写在题目上；走 ear() 的模板题从这里透传。
   */
  blind?: boolean;
}

export function ear(
  id: string,
  prompt: string,
  correctLabel: string,
  wrongLabel: string,
  explain: string,
  correctMidis: number[] = [60],
  wrongMidis: number[] = [61],
  extra?: { label: string; midis: number[] },
  feedback?: EarFeedback,
): StageEar {
  const items = [
    { label: correctLabel, midis: correctMidis },
    { label: wrongLabel, midis: wrongMidis },
  ];
  if (extra) items.push({ label: extra.label, midis: extra.midis });
  const correct = items[0];
  const rest = items.slice(1);
  const correctIndex = earSlot++ % 3;
  const choices = [...rest];
  choices.splice(correctIndex, 0, correct);
  return {
    id,
    prompt,
    choices,
    correct: correctIndex,
    explain,
    wrongHint: feedback?.wrongHint,
    encourage: feedback?.encourage,
    blind: feedback?.blind,
  };
}

/**
 * 关卡的默认字段。
 *
 * 以前这层默认值住在 arranging.ts 的包装器里，只有 9 关往后用得上；
 * 现在 27 关统一走这一份，所以第 2–8 关也包进来。
 */
export function defineLesson(
  partial: Omit<StageLessonEntry, "earPass" | "bpm" | "keyRoot" | "keyScale"> &
    Partial<Pick<StageLessonEntry, "earPass" | "bpm" | "keyRoot" | "keyScale">>,
): StageLessonEntry {
  return {
    earPass: 5,
    bpm: 140,
    keyRoot: 0 as PitchClass,
    keyScale: "major" as ScaleId,
    ...partial,
  };
}
