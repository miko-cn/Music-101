import { midiToPitchClass, pitchClassToName, type PitchClass } from "./pitch.ts";

/** 支持的音阶种类。 */
export type ScaleId = "major" | "naturalMinor" | "harmonicMinor" | "melodicMinor";

/**
 * 各音阶相对主音的半音偏移（从第 1 级开始）。
 *
 * 三种小调只差在第 6、7 级：
 * - 自然小调：6、7 级都用小调音（偏移 8、10），最「安静」；
 * - 和声小调：第 7 级升高半音（偏移 11），形成导音以支撑属和弦（V）；
 * - 旋律小调：第 6、7 级都升高（偏移 9、11），上行时形成大调色彩。
 */
export const SCALE_INTERVALS: Record<ScaleId, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
};

/** 音阶的中文名称，用于展示调名。 */
export const SCALE_LABELS: Record<ScaleId, string> = {
  major: "大调",
  naturalMinor: "自然小调",
  harmonicMinor: "和声小调",
  melodicMinor: "旋律小调",
};

/**
 * 取得某个音阶的全部音级（0-11），按级数从低到高排列。
 * 根音超过 C 之后音级会「绕回」到 0，所以统一用 `midiToPitchClass` 折回 0-11，
 * 该函数同时也会拒绝非整数输入，避免把非法音高折成看似正常的音级。
 */
export function getScalePitches(root: PitchClass, scale: ScaleId): PitchClass[] {
  return SCALE_INTERVALS[scale].map((offset) => midiToPitchClass(root + offset));
}

/**
 * 判断某个 MIDI 音高是否属于该音阶。
 * 只看音级（不区分八度），因此高八度的同名字符也判定为调内。
 */
export function isInScale(pitch: number, root: PitchClass, scale: ScaleId): boolean {
  return getScalePitches(root, scale).includes(midiToPitchClass(pitch));
}

/**
 * 返回某个 MIDI 音高在音阶中的级数。
 * 级数从 1 开始计数（主音为 1 级）；不在调内时返回 `null`，
 * 表示「该音没有级数」而不是一个伪造的 0 或负数。
 */
export function degreeOfPitch(pitch: number, root: PitchClass, scale: ScaleId): number | null {
  const index = getScalePitches(root, scale).indexOf(midiToPitchClass(pitch));
  return index === -1 ? null : index + 1;
}

/** 生成可读的调名，例如 "A 大调"、"F# 自然小调"。 */
export function keyName(root: PitchClass, scale: ScaleId, preferFlat = false): string {
  return `${pitchClassToName(root, preferFlat)} ${SCALE_LABELS[scale]}`;
}
