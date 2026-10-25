import { useMemo } from "react";
import { Card, Flex } from "antd";
import {
  activeDayCount,
  activityByDay,
  buildHeatmap,
  currentStreak,
  heatLevel,
  monthActiveDays,
  weekdayLabels,
} from "../core/lesson/activity.ts";
import type { ActivityEntry } from "../core/lesson/progress.ts";

/**
 * 每日学习热力图。
 *
 * 一列一周，每列 7 格（周一到周日），跟 GitHub 的贡献图一个读法。
 * 颜色深浅是当天的活跃度：学过 1 次最浅，7 次以上最深。
 *
 * 数据来自「学习活动流」（进一次关卡记一条），不是「尝试记录」——
 * 尝试记录要留给难度自适应，热力图不该污染那个序列。
 */
export function ActivityHeatmap({
  activity,
  weeks = 26,
  title = "每日学习",
}: {
  activity: readonly ActivityEntry[];
  weeks?: number;
  title?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const byDay = useMemo(() => activityByDay(activity), [activity]);
  const grid = useMemo(() => buildHeatmap(byDay, today, weeks), [byDay, today, weeks]);
  const labels = useMemo(() => weekdayLabels(), []);
  const streak = useMemo(() => currentStreak(byDay, today), [byDay, today]);
  const activeDays = useMemo(() => activeDayCount(byDay), [byDay]);
  const monthDays = useMemo(() => monthActiveDays(byDay, today), [byDay, today]);
  const total = useMemo(() => {
    let sum = 0;
    for (const value of byDay.values()) sum += value;
    return sum;
  }, [byDay]);

  return (
    <Card title={title}>
      <Flex gap={24} wrap align="flex-start">
        <div className="heatmap">
          <div className="heatmap-months">
            {grid.months.map((month) => (
              <span key={`${month.column}-${month.label}`} style={{ left: `${month.column * 15}px` }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="heatmap-body">
            <div className="heatmap-weekdays">
              {labels.map((item) => (
                <span key={item.row} style={{ top: `${item.row * 15}px` }}>
                  {item.label}
                </span>
              ))}
            </div>
            <div className="heatmap-grid">
              {grid.weeks.map((column, index) => (
                <div className="heatmap-week" key={index}>
                  {column.map((cell) => (
                    <div
                      key={cell.date}
                      className={`heatmap-cell level-${heatLevel(cell.count)}${cell.future ? " is-future" : ""}`}
                      title={`${cell.date} · ${cell.count > 0 ? `学过 ${cell.count} 次` : "没学"}`}
                      aria-label={`${cell.date}，${cell.count > 0 ? `学过 ${cell.count} 次` : "没学"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-stats">
          <p>
            <strong>{streak}</strong> 天连续
          </p>
          <p>
            <strong>{monthDays}</strong> 天本月
          </p>
          <p>
            <strong>{activeDays}</strong> 天总共
          </p>
          <p>
            <strong>{total}</strong> 次
          </p>
          <div className="heatmap-legend">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`heatmap-cell level-${level}`} />
            ))}
            <span>多</span>
          </div>
        </div>
      </Flex>
    </Card>
  );
}
