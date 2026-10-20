export const STEPS_PER_BAR = 16;
export type BarCount = 1 | 2 | 4;

export function stepCount(bars: BarCount): number {
  return bars * STEPS_PER_BAR;
}

/** 切换 1/2/4 小节时保留已经打开的格子，多出来的补关。 */
export function resizeSteps(steps: readonly boolean[], bars: BarCount): boolean[] {
  const count = stepCount(bars);
  return Array.from({ length: count }, (_, index) => steps[index] === true);
}

export function toggleStep(steps: readonly boolean[], index: number): boolean[] {
  if (index < 0 || index >= steps.length) return [...steps];
  return steps.map((on, cursor) => (cursor === index ? !on : on));
}

const QUARTER = new Set([0, 4, 8, 12]);

/** 四个四分音符：每拍的第一格，也就是第 1、5、9、13 格（从 1 数）。 */
export function isQuarterBar(steps: readonly boolean[]): boolean {
  const bar = steps.slice(0, STEPS_PER_BAR);
  if (bar.length < STEPS_PER_BAR) return false;
  return bar.every((on, index) => on === QUARTER.has(index));
}

export function quarterSteps(): boolean[] {
  return Array.from({ length: STEPS_PER_BAR }, (_, index) => QUARTER.has(index));
}
