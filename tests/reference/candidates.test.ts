import { describe, expect, it } from "vitest";
import { readMidiFile } from "../../src/core/midi/reader.ts";
import { candidatesFromPcm, demoClicks } from "../../src/core/reference/candidates.ts";
import { referenceToMidi } from "../../src/core/reference/export.ts";

describe("参考曲候选", () => {
  it("示例脉冲大约是 120 BPM，主音落在 A", () => {
    const found = candidatesFromPcm(demoClicks(), 8000);
    expect(found.bpms[0]).toBeGreaterThanOrEqual(110);
    expect(found.bpms[0]).toBeLessThanOrEqual(130);
    expect(found.bpms).toHaveLength(3);
    expect(found.keys[0]).toBe("A 大调");
    expect(found.keys).toHaveLength(3);
    expect(found.structures[0]?.sections.map((section) => section.name)).toEqual(["Intro", "Verse", "Chorus", "Outro"]);
    expect(found.structures[1]?.sections).toEqual([{ name: "Verse", startBar: 0, bars: 16 }]);
  });

  it("按选中的速度和段落导出 kick 与 marker", () => {
    const found = candidatesFromPcm(demoClicks(), 8000);
    const sections = found.structures[0]?.sections ?? [];
    const midi = readMidiFile(referenceToMidi(found.bpms[0] ?? 120, sections));
    const markers = midi.tracks[0]?.events.filter((event) => event.kind === "marker").map((event) =>
      event.kind === "marker" ? event.text : "",
    );
    expect(markers).toEqual(["Intro", "Verse", "Chorus", "Outro"]);
    const kicks = midi.tracks
      .find((track) => track.name === "KICK")
      ?.events.filter((event) => event.kind === "noteOn" && event.pitch === 36);
    expect(kicks).toHaveLength(16 * 4);
    const tempo = midi.tracks[0]?.events.find((event) => event.kind === "tempo");
    expect(tempo && tempo.kind === "tempo" ? tempo.microsecondsPerBeat : 0).toBe(Math.round(60_000_000 / (found.bpms[0] ?? 120)));
  });
});
