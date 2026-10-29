import { useRef, useState } from "react";
import { Alert, Button, Card, Flex, Popconfirm } from "antd";
import {
  abilityScores,
  difficultyAdvice,
  mistakeCounts,
  recommendationLists,
  MISTAKE_DRILLS,
} from "../core/lesson/personalize.ts";
import {
  MISTAKE_KINDS,
  deleteRecipe,
  emptyProgress,
  parseProgress,
  serializeProgress,
  type ProgressFile,
  type ProgressUpdate,
  type Recipe,
} from "../core/lesson/progress.ts";
import { dueReviewCards, nextReviewDueAt, reviewDueText } from "../core/lesson/review.ts";
import { ActivityHeatmap } from "./ActivityHeatmap.tsx";
import { alpha, extras, palette, whiteScale } from "./theme.ts";

export function ProgressBoard({
  progress,
  onProgress,
  onApply,
  onOpenReview,
}: {
  progress: ProgressFile;
  onProgress: (update: ProgressUpdate) => void;
  onApply: (recipe: Recipe) => void;
  onOpenReview: () => void;
}) {
  const scores = abilityScores(progress);
  const counts = mistakeCounts(progress);
  const lists = recommendationLists(progress);
  const advice = difficultyAdvice(progress.attempts);
  const due = dueReviewCards(progress.reviews, Date.now());
  const nextDue = nextReviewDueAt(progress.reviews);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [backupNote, setBackupNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  /** 导出一份 JSON 快照：换浏览器、清缓存前先存一份。 */
  const exportProgress = () => {
    const blob = new Blob([serializeProgress(progress)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `music-101-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupNote({ kind: "success", text: "已导出。建议存到网盘或邮箱，换环境时导入。" });
  };

  /** 导入备份：整个覆盖当前进度。 */
  const importProgress = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setBackupNote({ kind: "error", text: "这个文件读不出来，换一个从本页导出的 JSON 试试。" });
      return;
    }
    const parsed = parseProgress(text);
    const empty =
      parsed.passedLevels.length === 0 &&
      parsed.attempts.length === 0 &&
      parsed.recipes.length === 0 &&
      parsed.activity.length === 0 &&
      parsed.reviews.length === 0;
    if (empty) {
      // parseProgress 对坏数据返回空进度，不抛错——这里得自己拦住，
      // 否则导入一个 txt 会静默把已有进度清空。
      setBackupNote({ kind: "error", text: "这个文件里没有可导入的进度，可能不是本页导出的 JSON。" });
      return;
    }
    onProgress(() => parsed);
    setBackupNote({
      kind: "success",
      text: `已导入：${parsed.passedLevels.length} 关已掌握，${parsed.activity.length} 条学习记录，${parsed.recipes.length} 个配方，${parsed.reviews.length} 张复习卡。`,
    });
  };

  return (
    <Flex vertical gap={16}>
      <ActivityHeatmap activity={progress.activity} />
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
          {MISTAKE_KINDS.map((kind) => {
            const drill = MISTAKE_DRILLS[kind];
            if (!drill) return null;
            return (
              <p key={kind} className="lead">
                {drill.label}：{counts[kind]} 次
                {counts[kind] >= 2 ? `。${drill.text}` : ""}
              </p>
            );
          })}
        </Flex>
      </Card>
      <Card title="今日复习">
        <p className="lead">
          {due.length === 0
            ? "今天没有到期的复习。"
            : `今天要复习 ${due.length} 关：抽一道听辨题，答对往后挪一档，答错留在今天。`}
        </p>
        <p className="hint">
          {due.length === 0 && nextDue !== null
            ? `下一批 ${reviewDueText(nextDue, Date.now())}到期。`
            : "复习队列按遗忘曲线排：刚学的今天就要再看一次，记得牢的一个月才见一次。"}
        </p>
        <Button type="primary" disabled={due.length === 0} onClick={onOpenReview}>
          {due.length === 0 ? "今天没有要复习的" : `开始复习 ${due.length} 关`}
        </Button>
      </Card>
      <Card title="关卡推荐">
        <p className="lead">所有关卡都开着，没有锁。已掌握的可以跳过，没过的可以重开。</p>
        <p className="hint">可跳过：{lists.mastered.length === 0 ? "还没有" : lists.mastered.map((id) => `第 ${id} 关`).join("、")}</p>
        <p className="hint">可重开：{lists.retry.length === 0 ? "还没有" : lists.retry.map((id) => `第 ${id} 关`).join("、")}</p>
      </Card>
      <Card title="难度">
        {advice ? <Alert type={advice.kind === "harder" ? "info" : "warning"} showIcon title={advice.text} /> : <p className="hint">还看不出连续轻松或连续卡住。</p>}
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
      <Card title="备份">
        <p className="lead">
          进度存在<strong>这台电脑的这个浏览器</strong>里（localStorage）。关掉浏览器、重启电脑都还在，
          但<strong>换浏览器、换浏览器配置、清理浏览数据、用无痕窗口，都会丢</strong>——没有第二份。
        </p>
        <p className="hint">
          换浏览器或者清缓存之前，先点「导出进度」存一份 JSON；到了新环境再「导入进度」，
          关卡记录、配方、复习队列、学习热力图会一起过去。
        </p>
        <Flex gap={12} wrap align="center">
          <Button onClick={exportProgress}>导出进度</Button>
          <Button onClick={() => fileRef.current?.click()}>导入进度</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importProgress(file);
            }}
          />
          <Popconfirm
            title="清空全部进度？"
            description="关卡记录、配方、学习热力图都会没。这一步不能撤销——先导出备份。"
            okText="清空"
            cancelText="算了"
            okButtonProps={{ danger: true }}
            onConfirm={() => {
              onProgress(() => emptyProgress());
              setBackupNote({ kind: "success", text: "已清空。" });
            }}
          >
            <Button danger>清空全部进度</Button>
          </Popconfirm>
        </Flex>
        {backupNote ? (
          <Alert
            style={{ marginTop: 12 }}
            type={backupNote.kind}
            showIcon
            title={backupNote.text}
          />
        ) : null}
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
        <polygon key={ratio} points={ring(ratio)} fill="none" stroke={whiteScale.w16} />
      ))}
      {scores.map((item, index) => {
        const [x, y] = point(index, 1);
        const [labelX, labelY] = point(index, 1.22);
        return (
          <g key={item.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={whiteScale.w28} />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill={whiteScale.w88} fontSize="16">
              {item.label}
            </text>
          </g>
        );
      })}
      <polygon points={shape} fill={alpha(palette.accent, 0.35)} stroke={extras["blue-mid"]} strokeWidth="2" />
    </svg>
  );
}
