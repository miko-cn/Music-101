import { useMemo, useState } from "react";
import { Button, Card, Flex, Segmented, Tag } from "antd";
import { ANCHORS } from "../content/anchors.ts";
import { STAGE_LESSONS } from "../content/stage1.ts";
import { ARRANGING_LESSONS } from "../content/arranging.ts";
import { LEVEL_ABILITY, type AbilityId } from "../core/lesson/personalize.ts";

/**
 * 记忆点总表。
 *
 * 27 个记忆锚现在都集中在 `content/anchors.ts`，但一个锚只出现在它那一关的
 * 「记忆点」步里——学完就散了。这一页把它们一次摊开，当考前速查表用：
 * 一眼扫到「八度堆叠法」或「转调的门与底」的完整要点，不用翻 27 关。
 */

interface AnchorRow {
  levelId: number;
  title: string;
  name: string;
  hook: string;
  steps: string[];
  takeaway: string[];
  ability: AbilityId;
}

const STAGES: { id: string; title: string; from: number; to: number }[] = [
  { id: "foundation", title: "阶段一 · 乐理地基", from: 1, to: 8 },
  { id: "arrangement", title: "阶段二 · 编曲决策", from: 9, to: 20 },
  { id: "style", title: "阶段三 · 风格套路", from: 21, to: 27 },
];

const ABILITY_LABELS: Record<AbilityId, string> = {
  harmony: "和声",
  rhythm: "节奏",
  arrangement: "配器",
  structure: "结构",
};

function buildRows(): AnchorRow[] {
  const lessons = [...STAGE_LESSONS, ...ARRANGING_LESSONS];
  const rows: AnchorRow[] = [];
  for (const lesson of lessons) {
    const anchor = ANCHORS[lesson.id];
    if (!anchor) continue;
    rows.push({
      levelId: lesson.id,
      title: lesson.title,
      name: anchor.name,
      hook: anchor.hook,
      steps: anchor.steps,
      takeaway: anchor.takeaway,
      ability: LEVEL_ABILITY[lesson.id] ?? "harmony",
    });
  }
  // 第 1 关的锚点不在 STAGE_LESSONS 里（它是关 1 单独的一套），单独补上
  const first = ANCHORS[1];
  if (first) {
    rows.unshift({
      levelId: 1,
      title: "音高与键盘",
      name: first.name,
      hook: first.hook,
      steps: first.steps,
      takeaway: first.takeaway,
      ability: LEVEL_ABILITY[1] ?? "harmony",
    });
  }
  return rows.sort((left, right) => left.levelId - right.levelId);
}

export function MemoryAnchors({ onOpenLevel }: { onOpenLevel: (levelId: number) => void }) {
  const [ability, setAbility] = useState<"all" | AbilityId>("all");
  const rows = useMemo(buildRows, []);

  const filtered = useMemo(
    () => (ability === "all" ? rows : rows.filter((row) => row.ability === ability)),
    [rows, ability],
  );

  return (
    <Flex vertical gap={16}>
      <Flex gap={12} wrap align="center" justify="space-between">
        <Segmented
          value={ability}
          onChange={(value) => setAbility(value as "all" | AbilityId)}
          options={[
            { value: "all", label: `全部 ${rows.length}` },
            ...(Object.keys(ABILITY_LABELS) as AbilityId[]).map((id) => ({
              value: id,
              label: ABILITY_LABELS[id],
            })),
          ]}
        />
        <p className="hint">一页看全部记忆锚：口诀 + 判定流程 + 带走的结论。点关号跳回那一关。</p>
      </Flex>

      {STAGES.map((stage) => {
        const inStage = filtered.filter((row) => row.levelId >= stage.from && row.levelId <= stage.to);
        if (inStage.length === 0) return null;
        return (
          <Card key={stage.id} title={stage.title}>
            <Flex vertical gap={12}>
              {inStage.map((row) => (
                <article className="anchor-row" key={row.levelId}>
                  <Flex gap={8} align="baseline" wrap>
                    <Button size="small" onClick={() => onOpenLevel(row.levelId)}>
                      第 {row.levelId} 关
                    </Button>
                    <strong className="anchor-name">{row.name}</strong>
                    <Tag>{ABILITY_LABELS[row.ability]}</Tag>
                    <span className="hint">{row.title}</span>
                  </Flex>
                  <p className="anchor-hook">{row.hook}</p>
                  <ol className="anchor-steps">
                    {row.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <ul className="anchor-takeaways">
                    {row.takeaway.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}
