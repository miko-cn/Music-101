/**
 * 关卡页顶部的标题，整个关卡生命周期都在。
 *
 * 它是路径节点标题的共享元素目标：点节点进关时，节点上的标题飞成这里的标题。
 * 原来的标题只在第 0 步的卡片里，切到别的步骤就没了。
 */
import { ViewTransition } from "react";

export function levelTitleTransitionName(levelId: number): string {
  return `level-title-${levelId}`;
}

export function LessonHeader({ levelId, title }: { levelId: number; title: string }) {
  return (
    <header className="lesson-header">
      <span className="lesson-header-number">第 {levelId} 关</span>
      <ViewTransition name={levelTitleTransitionName(levelId)}>
        <h2 className="lesson-header-title">{title}</h2>
      </ViewTransition>
    </header>
  );
}
