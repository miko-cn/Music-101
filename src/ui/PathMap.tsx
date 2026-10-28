/**
 * 关卡路径图。
 *
 * 这是「我接下来该做什么」的答案。它替代了原来顶部那排平级按钮——
 * 七个功能并排放着，等于告诉用户「你有七个地方要去」，但没告诉他先去哪。
 *
 * 三个设计决定：
 *
 * 1. **节点上写关卡标题和记忆锚口诀，不只写关号。**
 *    「第 14 关」只是个编号；「和声张力与解决」是他真正学过的东西。
 *    学习者认的是名字，不是编号。
 *
 * 2. **它是一条路，不是一格菜单。**
 *    节点横向摆动、纵向排开，连线是曲线——读起来是「从这儿走到那儿」，
 *    而不是「这里有 27 个选项」。布局由 core/lesson/path-layout.ts 算。
 *
 * 3. **当前关会呼吸，其余安静。**
 *    呼吸只用 opacity，不动位置——整张路径图不该在动。
 */
import { useEffect, useRef, ViewTransition, type Ref } from "react";
import { Flex, Tag } from "antd";
import { buildPath, pathComplete, pathProgress, type PathNode } from "../core/lesson/path.ts";
import { layoutPath, NODE_HEIGHT, NODE_WIDTH } from "../core/lesson/path-layout.ts";
import type { ProgressFile } from "../core/lesson/progress.ts";
import { levelTitleTransitionName } from "./LessonHeader.tsx";

export function PathMap({
  progress,
  onOpenLevel,
}: {
  progress: ProgressFile;
  onOpenLevel: (levelId: number) => void;
}) {
  const stages = buildPath(progress);
  const tracks = layoutPath(stages);
  const { done, total } = pathProgress(progress);
  const complete = pathComplete(progress);
  const current = stages.flatMap((stage) => stage.nodes).find((node) => node.state === "current") ?? null;
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = currentRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [current?.id]);

  return (
    <Flex vertical gap={28} className="path-map">
      {current && (
        <section className={`path-next${complete ? " is-complete" : ""}`}>
          <div className="path-next-copy">
            <span className="path-next-kicker">{complete ? "全部掌握" : "接下来"}</span>
            <h2 className="path-next-title">
              第 {current.id} 关 · {current.title}
            </h2>
            <p className="path-next-hook">{current.hook}</p>
          </div>
          <div className="path-next-side">
            <Tag color="gold">
              {done} / {total}
            </Tag>
            <button type="button" className="path-next-go m101-press" onClick={() => onOpenLevel(current.id)}>
              {complete ? "再看一遍" : "开始这一关"}
            </button>
          </div>
        </section>
      )}

      {stages.map((stage, stageIndex) => {
        const track = tracks[stageIndex];
        if (!track) return null;
        const nodeById = new Map(stage.nodes.map((node) => [node.id, node]));
        return (
          <section key={stage.id} className="path-stage">
            <h3 className="path-stage-title">
              <span className="path-stage-index">{String(stageIndex + 1).padStart(2, "0")}</span>
              {stage.title}
            </h3>
            <div
              className="path-track"
              style={{ width: track.width, height: track.height }}
            >
              <svg
                className="path-track-line"
                width={track.width}
                height={track.height}
                viewBox={`0 0 ${track.width} ${track.height}`}
                aria-hidden="true"
              >
                <path className="path-track-glow" d={track.path} />
                <path d={track.path} />
              </svg>
              {track.positions.map((position) => {
                const node = nodeById.get(position.id);
                if (!node) return null;
                return (
                  <PathNodeButton
                    key={position.id}
                    node={node}
                    left={position.left}
                    top={position.top}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    buttonRef={node.state === "current" ? currentRef : undefined}
                    onOpenLevel={onOpenLevel}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </Flex>
  );
}

function PathNodeButton({
  node,
  left,
  top,
  width,
  height,
  buttonRef,
  onOpenLevel,
}: {
  node: PathNode;
  left: number;
  top: number;
  width: number;
  height: number;
  buttonRef?: Ref<HTMLButtonElement>;
  onOpenLevel: (levelId: number) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`path-node is-${node.state}`}
      style={{ left, top, width, height }}
      onClick={() => onOpenLevel(node.id)}
      aria-label={`第 ${node.id} 关 ${node.title}${node.stateText ? `，${node.stateText}` : ""}`}
    >
      <span className="path-node-number">第 {node.id} 关</span>
      <ViewTransition name={levelTitleTransitionName(node.id)}>
        <span className="path-node-name">{node.title}</span>
      </ViewTransition>
      <span className="path-node-hook">{node.hook}</span>
      {node.stateText ? (
        <span className={`path-node-badge is-${node.state}`}>{node.stateText}</span>
      ) : null}
    </button>
  );
}
