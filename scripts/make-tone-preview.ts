/**
 * 离线渲染音色试听 WAV。
 *
 * 用途：不用开浏览器就能听到电钢和纯音长什么样，也能直接拖进 Cubase
 * 跟以后选用的插件音色对比。
 *
 * 包络数学与 `src/core/audio/engine.ts` 里的 Web Audio 实现一一对应：
 * - 起音：线性从 0 爬到峰值
 * - 衰减：起音结束后按 exp(-t/τ) 指数衰减（对应 setTargetAtTime）
 * - 制音器：按住时间一到，换一条更快的时间常数继续衰减
 *
 * 差异只在噪声瞬态用了简化的带通滤波，细节跟浏览器里不完全一样，
 * 用来判断「像不像钢琴」是够的。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PLAIN_TONE,
  PIANO_HOLD_SECONDS,
  RHODES,
  partialDecays,
  partialFrequencies,
} from "../src/core/audio/piano.ts";
import { midiToFrequency } from "../src/core/theory/pitch.ts";

const SAMPLE_RATE = 44100;

interface Envelope {
  /** 起音时间（秒）。 */
  attack: number;
  /** 衰减时间常数（秒）。 */
  tau: number;
  /** 按住时间（秒）：到这个点制音器落下。 */
  hold: number;
  /** 制音器的时间常数（秒）。 */
  releaseTau: number;
}

/** 与 engine.ts 里的包络一一对应。t 是相对起点的秒数。 */
function envelopeValueAt(t: number, peak: number, env: Envelope): number {
  if (t <= 0) return 0;
  if (t < env.attack) return (peak * t) / env.attack;
  if (t <= env.hold) return peak * Math.exp(-(t - env.attack) / env.tau);
  const atRelease = peak * Math.exp(-(env.hold - env.attack) / env.tau);
  return atRelease * Math.exp(-(t - env.hold) / env.releaseTau);
}

/** RBJ cookbook 的带通双二阶滤波，用来做出槌击噪声的音色。 */
function bandpass(samples: Float32Array, frequency: number, q: number): Float32Array {
  const w0 = (2 * Math.PI * frequency) / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  const out = new Float32Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const x = samples[index] ?? 0;
    const y = (b0 / a0) * x + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    out[index] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

/** 一个电钢音：所有泛音叠加 + 槌击噪声。 */
function renderPiano(midi: number, hold: number, length: number): Float32Array {
  const profile = RHODES;
  const frequencies = partialFrequencies(midi, profile);
  const decays = partialDecays(midi, profile);
  const out = new Float32Array(Math.ceil(length * SAMPLE_RATE));

  profile.partials.forEach((partial, index) => {
    const frequency = frequencies[index] ?? midiToFrequency(midi);
    const tau = decays[index] ?? profile.baseDecaySeconds;
    const peak = profile.peak * partial.gain;
    for (let sample = 0; sample < out.length; sample += 1) {
      const t = sample / SAMPLE_RATE;
      const value = envelopeValueAt(t, peak, {
        attack: partial.attack,
        tau,
        hold,
        releaseTau: profile.releaseSeconds,
      });
      out[sample] = (out[sample] ?? 0) + value * Math.sin(2 * Math.PI * frequency * t);
    }
  });

  const noiseLength = Math.ceil(profile.clickSeconds * SAMPLE_RATE);
  const noise = new Float32Array(noiseLength);
  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = Math.random() * 2 - 1;
  }
  const filtered = bandpass(noise, profile.clickHz, 0.8);
  for (let index = 0; index < filtered.length; index += 1) {
    const t = index / SAMPLE_RATE;
    const value = profile.clickGain * Math.exp(-t / (profile.clickSeconds / 3));
    out[index] = (out[index] ?? 0) + (filtered[index] ?? 0) * value;
  }
  return out;
}

