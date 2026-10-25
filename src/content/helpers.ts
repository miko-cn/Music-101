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

export function loopChords(count: number): SkeletonChord[] {
  const shapes = [
    { pitches: [60, 64, 67], text: "C (I)" },
    { pitches: [67, 71, 74], text: "G (V)" },
    { pitches: [69, 72, 76], text: "Am (vi)" },
    { pitches: [65, 69, 72], text: "F (IV)" },
  ];
  return Array.from({ length: count }, (_, bar) => {
    const shape = shapes[bar % 4] ?? shapes[0];
    return { tick: bar * BAR, pitches: shape.pitches, text: shape.text };
  });
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

export function ear(
  id: string,
  prompt: string,
  correctLabel: string,
  wrongLabel: string,
  explain: string,
  correctMidis: number[] = [60],
  wrongMidis: number[] = [61],
  extra?: { label: string; midis: number[] },
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
  return { id, prompt, choices, correct: correctIndex, explain };
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
