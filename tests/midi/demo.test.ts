import { describe, expect, it } from "vitest";
import { createDemoSong } from "../../scripts/make-test-midi.ts";
import { skeletonToMidi } from "../../src/core/midi/project.ts";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { PPQ } from "../../src/core/midi/types.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";

const BAR = 4 * PPQ;

describe("演示 MIDI", () => {
  const { skeleton, progressionText } = createDemoSong();
  const midi = readMidiFile(writeMidiFile(skeletonToMidi(skeleton)));
  const conductor = midi.tracks[0];
  const chords = midi.tracks.find((track) => track.name === "CHORDS");

  it("写出再读入后轨名、速度、段落与和弦标记齐全", () => {
    expect(progressionText).toBe("F#m (i) | D (♭VI) | B (IV) | F# (I)");
    expect(midi.format).toBe(1);
    expect(midi.ppq).toBe(PPQ);
    expect(midi.tracks.map((track) => track.name)).toEqual([
      "Music-101",
      "KICK",
      "808",
      "BASS",
      "SUPERSAW",
      "CHORDS",
    ]);
    expect(conductor?.events.find((event) => event.kind === "tempo")).toEqual({
      kind: "tempo",
      tick: 0,
      microsecondsPerBeat: 400000,
    });
    expect(conductor?.events.filter((event) => event.kind === "marker")).toEqual([
      { kind: "marker", tick: 0, text: "Intro" },
      { kind: "marker", tick: 0, text: "F#m (i)" },
      { kind: "marker", tick: 2 * BAR, text: "Verse" },
      { kind: "marker", tick: 2 * BAR, text: "D (bVI)" },
      { kind: "marker", tick: 4 * BAR, text: "PreChorus" },
      { kind: "marker", tick: 4 * BAR, text: "B (IV)" },
      { kind: "marker", tick: 6 * BAR, text: "Chorus" },
      { kind: "marker", tick: 6 * BAR, text: "F# (I)" },
    ]);
  });

  it("CHORDS 轨每小节三个同时发声的音，整曲 8 小节", () => {
    expect(chords).toBeDefined();
    const noteOns = chords?.events.filter((event) => event.kind === "noteOn") ?? [];
    for (let bar = 0; bar < 8; bar += 1) {
      const inBar = noteOns.filter((event) => event.tick === bar * BAR);
      expect(inBar).toHaveLength(3);
      expect(new Set(inBar.map((event) => event.pitch)).size).toBe(3);
    }
    const ticks = midi.tracks.flatMap((track) => track.events.map((event) => event.tick));
    expect(Math.max(...ticks)).toBe(8 * BAR);
    expect(noteOns.some((event) => event.tick >= 8 * BAR)).toBe(false);
  });
});
