import type { Diagnostic, DiagnosticRule } from "../types.ts";
import { runDiagnostics } from "../run.ts";
import type { AnalysisSong } from "../song.ts";
import { colorRule } from "./color.ts";
import { energyRule } from "./energy.ts";
import { harmonyRule } from "./harmony.ts";
import { lowEndRule } from "./lowEnd.ts";
import { spectrumRule } from "./spectrum.ts";
import { structureRule } from "./structure.ts";

/** 规格 3.3 的六条。第 1 关的音高/格子规则不在这里。 */
export function arrangementRules(): DiagnosticRule<AnalysisSong>[] {
  return [harmonyRule(), energyRule(), lowEndRule(), spectrumRule(), structureRule(), colorRule()];
}

export function diagnoseArrangement(song: AnalysisSong): Diagnostic[] {
  return runDiagnostics(arrangementRules(), song);
}
