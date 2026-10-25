/**
 * 听辨题怎么播。
 *
 * 一个选项里的音有两种完全不同的含义，播法不能一样：
 * - 旋律（音程、音阶）：音要一个接一个响，才听得出「高低差了多少」
 * - 和弦（三和弦、七和弦）：音必须同时响，才听得出「是什么性质的和弦」
 *
 * 之前所有选项都按固定间隔依次播，和弦被弹成了琶音——那是错的刺激物：
 * 问「哪个是大三和弦」时听到的是 C-E-G 的分解，弹的是琶音，答的却是和弦。
 */

export type EarChoiceKind = "single" | "melodic" | "block";

/** 旋律型选项里相邻两个音的间隔（秒）。 */
export const EAR_MELODIC_SPACING_SECONDS = 0.42;

/** 听辨题里一个和弦按住多久（秒）：够听清性质和明暗。 */
export const EAR_BLOCK_HOLD_SECONDS = 1.1;

/** 听辨题里一个旋律音按住多久（秒）：要短到下一个音进来时前一个已经让位。 */
export const EAR_MELODIC_HOLD_SECONDS = 0.3;

/**
 * 三度叠起来的音程（相对根音的半音数）。
 *
 * 覆盖大三/小三/减/增三和弦与它们的七和弦、六和弦、九和弦——
 * 也就是编曲里真正会用到的那批和弦音。
 */
const TERTIAN_CHORD_TONES = new Set([
  0, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 19, 20, 22, 23, 24,
]);

/**
 * 这些音是不是一个三度叠起来的和弦。
 *
 * 相对最低音，每个音都落在三度叠置的和弦音上。
 * 同一个音重复 N 次不算和弦——那是节奏题在数拍子。
 */
export function isTertianStack(midis: readonly number[]): boolean {
  if (midis.length < 3) return false;
  const sorted = [...midis].sort((a, b) => a - b);
  if (new Set(sorted).size < 3) return false;
  const root = sorted[0] ?? 0;
  return sorted.every((midi) => TERTIAN_CHORD_TONES.has(midi - root));
}

/**
 * 判断一个选项该按旋律播还是按和弦播。
 *
 * 判据是「这些音是一个声音对象，还是一串声音对象」。
 * 注意 `midis` 这个字段在不同题里含义不同：
 * - 音高题（音程、和弦、音阶）里它就是真音符
 * - 编制 / 节奏题里它是「次数和轨道」的编码（kick=36、贝斯=48、踩镲=42、supersaw=72），
 *   几个音就代表几层、几下
 * 所以规则必须同时容得下这两种：
 *
 * 1. 1 个音：单音
 * 2. 2 个音：一定是旋律（音程题）
 * 3. 同一个音重复 N 次：N 次事件，依次响（节奏题在数拍子）
 * 4. 排序后相邻两音都在二度以内：级进——音阶、级进旋律，依次响
 * 5. 三度叠起来：一个和弦，必须同时响
 * 6. 3 个音且跨度不超过一个八度：不管是不是三度叠起来，都是一个和弦
 *    （「哪个是大三和弦」里的干扰项 C F G 必须同时响，否则比的就成了琶音）
 * 7. 其余：散开的音是一串东西（和弦进行只存了根音），依次响
 */
export function earChoiceKind(midis: readonly number[]): EarChoiceKind {
  if (midis.length <= 1) return "single";
  if (midis.length === 2) return "melodic";
  if (new Set(midis).size === 1) return "melodic";
  const sorted = [...midis].sort((a, b) => a - b);
  let stepwise = true;
  for (let index = 1; index < sorted.length; index += 1) {
    if ((sorted[index] ?? 0) - (sorted[index - 1] ?? 0) > 2) stepwise = false;
  }
  if (stepwise) return "melodic";
  if (isTertianStack(sorted)) return "block";
  const span = (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0);
  if (sorted.length === 3 && span <= 12) return "block";
  return "melodic";
}

export interface EarScheduleNote {
  midi: number;
  /** 相对开始的秒数。 */
  offset: number;
}

/**
 * 把一个选项排成播放计划。
 *
 * 和弦：所有音同时响（offset 全是 0）。
 * 旋律：按顺序依次响（offset 递增）。
 */
export function earChoiceSchedule(midis: readonly number[]): EarScheduleNote[] {
  if (earChoiceKind(midis) === "block") {
    return midis.map((midi) => ({ midi, offset: 0 }));
  }
  return midis.map((midi, index) => ({
    midi,
    offset: index * EAR_MELODIC_SPACING_SECONDS,
  }));
}

/**
 * 这个选项该按住多久（秒）。
 *
 * 和弦要长到能听出性质；旋律要短到不跟下一个音叠在一起。
 */
export function earChoiceHoldSeconds(midis: readonly number[]): number {
  return earChoiceKind(midis) === "block"
    ? EAR_BLOCK_HOLD_SECONDS
    : EAR_MELODIC_HOLD_SECONDS;
}
