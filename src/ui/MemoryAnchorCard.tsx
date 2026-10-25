import type { MemoryAnchor } from "../content/types.ts";

/**
 * 记忆锚卡片。
 *
 * 这一关要留给学习者的那一个"抓得住的东西"：一句口诀 + 一条能自己走一遍的判定流程。
 * showTakeaway 打开时额外显示"带走这一关"的结论清单。
 */
export function MemoryAnchorCard({
  anchor,
  showTakeaway = false,
}: {
  anchor: MemoryAnchor;
  showTakeaway?: boolean;
}) {
  return (
    <section className="anchor-card">
      <p className="anchor-hook">
        <span className="anchor-name">记忆锚 · {anchor.name}</span>
        {anchor.hook}
      </p>
      <ol className="anchor-steps">
        {anchor.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {showTakeaway && (
        <>
          <h3 className="anchor-takeaway-title">带走这一关</h3>
          <ul className="anchor-takeaway">
            {anchor.takeaway.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
