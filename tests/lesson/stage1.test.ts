import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import {
  applyStageFix,
  diagnoseStage,
  emptyStageState,
  stagePassed,
  stageToMidi,
} from "../../src/core/lesson/stage1.ts";
import { STAGE_LESSONS, stageLesson } from "../../src/content/stage1.ts";

function passedState(id: number) {
  const lesson = stageLesson(id);
  return {
    earAnswers: lesson.ear.map((question) => question.correct),
    hand: lesson.handCorrect,
  };
}

function pitchesOf(id: number): number[] {
  const midi = readMidiFile(stageToMidi(stageLesson(id), stageLesson(id).handCorrect));
  return midi.tracks.flatMap((track) =>
    track.events.filter((event) => event.kind === "noteOn").map((event) => (event.kind === "noteOn" ? event.pitch : 0)),
  );
}

describe("阶段一关 2–8", () => {
  it("七关都有 5 道听辨，而且正确答案能过关", () => {
    expect(STAGE_LESSONS.map((lesson) => lesson.id)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    for (const lesson of STAGE_LESSONS) {
      expect(lesson.ear).toHaveLength(5);
      expect(stagePassed(lesson, passedState(lesson.id))).toBe(true);
      const wrong = { ...passedState(lesson.id), hand: (lesson.handCorrect + 1) % lesson.handChoices.length };
      expect(stagePassed(lesson, wrong)).toBe(false);
    }
  });

  it("选错时给出可点的修正", () => {
    const lesson = stageLesson(4);
    const state = emptyStageState(lesson);
    expect(diagnoseStage(lesson, state).some((item) => item.fix?.actionId === "stage-hand-correct")).toBe(true);
    expect(applyStageFix(lesson, state).hand).toBe(lesson.handCorrect);
  });

  it("第 2 关导出全音 C4–D4", () => {
    expect(pitchesOf(2)).toEqual([60, 62]);
  });

  it("第 4 关导出 C 小三，含 Eb", () => {
    expect(pitchesOf(4).sort((a, b) => a - b)).toEqual([60, 63, 67]);
  });

  it("第 7 关导出四小节 I–V–vi–IV，并带标记", () => {
    const midi = readMidiFile(stageToMidi(stageLesson(7), 0));
    const markers = midi.tracks[0]?.events.filter((event) => event.kind === "marker").map((event) =>
      event.kind === "marker" ? event.text : "",
    );
    expect(markers).toEqual(["Level7", "C (I)", "G (V)", "Am (vi)", "F (IV)"]);
    expect(pitchesOf(7)).toHaveLength(12);
  });

  it("第 8 关标记里的降号写成 ASCII b", () => {
    const midi = readMidiFile(stageToMidi(stageLesson(8), 0));
    const markers = midi.tracks[0]?.events.filter((event) => event.kind === "marker").map((event) =>
      event.kind === "marker" ? event.text : "",
    );
    expect(markers).toContain("F (bVI)");
    expect(markers).toContain("G (bVII)");
    expect(markers.some((text) => text.includes("♭"))).toBe(false);
  });
});
