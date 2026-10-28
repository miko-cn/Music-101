/**
 * 路径图的布局计算。
 *
 * 路径图必须是**一条路**，不是一格一格的菜单。区别在哪儿：
 * 格子告诉「有 27 个关」，路告诉「你从这儿走到那儿」。
 *
 * 节点横向摆动、纵向排开，连线是一条曲线。
 *
 * **摆动周期是 3 个节点**：0 → +幅 → -幅 → 0，三个一组正好左右交替一次，
 * 相邻节点错开约 0.87×幅，读起来是蛇形而不是「一列」。
 *
 * 三个阶段的关数（8 / 12 / 7）都不是 3 的倍数，所以**阶段的首尾不一定回到中线**。
 * 这没关系——阶段之间本来就要断开（「地基 → 编曲 → 风格」是三次跳跃，
 * 看得见才对），每个阶段内部摆得漂亮就够了。
 *
 * 全部是纯计算，不碰 DOM：布局数值要能单测，
 * 而且尺寸以后想改（比如换字号）只改这一处。
 */
import type { PathStage } from "./path.ts";

/** 节点宽度（像素）。 */
export const NODE_WIDTH = 200;
/** 节点高度（像素）。 */
export const NODE_HEIGHT = 148;
/**
 * 节点之间的纵向间距（像素）。
 *
 * 间距是连线露出来的唯一地方——线画在节点底下，
 * 节点挨太近的话线就只在缝里闪一下，看着是断的。
 * 40px 上下刚好能看见一段弧。
 */
export const NODE_GAP = 40;
/**
 * 横向摆动的最大幅度（像素）。
 *
 * 要弯得出来，但不能弯到像演示用的大蛇。
 * 三阶段并排读的时候，过宽的摆幅会把航道撑满整屏。
 *
 * 关键约束：**幅度仍要大于节点宽度的一半**，否则相邻两个节点
 * 横向重叠过半，整条线几乎全被节点盖住，图就退化成列表。
 * 200px 的节点配 110px 幅度：弧还在，航道收得住。
 */
export const NODE_AMPLITUDE = 110;
/** 轨道左右各留的边距。 */
export const TRACK_PADDING = 24;

/** 一个节点在轨道里的位置（相对于轨道左上角）。 */
export interface NodePosition {
  id: number;
  /** 中心点横坐标。 */
  x: number;
  /** 中心点纵坐标。 */
  y: number;
  /** 节点左上角（绝对定位用）。 */
  left: number;
  /** 节点左上角纵坐标。 */
  top: number;
}

/** 一个阶段一条轨道。 */
export interface StageTrack {
  id: string;
  width: number;
  height: number;
  positions: NodePosition[];
  /** 连接线的 SVG path 数据（一条 d 串画完所有段）。 */
  path: string;
}

/**
 * 两个点之间的曲线段。
 *
 * 只给 `C` 部分——起点由 `M` 统一写一次，整条路径是**一条**连续的线，
 * 不是若干条首尾相接的子路径。后者在 SVG 里合法，但每次重画要重画全部子路径，
 * 而且语义上不对：它画的是一串线段，不是一条路。
 */
function curveSegment(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `C ${midX.toFixed(2)} ${y1.toFixed(2)}, ${midX.toFixed(2)} ${y2.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** 算一个阶段的轨道。 */
export function layoutStage(stage: PathStage, stageIndex: number): StageTrack {
  const count = stage.nodes.length;
  // 后面的阶段只略宽一点。差太大的话，第三航道会比第一航道胖一圈。
  const amplitude = NODE_AMPLITUDE * (1 + stageIndex * 0.06);
  // 节点中心在中线两侧 ±amplitude 摆动。
  // 中线要落在轨道正中，所以中线 = 左边界 + 摆幅 + 半个节点宽。
  const centerX = TRACK_PADDING + amplitude + NODE_WIDTH / 2;
  const positions: NodePosition[] = stage.nodes.map((node, index) => {
    // 周期固定 3 个节点：0 → +amp → -amp → 0。
    // 三个一组正好左右交替一次，相邻节点错开约 0.87×amp——
    // 读起来是蛇形，不是「一列」（那样摆动就白做了）。
    //
    // 阶段的首尾不回中线也没关系：阶段之间本来就断开。
    const t = index / 3;
    const offset = Math.sin(t * Math.PI * 2) * amplitude;
    const x = centerX + offset;
    const y = index * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT / 2;
    return {
      id: node.id,
      x,
      y,
      left: x - NODE_WIDTH / 2,
      top: y - NODE_HEIGHT / 2,
    };
  });

  // 连线：一条 `M` 起头，后面每段一个 `C`。
  //
  // 端点用节点的**边缘**而不是中心：
  // 连中心的话，线会从节点内部斜穿过去，露出来的那一截看着像
  // 从卡片中间长出来的一根树枝。连边缘才是「从这张卡走到下一张卡」。
  let path = "";
  if (positions.length >= 2) {
    const first = positions[0]!;
    // 从第一个节点的下边缘出发。
    path = `M ${first.x.toFixed(2)} ${(first.y + NODE_HEIGHT / 2).toFixed(2)}`;
    for (let index = 1; index < positions.length; index += 1) {
      const from = positions[index - 1]!;
      const to = positions[index]!;
      // 从上一张卡的下边缘，到下一张卡的上边缘。
      path += ` ${curveSegment(
        from.x,
        from.y + NODE_HEIGHT / 2,
        to.x,
        to.y - NODE_HEIGHT / 2,
      )}`;
    }
  }

  return {
    id: stage.id,
    // 内容跨度 = 两侧各（摆幅 + 半个节点宽），再加左右留白。
    width: (amplitude + NODE_WIDTH / 2) * 2 + TRACK_PADDING * 2,
    height: count === 0 ? 0 : (count - 1) * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT,
    positions,
    path: path.trim(),
  };
}

/** 算所有阶段的轨道。 */
export function layoutPath(stages: readonly PathStage[]): StageTrack[] {
  return stages.map((stage, index) => layoutStage(stage, index));
}
