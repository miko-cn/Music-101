import { useMemo, useState } from "react";
import { Button, Card, Flex, Segmented, Tag } from "antd";
import { ABILITIES, LESSONS, STAGES } from "../content/index.ts";
import type { AbilityId, StageId } from "../content/types.ts";

/**
 * 记忆点总表。
 *
 * 每个记忆锚都住在它自己那一关的文件里，但一个锚只出现在那一关的「记忆点」步里——
 * 学完就散了。这一页把它们一次摊开，当考前速查表用：
 * 一眼扫到「八度堆叠法」或「转调的门与底」的完整要点，不用翻 27 关。
 *
 * 关卡、阶段分组、能力维度全部从 content/index.ts 派生，
 * 这里不再维护任何关号表。
 */

interface AnchorRow {
  levelId: number;
  title: string;
  name: string;
  hook: string;
  steps: string[];
  takeaway: string[];
  ability: AbilityId;
  stage: StageId;
}

function buildRows(): AnchorRow[] {
  return LESSONS.map((lesson) => ({
    levelId: lesson.id,
    title: lesson.title,
    name: lesson.anchor.name,
    hook: lesson.anchor.hook,
    steps: lesson.anchor.steps,
    takeaway: lesson.anchor.takeaway,
    ability: lesson.ability,
    stage: lesson.stage,
  }));
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
            ...ABILITIES.map((item) => ({ value: item.id, label: item.label })),
          ]}
        />
        <p className="hint">一页看全部记忆锚：口诀 + 判定流程 + 带走的结论。点关号跳回那一关。</p>
      </Flex>

      {STAGES.map((stage) => {
        const inStage = filtered.filter((row) => row.stage === stage.id);
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
                    <Tag>{ABILITIES.find((item) => item.id === row.ability)?.label ?? row.ability}</Tag>
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
