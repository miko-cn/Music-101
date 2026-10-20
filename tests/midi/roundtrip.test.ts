import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { writeMidiFile } from "../../src/core/midi/writer.ts";
import type { MidiFile } from "../../src/core/midi/types.ts";

const demo: MidiFile = {
  format: 1,
  ppq: 480,
  tracks: [
    {
      name: "Music-101",
      events: [
        { kind: "trackName", tick: 0, text: "Music-101" },
        { kind: "tempo", tick: 0, microsecondsPerBeat: 400000 },
        { kind: "marker", tick: 1920, text: "Chorus" },
      ],
    },
    {
      name: "KICK",
      events: [
        { kind: "trackName", tick: 0, text: "KICK" },
        { kind: "noteOn", tick: 0, pitch: 36, velocity: 100, channel: 9 },
        { kind: "noteOff", tick: 120, pitch: 36, velocity: 64, channel: 9 },
        { kind: "noteOn", tick: 480, pitch: 36, velocity: 110, channel: 9 },
        { kind: "noteOff", tick: 600, pitch: 36, velocity: 64, channel: 9 },
      ],
    },
  ],
};

describe("MIDI 往返", () => {
  it("写出再读入后逐字段相等", () => {
    const back = readMidiFile(writeMidiFile(demo));
    expect(back.format).toBe(1);
    expect(back.ppq).toBe(480);
    expect(back.tracks).toHaveLength(2);
    expect(back.tracks[0].name).toBe("Music-101");
    expect(back.tracks[1].name).toBe("KICK");
    expect(back.tracks[0].events).toEqual(demo.tracks[0].events);
    expect(back.tracks[1].events).toEqual(demo.tracks[1].events);
  });

  it("拒绝非法输入", () => {
    expect(() => readMidiFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow();
  });
});
