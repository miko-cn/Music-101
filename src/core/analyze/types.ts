export type Severity = "info" | "warning" | "error";

export interface FixAction {
  label: string;
  /** 界面认得的动作名。框架本身不改状态。 */
  actionId: string;
}

export interface Diagnostic {
  id: string;
  severity: Severity;
  message: string;
  /** 从 0 开始的小节。没有定位时省略。 */
  bar?: number;
  step?: number;
  fix?: FixAction;
}

export interface DiagnosticRule<State> {
  id: string;
  check: (state: State) => Diagnostic[];
}
