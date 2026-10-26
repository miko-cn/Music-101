import type { ReactNode } from "react";

/**
 * 教学图的外壳。
 *
 * 每张图都是：一张 SVG + 一句图注。
 * 图注是文字该承担的部分（图讲形状，文字讲意思），
 * 写在图下面，学习者扫一眼就知道「这张图在说什么」。
 */
export function DiagramFrame({
  caption,
  actions,
  children,
}: {
  caption: string;
  /** 图上方的操作按钮（「听一听」这类）。 */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="diagram">
      {actions ? <div className="diagram-actions">{actions}</div> : null}
      <div className="diagram-canvas">{children}</div>
      <figcaption className="diagram-caption">{caption}</figcaption>
    </figure>
  );
}

/** 每张图都有的 props。 */
export interface DiagramProps {
  /**
   * 点图上的东西要发声时回调。
   *
   * 传的是一组 MIDI 音高：一个键传一个音，一个和弦传三个。
   * 没传就只画不响——图不能是必须发声才能用的。
   */
  onPlay?: (midis: number[]) => void;
  /** 听一段泵动（第 12 关）。 */
  onPump?: () => void;
}

/** 图里通用的几何常量。 */
export const DIAGRAM_PAD = 12;
