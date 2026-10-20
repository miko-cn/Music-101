export interface ReferenceStructure {
  label: string;
  sections: { name: string; startBar: number; bars: number }[];
}

export interface ReferenceCandidates {
  bpms: number[];
  keys: string[];
  structures: ReferenceStructure[];
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 每 0.5 秒一个短音，大约 120 BPM，给关 24 在没有文件时用。 */
export function demoClicks(sampleRate = 8000, seconds = 4): Float32Array {
  const samples = new Float32Array(sampleRate * seconds);
  const period = Math.floor(sampleRate * 0.5);
  for (let start = 0; start + 300 < samples.length; start += period) {
    for (let index = 0; index < 300; index += 1) {
      const env = 1 - index / 300;
      samples[start + index] = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * env;
    }
  }
  return samples;
}

export function candidatesFromPcm(samples: Float32Array, sampleRate: number): ReferenceCandidates {
  return {
    bpms: bpmCandidates(samples, sampleRate),
    keys: keyCandidates(samples, sampleRate),
    structures: [
      {
        label: "Intro 4 + Verse 4 + Chorus 4 + Outro 4",
        sections: [
          { name: "Intro", startBar: 0, bars: 4 },
          { name: "Verse", startBar: 4, bars: 4 },
          { name: "Chorus", startBar: 8, bars: 4 },
          { name: "Outro", startBar: 12, bars: 4 },
        ],
      },
      {
        label: "整段都当主歌（16 小节）",
        sections: [{ name: "Verse", startBar: 0, bars: 16 }],
      },
    ],
  };
}

function bpmCandidates(samples: Float32Array, sampleRate: number): number[] {
  const hop = 256;
  const energies: number[] = [];
  for (let start = 0; start + hop <= samples.length; start += hop) {
    let sum = 0;
    for (let index = 0; index < hop; index += 1) sum += samples[start + index] * samples[start + index];
    energies.push(sum / hop);
  }
  const onsets: number[] = [];
  for (let index = 1; index < energies.length; index += 1) {
    if (energies[index] - energies[index - 1] > 0.01) onsets.push((index * hop) / sampleRate);
  }
  const votes = new Map<number, number>();
  for (let index = 1; index < onsets.length; index += 1) {
    const gap = onsets[index] - onsets[index - 1];
    if (gap < 0.28 || gap > 1.2) continue;
    const bpm = Math.round(60 / gap);
    if (bpm < 70 || bpm > 180) continue;
    votes.set(bpm, (votes.get(bpm) ?? 0) + 1);
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]).map(([bpm]) => bpm);
  const top = ranked[0] ?? 120;
  const extras = [top, Math.round(top / 2), top * 2, 100, 128, 140].filter((bpm) => bpm >= 70 && bpm <= 180);
  const unique: number[] = [];
  for (const bpm of [...ranked, ...extras]) {
    if (!unique.includes(bpm)) unique.push(bpm);
    if (unique.length === 3) break;
  }
  while (unique.length < 3) unique.push(120);
  return unique;
}

function keyCandidates(samples: Float32Array, sampleRate: number): string[] {
  const bins = new Array<number>(12).fill(0);
  const window = 512;
  const limit = Math.min(samples.length, sampleRate * 2);
  for (let start = 0; start + window < limit; start += window) {
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      const midi = 69 + ((pitchClass - 9 + 12) % 12);
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      const omega = (2 * Math.PI * frequency) / sampleRate;
      let real = 0;
      let imag = 0;
      for (let index = 0; index < window; index += 1) {
        real += samples[start + index] * Math.cos(omega * index);
        imag -= samples[start + index] * Math.sin(omega * index);
      }
      bins[pitchClass] += Math.hypot(real, imag);
    }
  }
  const order = bins.map((score, pitch) => ({ score, pitch })).sort((a, b) => b.score - a.score);
  const major = order[0]?.pitch ?? 0;
  const relativeMinor = (major + 9) % 12;
  const second = order[1]?.pitch ?? (major + 7) % 12;
  const labels = [`${NAMES[major]} 大调`, `${NAMES[relativeMinor]} 小调`, `${NAMES[second]} 大调`];
  const unique: string[] = [];
  for (const label of labels) {
    if (!unique.includes(label)) unique.push(label);
  }
  while (unique.length < 3) unique.push("C 大调");
  return unique;
}
