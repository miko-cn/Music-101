import type { AnalysisSong } from "../analyze/song.ts";
import type { Diagnostic } from "../analyze/types.ts";
import { GM_DRUM_PITCH, skeletonToMidi, type SongSkeleton } from "../midi/project.ts";
import { PPQ } from "../midi/types.ts";
import { writeMidiFile } from "../midi/writer.ts";
import { stageLesson } from "../../content/index.ts";
import type { StageLesson } from "../../content/types.ts";
import {
  chorusLifted,
  endsOnTonic,
  hasTaughtColor,
  inKeyChords,
  taughtProgression,
} from "./capstone.ts";

export interface StageState {
  earAnswers: (number | null)[];
  hand: number | null;
  drums?: boolean[][];
  referencePick?: { bpm: number | null; key: number | null; structure: number | null };
  /** 点过修正：只标问题，不代填答案。 */
  fixHighlight?: boolean;
}

export const STAGE_FIX_HAND = "stage-hand-correct";

export function emptyStageState(lesson: StageLesson): StageState {
  return {
    earAnswers: lesson.ear.map(() => null),
    hand: null,
    drums: lesson.drums?.map(() => Array.from({ length: 16 }, () => false)),
    referencePick: lesson.reference ? { bpm: null, key: null, structure: null } : undefined,
  };
}

export function stageEarScore(lesson: StageLesson, answers: readonly (number | null)[]): {
  correct: number;
  answered: number;
  total: number;
} {
  let correct = 0;
  let answered = 0;
  lesson.ear.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) return;
    answered += 1;
    if (answer === question.correct) correct += 1;
  });
  return { correct, answered, total: lesson.ear.length };
}

export function diagnoseStage(lesson: StageLesson, state: StageState): Diagnostic[] {
  const ear = stageEarScore(lesson, state.earAnswers);
  const found: Diagnostic[] = [];
  if (ear.answered < ear.total) {
    found.push({
      id: `${lesson.marker}-ear-left`,
      severity: "warning",
      message: `听辨还剩 ${ear.total - ear.answered} 题没答。`,
    });
  } else if (ear.correct < lesson.earPass) {
    found.push({
      id: `${lesson.marker}-ear-score`,
      severity: "error",
      message: `听辨对了 ${ear.correct}/${ear.total}，至少要对 ${lesson.earPass} 题。`,
    });
  }
  if (lesson.drums) {
    const lanes = state.drums ?? [];
    const matched = lesson.drums.every((lane, laneIndex) =>
      lane.target.every((on, step) => lanes[laneIndex]?.[step] === on),
    );
    if (!matched) {
      found.push({
        id: `${lesson.marker}-drums`,
        severity: "error",
        message: state.fixHighlight
          ? "鼓组还没打成目标。对照目标格再改，修正不会代填。"
          : "鼓组还没打成目标。踢在第 1、9 格，军鼓和拍手在第 5、13 格，踩镲打八分音符。",
        fix: hasHandAttempt(lesson, state)
          ? { label: "标出这套鼓的问题", actionId: STAGE_FIX_HAND }
          : undefined,
      });
    }
  } else if (lesson.reference) {
    const pick = state.referencePick;
    if (!pick || pick.bpm === null || pick.key === null || pick.structure === null) {
      found.push({
        id: `${lesson.marker}-reference`,
        severity: "error",
        message: "先用示例或上传一首歌，再从 BPM、调、结构候选里各选一个。",
      });
    }
  } else if (lesson.id === 26) {
    found.push(...diagnoseCapstoneHand(lesson, state));
  } else if (state.hand === null) {
    found.push({
      id: `${lesson.marker}-hand-empty`,
      severity: "error",
      message: "手做题还没选。",
    });
  } else if (state.hand !== lesson.handCorrect) {
    found.push({
      id: `${lesson.marker}-hand-wrong`,
      severity: "error",
      message: state.fixHighlight
        ? "手做还不对。对照概念卡再选，修正不会代填答案。"
        : "手做题选错了。看概念卡里的规则再选一次。",
      fix: { label: "标出这题的问题", actionId: STAGE_FIX_HAND },
    });
  }
  if (found.length === 0) {
    return [
      {
        id: `${lesson.marker}-pass`,
        severity: "info",
        message: `第 ${lesson.id} 关通过，可以导出 MIDI。`,
      },
    ];
  }
  return found;
}

export function stagePassed(lesson: StageLesson, state: StageState): boolean {
  return diagnoseStage(lesson, state).every((item) => item.severity === "info");
}

