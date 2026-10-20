import { describe, expect, it } from "vitest";
import { ARRANGING_LESSONS } from "../../src/content/arranging.ts";
import { energySeries } from "../../src/core/analyze/energy.ts";
import {
  applyStageFix,
  choiceEnergySong,
  diagnoseStage,
  emptyStageState,
  stagePassed,
  stageSkeleton,
  stageToMidi,
} from "../../src/core/lesson/stage1.ts";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { PPQ } from "../../src/core/midi/types.ts";

function lessonById(id: number) {
  const lesson = ARRANGING_LESSONS.find((item) => item.id === id);
  if (!lesson) throw new Error(`没有第 ${id} 关`);
  return lesson;
}

function passed(id: number) {
  const lesson = lessonById(id);
  return {
    earAnswers: lesson.ear.map((question) => question.correct),
    hand: lesson.drums || lesson.reference ? null : lesson.handCorrect,
    drums: lesson.drums?.map((lane) => [...lane.target]),
    referencePick: lesson.reference ? { bpm: 0, key: 0, structure: 0 } : undefined,
  };
}

function noteOns(id: number) {
  const lesson = lessonById(id);
  const midi = readMidiFile(stageToMidi(lesson, lesson.handCorrect));
  return midi.tracks.flatMap((track) =>
    track.events
      .filter((event) => event.kind === "noteOn")
      .map((event) => (event.kind === "noteOn" ? { track: track.name, pitch: event.pitch, tick: event.tick } : null)),
  );
}

describe("阶段二、三关 9–24", () => {
  it("十六关都有 5 道听辨，正确答案能过关，选错不能过", () => {
    expect(ARRANGING_LESSONS.map((lesson) => lesson.id)).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    ]);
    for (const lesson of ARRANGING_LESSONS) {
      expect(lesson.ear).toHaveLength(5);
      expect(lesson.concept.length).toBeGreaterThan(0);
      expect(stagePassed(lesson, passed(lesson.id))).toBe(true);
      if (!lesson.drums && !lesson.reference) {
        const wrong = { ...passed(lesson.id), hand: (lesson.handCorrect + 1) % lesson.handChoices.length };
        expect(stagePassed(lesson, wrong)).toBe(false);
      }
    }
  });

  it("第 10 关鼓组没打满不过关，填上目标后导出四件套音高", () => {
    const lesson = lessonById(10);
    const empty = emptyStageState(lesson);
    expect(diagnoseStage(lesson, empty).some((item) => item.fix?.actionId === "stage-hand-correct")).toBe(true);
    expect(stagePassed(lesson, { ...passed(10), drums: empty.drums })).toBe(false);
    expect(applyStageFix(lesson, empty).drums?.[0]).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    const notes = noteOns(10).filter((note) => note && note.track !== "CHORDS");
    const byTrack = Object.fromEntries(
      ["KICK", "SNARE", "CLAP", "HAT"].map((role) => [role, notes.filter((note) => note?.track === role).map((note) => note?.pitch)]),
    );
    expect(byTrack.KICK).toEqual([36, 36]);
    expect(byTrack.SNARE).toEqual([38, 38]);
    expect(byTrack.CLAP).toEqual([39, 39]);
    expect(byTrack.HAT).toEqual([42, 42, 42, 42, 42, 42, 42, 42]);
  });

  it("第 11 关正确导出把 808 放在 MIDI 36，错误选项才会落到 28", () => {
    const correct = noteOns(11).filter((note) => note?.track === "808").map((note) => note?.pitch);
    expect(correct).toEqual([36, 36]);
    const wrong = readMidiFile(stageToMidi(lessonById(11), 1));
    const low = wrong.tracks
      .find((track) => track.name === "808")
      ?.events.filter((event) => event.kind === "noteOn")
      .map((event) => (event.kind === "noteOn" ? event.pitch : 0));
    expect(low).toEqual([28, 28]);
  });

  it("第 12 关导出每拍一个 kick，并带一条持续的 808", () => {
    const notes = noteOns(12);
    expect(notes.filter((note) => note?.track === "KICK")).toHaveLength(8);
    expect(notes.filter((note) => note?.track === "808").map((note) => note?.pitch)).toEqual([36, 36]);
  });

  it("第 13 关正确选项的副歌能量高于主歌", () => {
    const song = choiceEnergySong(lessonById(13), 0);
    expect(song).not.toBeNull();
    if (!song) return;
    const series = energySeries(song);
    const verse = series.filter((item) => item.bar < 4).map((item) => item.energy);
    const chorus = series.filter((item) => item.bar >= 4).map((item) => item.energy);
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(chorus)).toBeGreaterThan(mean(verse) * 1.5);
  });

  it("第 23 关导出 16 小节、150 BPM，并带副歌标记和 supersaw", () => {
    const lesson = lessonById(23);
    const skeleton = stageSkeleton(lesson, 0);
    expect(skeleton.totalBars).toBe(16);
    expect(skeleton.bpm).toBe(150);
    expect(skeleton.sections.map((section) => section.name)).toEqual(["Intro", "Verse", "Chorus"]);
    const midi = readMidiFile(stageToMidi(lesson, 0));
    const markers = midi.tracks[0]?.events.filter((event) => event.kind === "marker").map((event) =>
      event.kind === "marker" ? event.text : "",
    );
    expect(markers).toContain("Chorus");
    const tempo = midi.tracks[0]?.events.find((event) => event.kind === "tempo");
    expect(tempo && tempo.kind === "tempo" ? tempo.microsecondsPerBeat : 0).toBe(400_000);
    const saw = noteOns(23).filter((note) => note?.track === "SUPERSAW");
    expect(saw).toHaveLength(8);
    expect(saw[0]?.tick).toBe(8 * 4 * PPQ);
  });

  it("第 24 关没选候选不过关，三项都选了就能过", () => {
    const lesson = lessonById(24);
    expect(stagePassed(lesson, emptyStageState(lesson))).toBe(false);
    expect(stagePassed(lesson, passed(24))).toBe(true);
  });
});
