import { skeletonToMidi } from "../midi/project.ts";
import { PPQ } from "../midi/types.ts";
import { writeMidiFile } from "../midi/writer.ts";
import type { ReferenceStructure } from "./candidates.ts";

export function referenceToMidi(bpm: number, sections: ReferenceStructure["sections"]): Uint8Array {
  const totalBars = Math.max(1, ...sections.map((section) => section.startBar + section.bars));
  const notes = [];
  for (let bar = 0; bar < totalBars; bar += 1) {
    for (const beat of [0, 1, 2, 3]) {
      notes.push({ tick: bar * 4 * PPQ + beat * PPQ, dur: 100, pitch: 36, vel: 104 });
    }
  }
  return writeMidiFile(
    skeletonToMidi({
      bpm,
      keyRoot: 0,
      keyScale: "major",
      beatsPerBar: 4,
      totalBars,
      sections,
      tracks: [{ role: "KICK", channel: 9, notes }],
      chords: [],
    }),
  );
}
