import { describe, expect, it } from "vitest";
import { noteNameToMidi } from "../../src/core/theory/pitch.ts";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import {
  LEVEL1_FIX_GRID,
  LEVEL1_FIX_PITCH,
  applyLevel1Fix,
  diagnoseLevel1,
  emptyLevel1State,
  level1Passed,
  level1ToMidi,
  scoreEar,
} from "../../src/core/lesson/level1.ts";
import { LEVEL1_EAR, LEVEL1_EAR_PASS, LEVEL1_TARGET_PITCH } from "../../src/content/level1.ts";
import { quarterSteps } from "../../src/core/sequencer/grid.ts";

function passingState() {
  return {
    earAnswers: LEVEL1_EAR.map((question) => question.correct),
    pitch: LEVEL1_TARGET_PITCH,
    steps: quarterSteps(),
  };
}

describe("第 1 关", () => {
  it("目标音是 C4", () => {
    expect(LEVEL1_TARGET_PITCH).toBe(noteNameToMidi("C4"));
    expect(LEVEL1_EAR.length).toBeGreaterThanOrEqual(8);
  });

  it("听辨答错到阈值以下就不过关，手做也要对", () => {
    const state = passingState();
    expect(level1Passed(state)).toBe(true);
    // 答错一道，仍在阈值内
    state.earAnswers[0] = LEVEL1_EAR[0].correct === 0 ? 1 : 0;
    expect(scoreEar(state.earAnswers).correct).toBe(LEVEL1_EAR.length - 1);
    expect(level1Passed(state)).toBe(true);
    // 答错到阈值以下，就不算过关
    const wrongCount = LEVEL1_EAR.length - LEVEL1_EAR_PASS + 1;
    for (let i = 0; i < wrongCount; i += 1) {
      state.earAnswers[i] = LEVEL1_EAR[i].correct === 0 ? 1 : 0;
    }
    expect(scoreEar(state.earAnswers).correct).toBe(LEVEL1_EAR_PASS - 1);
    expect(level1Passed(state)).toBe(false);
  });

  it("没选 C4 或格子不对时给出可点击的修正", () => {
    const state = emptyLevel1State();
    const ids = diagnoseLevel1(state).map((item) => item.id);
    expect(ids).toContain("level1-pitch");
    expect(ids).toContain("level1-grid");
    const fixed = applyLevel1Fix(applyLevel1Fix(state, LEVEL1_FIX_PITCH), LEVEL1_FIX_GRID);
    expect(fixed.pitch).toBe(60);
    expect(fixed.steps.slice(0, 16)).toEqual(quarterSteps());
  });

  it("导出的 MIDI 是 120 BPM 的四个四分音符 C4", () => {
    const midi = readMidiFile(level1ToMidi(passingState()));
    expect(midi.tracks.map((track) => track.name)).toEqual(["Music-101", "MELODY"]);
    const tempo = midi.tracks[0]?.events.find((event) => event.kind === "tempo");
    expect(tempo).toEqual({ kind: "tempo", tick: 0, microsecondsPerBeat: 500000 });
    const marker = midi.tracks[0]?.events.find((event) => event.kind === "marker");
    expect(marker).toEqual({ kind: "marker", tick: 0, text: "Level1" });
    const notes = midi.tracks[1]?.events.filter((event) => event.kind === "noteOn") ?? [];
    expect(notes.map((event) => (event.kind === "noteOn" ? event.tick : -1))).toEqual([
      0, 480, 960, 1440,
    ]);
    expect(notes.every((event) => event.kind === "noteOn" && event.pitch === 60)).toBe(true);
  });
});
