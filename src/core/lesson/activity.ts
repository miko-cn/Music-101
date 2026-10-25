/**
 * 学习活动的日期计算：热力图、连续天数、本月天数。
 *
 * 全部是纯函数，不碰 DOM 也不碰 localStorage——日期算法是最容易悄悄算错的地方
 * （时区、夏令时、跨月），所以逻辑和渲染必须分开，而且要能单测。
 */

import type { ActivityEntry } from "./progress.ts";

/** 本地时区的当天零点。 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 本地时区加天数。用本地时间构造，跨夏令时也不会错位。 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 本地时区的日期键，格式 `YYYY-MM-DD`。 */
export function dayKeyFromDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 时间戳 → 本地时区的日期键。 */
export function dayKey(at: number): string {
  return dayKeyFromDate(new Date(at));
}

/** 活动流 → 每天的次数。 */
export function activityByDay(entries: readonly ActivityEntry[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(entry.at);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return byDay;
}

/** 热力图的一格。 */
export interface HeatmapCell {
  /** `YYYY-MM-DD` */
  date: string;
  /** 当天的活动次数。 */
  count: number;
  /** 今天之后的格子——还没发生，画成空的。 */
  future: boolean;
}

export interface HeatmapGrid {
  /** 每一列是一周（周一起始），每列 7 格，周一到周日。 */
  weeks: HeatmapCell[][];
  /** 月份标签：落在第几列 + 显示的文字。 */
  months: { column: number; label: string }[];
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

/** 格子深浅分几档。 */
export function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * 排出热力图网格。
 *
 * 最后一列是「今天所在的那一周」——今天的格子在那一列的第 (今天是周几) 行，
 * 它后面的格子属于未来，画成空的。往前推 weeks-1 周。
 */
export function buildHeatmap(
  byDay: ReadonlyMap<string, number>,
  today: Date,
  weeks: number,
): HeatmapGrid {
  const total = Math.max(1, Math.floor(weeks));
  const todayStart = startOfDay(today);
  // getDay() 是 0=周日，转成 0=周一。
  const weekday = (todayStart.getDay() + 6) % 7;
  const lastWeekStart = addDays(todayStart, -weekday);
  const firstWeekStart = addDays(lastWeekStart, -(total - 1) * 7);

  const columns: HeatmapCell[][] = [];
  const months: { column: number; label: string }[] = [];
  let lastMonth = -1;
  let lastLabelColumn = -99;

  for (let week = 0; week < total; week += 1) {
    const column: HeatmapCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(firstWeekStart, week * 7 + day);
      const key = dayKeyFromDate(date);
      column.push({ date: key, count: byDay.get(key) ?? 0, future: date.getTime() > todayStart.getTime() });
    }
    columns.push(column);
    const first = column[0]!;
    const month = Number(first.date.slice(5, 7));
    if (month !== lastMonth) {
      lastMonth = month;
      // 标签会互相压住：跟上一个标签至少隔 3 列（约 45px），窄了就跳过这个月。
      if (week - lastLabelColumn >= 3) {
        lastLabelColumn = week;
        months.push({ column: week, label: `${month} 月` });
      }
    }
  }
  return { weeks: columns, months };
}

/** 左侧星期标签：只标一三五，避免太挤。 */
export function weekdayLabels(): { row: number; label: string }[] {
  return [0, 2, 4].map((row) => ({ row, label: WEEKDAY_LABELS[row] ?? "" }));
}

/**
 * 连续学习天数。
 *
 * 今天还没学不算断——从昨天开始数，不然「今天才刚打开」会显示成 0 天，很扫兴。
 */
export function currentStreak(byDay: ReadonlyMap<string, number>, today: Date): number {
  let cursor = startOfDay(today);
  if ((byDay.get(dayKeyFromDate(cursor)) ?? 0) === 0) cursor = addDays(cursor, -1);
  let streak = 0;
  while ((byDay.get(dayKeyFromDate(cursor)) ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** 一共有多少天学过。 */
export function activeDayCount(byDay: ReadonlyMap<string, number>): number {
  let count = 0;
  for (const value of byDay.values()) if (value > 0) count += 1;
  return count;
}

/** 本月（不含未来的空格子）学了多少天。 */
export function monthActiveDays(byDay: ReadonlyMap<string, number>, today: Date): number {
  const prefix = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}`;
  let count = 0;
  for (const [key, value] of byDay) {
    if (value > 0 && key.startsWith(prefix)) count += 1;
  }
  return count;
}
