import { Alert, Button, Card, Flex } from "antd";
import {
  abilityScores,
  difficultyAdvice,
  mistakeCounts,
  recommendationLists,
  MISTAKE_DRILLS,
} from "../core/lesson/personalize.ts";
import { MISTAKE_KINDS, deleteRecipe, type ProgressFile, type ProgressUpdate, type Recipe } from "../core/lesson/progress.ts";

export function ProgressBoard({
  progress,
  onProgress,
  onApply,
}: {
  progress: ProgressFile;
  onProgress: (update: ProgressUpdate) => void;
  onApply: (recipe: Recipe) => void;
}) {
  const scores = abilityScores(progress);
  const counts = mistakeCounts(progress);
  const lists = recommendationLists(progress);
  const advice = difficultyAdvice(progress.attempts);

  return (
    <Flex vertical gap={16}>
      <Card title="能力雷达">
        <RadarChart scores={scores.map((item) => ({ label: item.label, ratio: item.ratio }))} />
        <Flex gap={16} wrap>
          {scores.map((item) => (
            <span key={item.id} className="hint">
              {item.label} {item.passed}/{item.total}
            </span>
          ))}
        </Flex>
      </Card>
      <Card title="错误画像">
        <Flex vertical gap={8}>
          {MISTAKE_KINDS.map((kind) => (
            <p key={kind} className="lead">
              {MISTAKE_DRILLS[kind].label}：{counts[kind]} 次
              {counts[kind] >= 2 ? `。${MISTAKE_DRILLS[kind].text}` : ""}
            </p>
          ))}
        </Flex>
      </Card>
      <Card title="关卡推荐">
        <p className="lead">所有关卡都开着，没有锁。已掌握的可以跳过，没过的可以重开。</p>
        <p className="hint">可跳过：{lists.mastered.length === 0 ? "还没有" : lists.mastered.map((id) => `第 ${id} 关`).join("、")}</p>
        <p className="hint">可重开：{lists.retry.length === 0 ? "还没有" : lists.retry.map((id) => `第 ${id} 关`).join("、")}</p>
      </Card>
      <Card title="难度">
        {advice ? <Alert type={advice.kind === "harder" ? "info" : "warning"} showIcon message={advice.text} /> : <p className="hint">还看不出连续轻松或连续卡住。</p>}
      </Card>
      <Card title="配方库">
        {progress.recipes.length === 0 ? (
          <p className="hint">还没有配方。在某一关的手做步点「存成配方」。</p>
        ) : (
          <Flex vertical gap={12}>
            {progress.recipes.map((recipe) => (
              <Flex key={recipe.id} gap={8} wrap align="center">
                <span>
                  第 {recipe.levelId} 关 · {recipe.title} · {recipe.summary}
                </span>
                <Button size="small" type="primary" onClick={() => onApply(recipe)}>
                  套用
                </Button>
                <Button size="small" onClick={() => onProgress((current) => deleteRecipe(current, recipe.id))}>
                  删除
                </Button>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  );
}

export function RadarChart({ scores }: { scores: { label: string; ratio: number }[] }) {
  const cx = 180;
  const cy = 168;
  const radius = 108;
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / scores.length;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio] as const;
  };
  const ring = (ratio: number) => scores.map((_, index) => point(index, ratio).join(",")).join(" ");
  const shape = scores.map((item, index) => point(index, Math.max(0, Math.min(1, item.ratio))).join(",")).join(" ");

  return (
    <svg className="radar" viewBox="0 0 360 340" role="img" aria-label="能力雷达">
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon key={ratio} points={ring(ratio)} fill="none" stroke="rgba(255,255,255,0.16)" />
      ))}
      {scores.map((item, index) => {
        const [x, y] = point(index, 1);
        const [labelX, labelY] = point(index, 1.22);
        return (
          <g key={item.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.28)" />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="16">
              {item.label}
            </text>
          </g>
        );
      })}
      <polygon points={shape} fill="rgba(22,119,255,0.35)" stroke="#69b1ff" strokeWidth="2" />
    </svg>
  );
}
