import { describe, expect, it } from "vitest";
import {
  activeDayCount,
  activityByDay,
  addDays,
  buildHeatmap,
  currentStreak,
  dayKey,
  dayKeyFromDate,
  heatLevel,
  monthActiveDays,
  weekdayLabels,
} from "../../src/core/lesson/activity.ts";
import type { ActivityEntry } from "../../src/core/lesson/progress.ts";

/** 本地时间构造，避免测试受运行环境时区影响。 */
function local(year: number, month: number, day: number, hour = 12): Date {
  return new Date(year, month - 1, day, hour);
}

function entry(day: string, hour = 12): ActivityEntry {
  const [year, month, date] = day.split("-").map(Number);
  return { visitId: `${day}-${hour}`, levelId: 1, at: local(year!, month!, date!, hour).getTime() };
}

describe("学习活动 · 日期", () => {
  it("日期键用本地时区，不是 UTC", () => {
    // 本地时间当天 0 点整，必须还是这一天，不能因为 UTC 偏移跳到前一天。
    const midnight = local(2026, 10, 25, 0);
    expect(dayKey(midnight.getTime())).toBe("2026-10-25");
    // 当天 23:59 也还是同一天
    expect(dayKey(local(2026, 10, 25, 23).getTime())).toBe("2026-10-25");
  });

  it("按天聚合：同一天多条算多次", () => {
    const byDay = activityByDay([entry("2026-10-25", 9), entry("2026-10-25", 20), entry("2026-10-26", 10)]);
    expect(byDay.get("2026-10-25")).toBe(2);
    expect(byDay.get("2026-10-26")).toBe(1);
    expect(activeDayCount(byDay)).toBe(2);
  });
});

describe("学习活动 · 热力图网格", () => {
  it("最后一列是今天所在的那一周，今天在正确的行上", () => {
    const today = local(2026, 10, 28); // 2026-10-28 是星期三
    const grid = buildHeatmap(new Map(), today, 4);
    expect(grid.weeks).toHaveLength(4);
    const lastColumn = grid.weeks[3]!;
    expect(lastColumn).toHaveLength(7);
    // 星期三 → 第 3 行（下标 2）
    expect(lastColumn[2]?.date).toBe("2026-10-28");
    // 今天之后的格子标成未来
    expect(lastColumn[3]?.future).toBe(true);
    expect(lastColumn[2]?.future).toBe(false);
  });

  it("往前推的周数对得上", () => {
    const today = local(2026, 10, 28);
    const grid = buildHeatmap(new Map(), today, 4);
    // 第一列是今天那一周往前 3 周
    expect(grid.weeks[0]?.[0]?.date).toBe("2026-10-05");
  });

  it("每列都是周一到周日", () => {
    const grid = buildHeatmap(new Map(), local(2026, 10, 28), 2);
    for (const column of grid.weeks) {
      expect(column).toHaveLength(7);
      const [year, month, day] = column[0]!.date.split("-").map(Number);
      const first = new Date(year!, month! - 1, day!);
      // 第一格必须是周一
      expect(first.getDay()).toBe(1);
      // 七格是连续的七天（用 addDays 累加，别用固定毫秒数——夏令时会差一小时）
      column.forEach((cell, index) => {
        expect(cell.date).toBe(dayKeyFromDate(addDays(first, index)));
      });
    }
  });

  it("月份标签落在该月的第一列", () => {
    const grid = buildHeatmap(new Map(), local(2026, 10, 28), 12);
    const labels = grid.months.map((item) => item.label);
    expect(labels).toContain("10 月");
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it("活动次数落到对应的格子上", () => {
    const byDay = new Map([["2026-10-27", 3]]);
    const grid = buildHeatmap(byDay, local(2026, 10, 28), 4);
    const flat = grid.weeks.flat();
    const cell = flat.find((item) => item.date === "2026-10-27");
    expect(cell?.count).toBe(3);
  });
});

describe("学习活动 · 连续天数", () => {
  it("今天还没学不算断，从昨天往前数", () => {
    const byDay = new Map([
      ["2026-10-26", 1],
      ["2026-10-27", 1],
    ]);
    expect(currentStreak(byDay, local(2026, 10, 28))).toBe(2);
  });

  it("今天学了就连上今天", () => {
    const byDay = new Map([
      ["2026-10-26", 1],
      ["2026-10-27", 1],
      ["2026-10-28", 1],
    ]);
    expect(currentStreak(byDay, local(2026, 10, 28))).toBe(3);
  });

  it("中间断一天就断开", () => {
    const byDay = new Map([
      ["2026-10-25", 1],
      ["2026-10-27", 1],
    ]);
    expect(currentStreak(byDay, local(2026, 10, 28))).toBe(1);
  });

  it("本月天数只算本月", () => {
    const byDay = new Map([
      ["2026-09-30", 1],
      ["2026-10-01", 1],
      ["2026-10-02", 1],
    ]);
    expect(monthActiveDays(byDay, local(2026, 10, 28))).toBe(2);
  });
});

describe("学习活动 · 深浅分档", () => {
  it("次数越多档位越高", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(3)).toBe(2);
    expect(heatLevel(6)).toBe(3);
    expect(heatLevel(7)).toBe(4);
  });
});

describe("学习活动 · 星期标签", () => {
  it("只标一三五，避免太挤", () => {
    expect(weekdayLabels()).toEqual([
      { row: 0, label: "一" },
      { row: 2, label: "三" },
      { row: 4, label: "五" },
    ]);
  });
});
