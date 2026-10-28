/**
 * 闯关首页是课程目录，不是地图。
 *
 * 顶卡回答「接下来做什么」。三个阶段是手风琴。
 * 开合放在这次挂载的 state 里：离开页面组件卸载，再回来恢复默认展开。
 */
import { useState, ViewTransition } from "react";
import {
  buildPath,
  continueLabels,
  continueTarget,
  currentPathNode,
  initialOpenStageIds,
  pathProgress,
  rowDelayMs,
  stageMastery,
  type PathNode,
  type PathStage,
} from "../core/lesson/path.ts";
import type { ProgressFile } from "../core/lesson/progress.ts";
import { levelTitleTransitionName } from "./LessonHeader.tsx";

export function PathMap({
  progress,
  onOpenLevel,
  onOpenReview,
}: {
  progress: ProgressFile;
  onOpenLevel: (levelId: number) => void;
  onOpenReview: () => void;
}) {
  const stages = buildPath(progress).filter((stage) => stage.nodes.length > 0);
  const current = currentPathNode(stages);
  const { done, total } = pathProgress(progress);
  const target = continueTarget(progress);
  const labels = continueLabels({
    complete: target.kind === "complete",
    dueCount: target.kind === "review" ? target.dueCount : 0,
  });
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(initialOpenStageIds(stages)));
  const [pulse, setPulse] = useState<Record<string, number>>({});

  const toggle = (id: string) => {
    const willOpen = !openIds.has(id);
    setOpenIds((currentIds) => {
      const next = new Set(currentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willOpen) {
      setPulse((currentPulse) => ({ ...currentPulse, [id]: (currentPulse[id] ?? 0) + 1 }));
    }
  };

  return (
    <div className="path-syllabus">
      {current || target.kind === "review" ? (
        <section className="path-next">
          <div className="path-next-copy">
            <span className="path-next-kicker">{labels.kicker}</span>
            <h2 className="path-next-title">
              {target.kind === "review"
                ? `今天 ${target.dueCount} 关到期`
                : current
                  ? `第 ${current.id} 关 · ${current.title}`
                  : labels.kicker}
            </h2>
            <p className="path-next-hook">
              {target.kind === "review" ? "先把到期的复习卡做完，再闯下一关。" : current?.hook}
            </p>
          </div>
          <div className="path-next-side">
            <p className="path-next-progress">
              <span className="sr-only">已掌握 </span>
              {done} / {total}
            </p>
            <button
              type="button"
              className="path-next-go m101-press"
              onClick={() => (target.kind === "review" ? onOpenReview() : current && onOpenLevel(current.id))}
            >
              {labels.action}
            </button>
          </div>
        </section>
      ) : null}
      <div className="path-stages">
        {stages.map((stage, stageIndex) => (
          <StageBlock
            key={stage.id}
            stage={stage}
            index={stageIndex}
            open={openIds.has(stage.id)}
            pulse={pulse[stage.id] ?? 0}
            onToggle={() => toggle(stage.id)}
            onOpenLevel={onOpenLevel}
          />
        ))}
      </div>
    </div>
  );
}

function StageBlock({
  stage,
  index,
  open,
  pulse,
  onToggle,
  onOpenLevel,
}: {
  stage: PathStage;
  index: number;
  open: boolean;
  pulse: number;
  onToggle: () => void;
  onOpenLevel: (levelId: number) => void;
}) {
  const mastery = stageMastery(stage);
  const panelId = `path-stage-${stage.id}`;
  return (
    <section className={open ? "path-stage is-open" : "path-stage"}>
      <h3 className="path-stage-heading">
        <button
          type="button"
          className="path-stage-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="path-stage-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="path-stage-name">{stage.title}</span>
          <span className="path-stage-count">
            {mastery.done} / {mastery.total}
          </span>
          <span className="path-stage-chevron" aria-hidden="true">
            ▸
          </span>
        </button>
      </h3>
      <div id={panelId} className="path-stage-panel" role="region">
        <div className="path-stage-panel-inner" inert={open ? undefined : true}>
          <ul className="path-rows">
            {stage.nodes.map((node, rowIndex) => (
              <li key={`${node.id}-${pulse}`}>
                <LevelRow node={node} index={rowIndex} onOpenLevel={onOpenLevel} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LevelRow({
  node,
  index,
  onOpenLevel,
}: {
  node: PathNode;
  index: number;
  onOpenLevel: (levelId: number) => void;
}) {
  const stateName =
    node.state === "current" ? "下一步" : node.state === "mastered" ? "已掌握" : node.state === "retry" ? "上次没过" : "";
  return (
    <button
      type="button"
      className={`path-row is-${node.state}`}
      style={{ animationDelay: `${rowDelayMs(index)}ms` }}
      onClick={() => onOpenLevel(node.id)}
      aria-current={node.state === "current" ? "step" : undefined}
      aria-label={stateName ? `第 ${node.id} 关 ${node.title}，${stateName}` : `第 ${node.id} 关 ${node.title}`}
    >
      <span className="path-row-copy">
        <ViewTransition name={levelTitleTransitionName(node.id)}>
          <span className="path-row-title">
            第 {node.id} 关 · {node.title}
          </span>
        </ViewTransition>
        <span className="path-row-hook">{node.hook}</span>
      </span>
      {node.state === "mastered" ? (
        <span className="path-row-mark" aria-hidden="true">
          ✓
        </span>
      ) : null}
      {node.state === "retry" ? <span className="path-row-dot" aria-hidden="true" /> : null}
    </button>
  );
}