/** 动手做过手做才给修正：没选过就一键填 = 白过。 */
export function hasHandAttempt(lesson: StageLesson, state: StageState): boolean {
  if (lesson.drums) return (state.drums ?? []).some((lane) => lane.some(Boolean));
  if (lesson.reference) {
    const pick = state.referencePick;
    return Boolean(pick && (pick.bpm !== null || pick.key !== null || pick.structure !== null));
  }
  return state.hand !== null;
}

/**
 * 修正只标问题，不代填答案。
 * 没动手做过就什么也不改。
 */
export function applyStageFix(lesson: StageLesson, state: StageState): StageState {
  if (!hasHandAttempt(lesson, state)) return state;
  return { ...state, fixHighlight: true };
}

function diagnoseCapstoneHand(lesson: StageLesson, state: StageState): Diagnostic[] {
  if (state.hand === null) {
    return [
      {
        id: `${lesson.marker}-hand-empty`,
        severity: "error",
        message: "还没选出一套骨架。",
      },
    ];
  }
  const choice = lesson.handChoices[state.hand];
  if (!choice) {
    return [
      {
        id: `${lesson.marker}-hand-empty`,
        severity: "error",
        message: "还没选出一套骨架。",
      },
    ];
  }
  const found: Diagnostic[] = [];
  const fix = { label: "标出这套骨架的问题", actionId: STAGE_FIX_HAND };
  if (!taughtProgression(choice.chords)) {
    found.push({
      id: `${lesson.marker}-harmony`,
      severity: "error",
      message: "和声要用教过的 I–V–vi–IV 或 i–♭VI–♭III–♭VII。",
      fix,
    });
  }
  if (!inKeyChords(choice.chords)) {
    found.push({
      id: `${lesson.marker}-inkey`,
      severity: "error",
      message: "有和弦跑出调外了。",
      fix,
    });
  }
  if (!hasTaughtColor(choice.chords)) {
    found.push({
      id: `${lesson.marker}-color`,
      severity: "error",
      message: "色彩要用三和弦、add9 或 maj7。",
      fix,
    });
  }
  if (!endsOnTonic(choice.chords)) {
    found.push({
      id: `${lesson.marker}-cadence`,
      severity: "error",
      message: "最后要落在 T（I / i / vi）。",
      fix,
    });
  }
  const song = choiceEnergySong(lesson, state.hand);
  if (!song || !chorusLifted(song)) {
    found.push({
      id: `${lesson.marker}-lift`,
      severity: "error",
      message: "副歌要多一层，而且能量到主歌的 1.5 倍。",
      fix,
    });
  }
  return found;
}

export function stageSkeleton(lesson: StageLesson, choiceIndex: number): SongSkeleton {
  const sections = lesson.sections ?? [{ name: lesson.marker, startBar: 0, bars: lesson.totalBars }];
  if (lesson.drums) {
    return {
      bpm: lesson.bpm,
      keyRoot: lesson.keyRoot,
      keyScale: lesson.keyScale,
      beatsPerBar: 4,
      totalBars: lesson.totalBars,
      sections,
      tracks: lesson.drums.map((lane) => ({
        role: lane.role,
        channel: 9,
        notes: lane.target.flatMap((on, index) =>
          on
            ? [{ tick: index * (PPQ / 4), dur: 80, pitch: GM_DRUM_PITCH[lane.role], vel: 110 }]
            : [],
        ),
      })),
      chords: [],
    };
  }
  const choice = lesson.handChoices[choiceIndex];
  if (!choice) throw new Error(`第 ${lesson.id} 关没有这个选项`);
  const tracks =
    choice.tracks ??
    (choice.notes.length > 0 ? [{ role: "MELODY" as const, channel: 0, notes: choice.notes }] : []);
  return {
    bpm: lesson.bpm,
    keyRoot: lesson.keyRoot,
    keyScale: lesson.keyScale,
    beatsPerBar: 4,
    totalBars: lesson.totalBars,
    sections,
    tracks,
    chords: choice.chords,
  };
}

export function stageToMidi(lesson: StageLesson, choiceIndex: number): Uint8Array {
  return writeMidiFile(skeletonToMidi(stageSkeleton(lesson, choiceIndex)));
}

export function choiceEnergySong(lesson: StageLesson, choiceIndex: number): AnalysisSong | null {
  if (choiceIndex < 0 || !lesson.handChoices[choiceIndex]) return null;
  const skeleton = stageSkeleton(lesson, choiceIndex);
  return {
    keyRoot: skeleton.keyRoot,
    keyScale: skeleton.keyScale,
    beatsPerBar: skeleton.beatsPerBar,
    totalBars: skeleton.totalBars,
    allowBorrowed: false,
    sections: skeleton.sections,
    tracks: skeleton.tracks.map((item) => ({ role: item.role, notes: item.notes })),
  };
}

export function stageLessonOrThrow(id: number): StageLesson {
  return stageLesson(id);
}
