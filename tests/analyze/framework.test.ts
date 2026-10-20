import { describe, expect, it } from "vitest";
import { runDiagnostics, type DiagnosticRule } from "../../src/core/analyze/index.ts";

describe("诊断框架", () => {
  it("按顺序收集规则结果，空规则不产生诊断", () => {
    const rules: DiagnosticRule<{ value: number }>[] = [
      {
        id: "low",
        check: (state) =>
          state.value < 1
            ? [{ id: "low", severity: "error", message: "太小", fix: { label: "改成 1", actionId: "set-1" } }]
            : [],
      },
      { id: "quiet", check: () => [] },
      {
        id: "note",
        check: () => [{ id: "note", severity: "info", message: "可以了" }],
      },
    ];
    expect(runDiagnostics(rules, { value: 0 }).map((item) => item.id)).toEqual(["low", "note"]);
    expect(runDiagnostics(rules, { value: 2 }).map((item) => item.id)).toEqual(["note"]);
  });
});
