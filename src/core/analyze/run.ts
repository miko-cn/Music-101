import type { Diagnostic, DiagnosticRule } from "./types.ts";

/** 按注册顺序收集诊断。规则返回空数组就跳过，不额外发明结论。 */
export function runDiagnostics<State>(
  rules: readonly DiagnosticRule<State>[],
  state: State,
): Diagnostic[] {
  return rules.flatMap((rule) => rule.check(state));
}
