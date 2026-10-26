import type { LayerStackColumn } from "../../content/types.ts";
import { DiagramFrame, type DiagramProps } from "./Diagram.tsx";

/**
 * 第 22 关 · Future bass 骨架。
 *
 * 这一关的核心是一句反直觉的话：副歌变厚不是低音变多，是和声变厚。
 * 两列一摆——主歌两层、副歌四层，新增的两层用金色标出来——
 * 一眼就看出多出来的是 supersaw 和 chop，不是贝斯。
 */
const BAR_H = 34;
const BAR_GAP = 8;
const COL_W = 250;
const COL_GAP = 60;
const TOP = 44;

export function LayerStackDiagram({
  caption,
  columns,
}: DiagramProps & { caption: string; columns: readonly LayerStackColumn[] }) {
  const width = columns.length * COL_W + (columns.length - 1) * COL_GAP;
  const tallest = Math.max(...columns.map((column) => column.layers.length), 1);
  const height = TOP + tallest * (BAR_H + BAR_GAP) + 22;

  return (
    <DiagramFrame caption={caption}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`分层骨架：${columns
          .map((column) => `${column.title} ${column.layers.length} 层`)
          .join("，")}`}
      >
        <title>主歌与副歌的分层对照</title>

        {columns.map((column, columnIndex) => {
          const x = columnIndex * (COL_W + COL_GAP);
          // 装饰轨（FX / CHOP）不算层数——第 9 关专门讲这条。
          const counted = column.layers.filter((layer) => !layer.decorative);
          const added = counted.filter((layer) => layer.added).length;
          return (
            <g key={column.title}>
              <text x={x + COL_W / 2} y={24} textAnchor="middle" className="dg-column-title">
                {column.title}
              </text>
              <text
                x={x + COL_W / 2}
                y={40}
                textAnchor="middle"
                className="dg-small dg-muted"
              >
                {counted.length} 层
              </text>

              {column.layers.map((layer, layerIndex) => (
                <g key={layer.name}>
                  <rect
                    x={x}
                    y={TOP + layerIndex * (BAR_H + BAR_GAP)}
                    width={COL_W}
                    height={BAR_H}
                    rx={8}
                    className={
                      layer.decorative
                        ? "dg-layer dg-layer-decorative"
                        : layer.added
                          ? "dg-layer dg-layer-added"
                          : "dg-layer"
                    }
                  />
                  <text
                    x={x + 14}
                    y={TOP + layerIndex * (BAR_H + BAR_GAP) + 22}
                    className={layer.added ? "dg-small dg-strong" : "dg-small"}
                  >
                    {layer.name}
                  </text>
                  {layer.note && (
                    <text
                      x={x + COL_W - 14}
                      y={TOP + layerIndex * (BAR_H + BAR_GAP) + 22}
                      textAnchor="end"
                      className="dg-tiny dg-muted"
                    >
                      {layer.note}
                    </text>
                  )}
                </g>
              ))}

              {/* 这一段新加了几层。标注放在柱子左边——右边是画布边界，放不下。 */}
              {added > 0 && (
                <g>
                  <line
                    x1={x - 14}
                    y1={TOP + (column.layers.length - added) * (BAR_H + BAR_GAP)}
                    x2={x - 14}
                    y2={TOP + column.layers.length * (BAR_H + BAR_GAP) - BAR_GAP}
                    className="dg-arrow dg-strong-stroke"
                  />
                  <text
                    x={x - 22}
                    y={TOP + (column.layers.length - added / 2) * (BAR_H + BAR_GAP) + 4}
                    textAnchor="end"
                    className="dg-small dg-strong"
                  >
                    +{added} 层
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </DiagramFrame>
  );
}
