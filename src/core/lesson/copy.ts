/**
 * 反馈文案。
 *
 * 内容层的手写文案不重复，但反馈是**每次答题都会出现**的东西——
 * 一句「正确。」重复三百遍，耳朵会先于脑子关掉。
 * 所以这里备几条短句，按题号轮换，听感上不至于腻。
 *
 * 轮换按题号取模而不是随机：刷新页面顺序不变，
 * 学习者能预期第几题会听到哪句（虽然他不会刻意去记）。
 */

/** 答对时说的话。 */
const PRAISE = ["对了。", "就是这个。", "抓得准。", "听出来了。", "稳。"];

/** 答错时说的话。 */
const RETRY = ["再想想。", "差一点，再来。", "不对，再试一次。", "换个角度听。"];

/** 按种子取一句。种子用题号，保证同一题每次刷新都是同一句。 */
function pick(lines: readonly string[], seed: number): string {
  const index = Math.abs(Math.trunc(seed)) % lines.length;
  return lines[index] ?? lines[0] ?? "";
}

/** 答对时的那句。 */
export function praiseLine(seed: number): string {
  return pick(PRAISE, seed);
}

/** 答错时的那句。 */
export function retryLine(seed: number): string {
  return pick(RETRY, seed);
}
