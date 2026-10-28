import { runDiagnostics, type Diagnostic, type DiagnosticRule } from "../analyze/index.ts";
import { isQuarterBar } from "../sequencer/grid.ts";
import { PPQ, type MidiFile } from "../midi/types.ts";
import { skeletonToMidi, type SongSkeleton } from "../midi/project.ts";
import { writeMidiFile } from "../midi/writer.ts";
import {
  LEVEL1_BPM,
  LEVEL1_EAR,
  LEVEL1_EAR_PASS,
  LEVEL1_TARGET_PITCH,
  LEVEL1_TARGET_STEPS,
  type EarQuestion,
} from "../../content/lessons/level-01.ts";

export interface Level1State {
  earAnswers: (number | null)[];
  pitch: number | null;
  /** 至少 16 格。过关与导出只看前 16 格。 */
  steps: boolean[];
}

export const LEVEL1_FIX_PITCH = "set-pitch-c4";
export const LEVEL1_FIX_GRID = "set-quarter-grid";

export function emptyLevel1State(): Level1State {
  return {
    earAnswers: LEVEL1_EAR.map(() => null),
    pitch: null,
    steps: Array.from({ length: 16 }, () => false),
  };
}

export function scoreEar(answers: readonly (number | null)[], questions: readonly EarQuestion[] = LEVEL1_EAR): {
  correct: number;
  answered: number;
  total: number;
} {
  let correct = 0;
  let answered = 0;
  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) return;
    answered += 1;
    if (answer === question.correct) correct += 1;
  });
  return { correct, answered, total: questions.length };
}

function pitchRule(): DiagnosticRule<Level1State> {
  return {
    id: "level1-pitch",
    check: (state) => {
      if (state.pitch === LEVEL1_TARGET_PITCH) return [];
      return [
        {
          id: "level1-pitch",
          severity: "error",
          message:
            state.pitch === null
              ? "还没有选中 C4。中央 C 是 MIDI 60，在第 4 八度的白键 C 上。"
              : `当前音高是 ${state.pitch}，第 1 关要的是 C4（MIDI ${LEVEL1_TARGET_PITCH}）。`,
          fix: state.pitch !== null ? { label: "标出音高问题", actionId: LEVEL1_FIX_PITCH } : undefined,
        },
      ];
    },
  };
}

function gridRule(): DiagnosticRule<Level1State> {
  return {
    id: "level1-grid",
    check: (state) => {
      if (isQuarterBar(state.steps) && matchesTarget(state.steps)) return [];
      return [
        {
          id: "level1-grid",
          severity: "error",
          message: "四个四分音符要落在第 1、5、9、13 格，其余格子关掉。",
          bar: 0,
          fix: state.steps.some(Boolean) ? { label: "标出格子问题", actionId: LEVEL1_FIX_GRID } : undefined,
        },
      ];
    },
  };
}

function matchesTarget(steps: readonly boolean[]): boolean {
  return LEVEL1_TARGET_STEPS.every((on, index) => steps[index] === on);
}

const LEVEL1_RULES: readonly DiagnosticRule<Level1State>[] = [pitchRule(), gridRule()];

export function diagnoseLevel1(state: Level1State): Diagnostic[] {
  const found = runDiagnostics(LEVEL1_RULES, state);
  const ear = scoreEar(state.earAnswers);
  const earNotes: Diagnostic[] = [];
  if (ear.answered < ear.total) {
    earNotes.push({
      id: "level1-ear-left",
      severity: "warning",
      message: `听辨还剩 ${ear.total - ear.answered} 题没答。`,
    });
  } else if (ear.correct < LEVEL1_EAR_PASS) {
    earNotes.push({
      id: "level1-ear-score",
      severity: "error",
      message: `听辨对了 ${ear.correct}/${ear.total}，至少要对 ${LEVEL1_EAR_PASS} 题。可以改答案再提交。`,
    });
  }
  if (found.length === 0 && earNotes.length === 0) {
    return [
      {
        id: "level1-pass",
        severity: "info",
        message: "第 1 关通过。可以导出 MIDI，里面是 C4 上的四个四分音符。",
      },
    ];
  }
  return [...earNotes, ...found];
}

export function level1Passed(state: Level1State): boolean {
  return diagnoseLevel1(state).every((item) => item.severity === "info");
}

function level1HandAttempted(state: Level1State): boolean {
  return state.pitch !== null || state.steps.some(Boolean);
}

/**
 * 修正不代填 C4 / 四分格子。没动手做过就原样返回。
 */
export function applyLevel1Fix(state: Level1State, actionId: string): Level1State {
  if (actionId !== LEVEL1_FIX_PITCH && actionId !== LEVEL1_FIX_GRID) return state;
  if (!level1HandAttempted(state)) return state;
  return state;
}

export function level1Skeleton(state: Level1State): SongSkeleton {
  const pitch = state.pitch ?? LEVEL1_TARGET_PITCH;
  const notes = [];
  for (let index = 0; index < 16; index += 1) {
    if (state.steps[index] !== true) continue;
    notes.push({
      tick: index * (PPQ / 4),
      dur: 90,
      pitch,
      vel: 96,
    });
  }
  return {
    bpm: LEVEL1_BPM,
    keyRoot: 0,
    keyScale: "major",
    beatsPerBar: 4,
    totalBars: 1,
    sections: [{ name: "Level1", startBar: 0, bars: 1 }],
    tracks: [{ role: "MELODY", channel: 0, notes }],
    chords: [],
  };
}

export function level1ToMidi(state: Level1State): Uint8Array {
  return writeMidiFile(skeletonToMidi(level1Skeleton(state)));
}

export function level1MidiFile(state: Level1State): MidiFile {
  return skeletonToMidi(level1Skeleton(state));
}
