import { describe, expect, it } from "vitest";
import { createDemoSong } from "../../scripts/make-test-midi.ts";
import { diagnoseArrangement } from "../../src/core/analyze/rules/index.ts";
import { importMidi, isSectionMarker } from "../../src/core/midi/importSong.ts";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { skeletonToMidi } from "../../src/core/midi/project.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";

describe("导入 MIDI", () => {
  const demo = readMidiFile(writeMidiFile(skeletonToMidi(createDemoSong().skeleton)));
  const imported = importMidi(demo, { keyRoot: 6, keyScale: "naturalMinor" });

  it("读出速度、轨名和标记，和弦名不算段落", () => {
    expect(imported.bpm).toBe(150);
    expect(imported.tracks.map((track) => track.name)).toEqual([
      "Music-101",
      "KICK",
      "808",
      "BASS",
      "SUPERSAW",
      "CHORDS",
    ]);
    expect(imported.tracks.find((track) => track.name === "KICK")?.role).toBe("KICK");
    expect(imported.tracks.find((track) => track.name === "CHORDS")?.role).toBe("CHORDS");
    expect(imported.tracks.find((track) => track.name === "Music-101")?.notes).toBe(0);
    expect(imported.markers.map((marker) => marker.text)).toEqual([
      "Intro",
      "F#m (i)",
      "Verse",
      "D (bVI)",
      "PreChorus",
      "B (IV)",
      "Chorus",
      "F# (I)",
    ]);
    expect(imported.markers.filter((marker) => marker.section).map((marker) => marker.text)).toEqual([
      "Intro",
      "Verse",
      "PreChorus",
      "Chorus",
    ]);
    expect(isSectionMarker("D (bVI)")).toBe(false);
    expect(imported.song.totalBars).toBe(8);
  });

  it("明确说出文件里没有的侧链、音色和自动化，并用六条规则诊断", () => {
    expect(imported.gaps.some((line) => line.includes("侧链"))).toBe(true);
    expect(imported.gaps.some((line) => line.includes("音色"))).toBe(true);
    expect(imported.gaps.some((line) => line.includes("自动化"))).toBe(true);
    expect(imported.gaps.some((line) => line.includes("调性"))).toBe(true);
    const diagnostics = diagnoseArrangement(imported.song);
    expect(diagnostics.every((item) => item.message.length > 0)).toBe(true);
  });

  it("不认识的轨名不猜成 kick，拍号能读回来", () => {
    const file: MidiFile = {
      format: 1,
      ppq: 480,
      tracks: [
        {
          name: "Audio 01",
          events: [
            { kind: "trackName", tick: 0, text: "Audio 01" },
            { kind: "timeSignature", tick: 0, numerator: 3, denominator: 4 },
            { kind: "noteOn", tick: 0, pitch: 60, velocity: 80, channel: 0 },
            { kind: "noteOff", tick: 480, pitch: 60, velocity: 0, channel: 0 },
          ],
        },
      ],
    };
    const result = importMidi(file);
    expect(result.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    expect(result.beatsPerBar).toBe(3);
    expect(result.tracks[0]).toMatchObject({ name: "Audio 01", role: null, notes: 1 });
    expect(result.song.tracks[0]?.role).toBe("MELODY");
    expect(result.gaps.some((line) => line.includes("Audio 01"))).toBe(true);
    expect(result.gaps.some((line) => line.includes("kick"))).toBe(true);
    const roundTrip = readMidiFile(writeMidiFile(file));
    expect(roundTrip.tracks[0]?.events.find((event) => event.kind === "timeSignature")).toEqual({
      kind: "timeSignature",
      tick: 0,
      numerator: 3,
      denominator: 4,
    });
  });
});
