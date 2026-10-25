import type { AnalysisSong } from "../analyze/song.ts";
import type { Diagnostic } from "../analyze/types.ts";
import { GM_DRUM_PITCH, skeletonToMidi, type SongSkeleton } from "../midi/project.ts";
import { PPQ } from "../midi/types.ts";
import { writeMidiFile } from "../midi/writer.ts";
import { stageLesson, type StageLesson } from "../../content/stage1.ts";

export interface StageState {
  earAnswers: (number | null)[];
  hand: number | null;
  drums?: boolean[][];
  referencePick?: { bpm: number | null; key: number | null; structure: number | null };
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
        message: "鼓组还没打成目标。踢在第 1、9 格，军鼓和拍手在第 5、13 格，踩镲打八分音符。",
        fix: { label: "填上这套鼓", actionId: STAGE_FIX_HAND },
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
  } else if (state.hand === null) {
    found.push({
      id: `${lesson.marker}-hand-empty`,
      severity: "error",
      message: "手做题还没选。",
      fix: { label: "选中这一关的答案", actionId: STAGE_FIX_HAND },
    });
  } else if (state.hand !== lesson.handCorrect) {
    found.push({
      id: `${lesson.marker}-hand-wrong`,
      severity: "error",
      message: "手做题选错了。看概念卡里的规则再选一次。",
      fix: { label: "改成正确答案", actionId: STAGE_FIX_HAND },
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

export function applyStageFix(lesson: StageLesson, state: StageState): StageState {
  return {
    ...state,
    hand: lesson.handCorrect,
    drums: lesson.drums?.map((lane) => [...lane.target]),
  };
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