/** 一个纯音：主音 + 一丁点八度泛音。 */
function renderPure(midi: number, hold: number, length: number): Float32Array {
  const spec = PLAIN_TONE;
  const out = new Float32Array(Math.ceil(length * SAMPLE_RATE));
  const frequency = midiToFrequency(midi);
  const voices: { frequency: number; gain: number }[] = [
    { frequency, gain: spec.peak },
    { frequency: frequency * 2, gain: spec.peak * spec.octaveGain },
  ];
  for (const voice of voices) {
    for (let sample = 0; sample < out.length; sample += 1) {
      const t = sample / SAMPLE_RATE;
      const value = envelopeValueAt(t, voice.gain, {
        attack: spec.attackSeconds,
        tau: 1000,
        hold,
        releaseTau: spec.releaseSeconds,
      });
      out[sample] = (out[sample] ?? 0) + value * Math.sin(2 * Math.PI * voice.frequency * t);
    }
  }
  return out;
}

/** 把一个片段贴到总轨的某个时间点上。 */
function mix(track: Float32Array, clip: Float32Array, startSeconds: number): void {
  const offset = Math.floor(startSeconds * SAMPLE_RATE);
  for (let index = 0; index < clip.length; index += 1) {
    const target = offset + index;
    if (target >= track.length) break;
    track[target] = (track[target] ?? 0) + (clip[index] ?? 0);
  }
}

/** 16-bit PCM 单声道 WAV。 */
function encodeWav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    data.writeInt16LE(Math.round(clamped * 32767), index * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export interface TonePreview {
  /** 总时长（秒）。 */
  seconds: number;
  /** 每个片段的说明。 */
  cues: { at: number; label: string }[];
}

/**
 * 排一段试听：电钢单音 → 电钢和弦 → 纯音旋律 → 纯音和弦。
 */
export function buildTonePreview(): { track: Float32Array; preview: TonePreview } {
  const cues: { at: number; label: string }[] = [];
  const parts: { at: number; clip: Float32Array }[] = [];
  let at = 0.3;

  const place = (label: string, clip: Float32Array) => {
    cues.push({ at, label });
    parts.push({ at, clip });
    at += clip.length / SAMPLE_RATE + 0.3;
  };

  place("电钢 C4（点琴键听到的音色）", renderPiano(60, PIANO_HOLD_SECONDS, 2.4));
  place("电钢 C5（同一个音色，高八度）", renderPiano(72, PIANO_HOLD_SECONDS, 2.4));

  const chord = renderPiano(60, 1.4, 2.4);
  mix(chord, renderPiano(64, 1.4, 2.4), 0);
  mix(chord, renderPiano(67, 1.4, 2.4), 0);
  place("电钢 C 大三和弦（三个音同时响）", chord);

  const scale = new Float32Array(Math.ceil(2.4 * SAMPLE_RATE));
  [60, 62, 64, 65, 67, 69, 71].forEach((midi, index) => {
    mix(scale, renderPiano(midi, PIANO_HOLD_SECONDS, 1.0), index * 0.42);
  });
  place("电钢 C 大调音阶（级进，依次响）", scale);

  const interval = new Float32Array(Math.ceil(1.2 * SAMPLE_RATE));
  mix(interval, renderPure(60, 0.3, 0.5), 0);
  mix(interval, renderPure(64, 0.3, 0.5), 0.42);
  place("纯音 C4 → E4（听辨：音程，依次响）", interval);

  const pureChord = renderPure(60, 1.1, 2.0);
  mix(pureChord, renderPure(64, 1.1, 2.0), 0);
  mix(pureChord, renderPure(67, 1.1, 2.0), 0);
  place("纯音 C 大三和弦（听辨：和弦，同时响）", pureChord);

  const total = at + 0.3;
  const track = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  for (const part of parts) mix(track, part.clip, part.at);

  // 整体峰值归一化到 -1dB，避免削顶。
  let peak = 0;
  for (const sample of track) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0) {
    const scale = 0.89 / peak;
    for (let index = 0; index < track.length; index += 1) {
      track[index] = (track[index] ?? 0) * scale;
    }
  }
  return { track, preview: { seconds: total, cues } };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectRun()) {
  const { track, preview } = buildTonePreview();
  const outputPath = resolve(process.cwd(), "out", "tone-preview.wav");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeWav(track));

  console.log(`已生成 ${outputPath}`);
  console.log(`时长 ${preview.seconds.toFixed(1)} 秒`);
  for (const cue of preview.cues) {
    console.log(`  ${cue.at.toFixed(2)}s  ${cue.label}`);
  }
}
