import { useState } from "react";
import {
  getChordPitches,
  getScalePitches,
  keyName,
  pitchClassToName,
  romanNumeral,
  type ChordQuality,
  type PitchClass,
  type ScaleId,
} from "./core/index.ts";

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as PitchClass[];
const SCALES: ScaleId[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
const QUALITIES: ChordQuality[] = ["maj", "min", "maj7", "min7", "add9", "sus4", "dom7"];

export function App() {
  const [root, setRoot] = useState<PitchClass>(6);
  const [scale, setScale] = useState<ScaleId>("naturalMinor");
  const [quality, setQuality] = useState<ChordQuality>("min");

  const scalePitches = getScalePitches(root, scale);
  const currentChord = { root, quality };
  const chordPitches = getChordPitches(currentChord);

  return (
    <main>
      <h1>Music-101</h1>
      <p>kawaii bass / future bass 编曲速成 —— M1 地基</p>

      <section>
        <label>
          调
          <select
            value={root}
            onChange={(event) => setRoot(Number(event.target.value) as PitchClass)}
          >
            {ROOTS.map((pitch) => (
              <option key={pitch} value={pitch}>
                {pitchClassToName(pitch)}
              </option>
            ))}
          </select>
        </label>
        <label>
          音阶
          <select value={scale} onChange={(event) => setScale(event.target.value as ScaleId)}>
            {SCALES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          和弦性质
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value as ChordQuality)}
          >
            {QUALITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h2>{keyName(root, scale)}</h2>
        <p>音阶：{scalePitches.map((pitch) => pitchClassToName(pitch)).join(" · ")}</p>
      </section>

      <section>
        <h2>
          {pitchClassToName(root)}
          {quality} → {romanNumeral(currentChord, root)}
        </h2>
        <p>和弦音：{chordPitches.map((pitch) => pitchClassToName(pitch)).join(" · ")}</p>
      </section>
    </main>
  );
}
