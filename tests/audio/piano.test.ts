import { describe, expect, it } from "vitest";
import {
  PLAIN_TONE,
  RHODES,
  fundamentalDecaySeconds,
  inharmonicityAt,
  noteLifeSeconds,
  partialDecays,
  partialFrequencies,
} from "../../src/core/audio/piano.ts";
import { midiToFrequency } from "../../src/core/theory/pitch.ts";

const CENTRAL_C_HZ = 261.6255653;

describe("电钢音色模型", () => {
  it("基音就是中央 C 的频率", () => {
    const frequencies = partialFrequencies(60, RHODES);
    expect(frequencies[0]).toBeCloseTo(CENTRAL_C_HZ, 6);
  });

  it("泛音是基频的整数倍附近，且严格递增", () => {
    const frequencies = partialFrequencies(60, RHODES);
    expect(frequencies).toHaveLength(RHODES.partials.length);
    for (let index = 1; index < frequencies.length; index += 1) {
      expect(frequencies[index]).toBeGreaterThan(frequencies[index - 1] ?? 0);
    }
  });

  it("不谐和让泛音比理论值略高（真实弦有刚性）", () => {
    const fundamental = midiToFrequency(60);
    const frequencies = partialFrequencies(60, RHODES);
    // 第二个泛音理论上是基频的两倍，实际略高一点点
    expect(frequencies[1]).toBeGreaterThan(fundamental * 2);
    expect(frequencies[1]).toBeLessThan(fundamental * 2 * 1.001);
  });

  it("音区越高，不谐和越明显", () => {
    expect(inharmonicityAt(72, RHODES)).toBeGreaterThan(inharmonicityAt(36, RHODES));
  });

  it("高次泛音比基音消音更快——声音会越听越暗", () => {
    const decays = partialDecays(60, RHODES);
    for (let index = 1; index < decays.length; index += 1) {
      expect(decays[index]).toBeLessThan(decays[index - 1] ?? Infinity);
    }
  });

  it("音区越高，衰减越快；低音区更慢但不超过上限", () => {
    const c2 = fundamentalDecaySeconds(36, RHODES);
    const c4 = fundamentalDecaySeconds(60, RHODES);
    const c6 = fundamentalDecaySeconds(84, RHODES);
    expect(c2).toBeGreaterThan(c4);
    expect(c4).toBeGreaterThan(c6);
    expect(c2).toBeLessThanOrEqual(RHODES.maxDecaySeconds);
    expect(c6).toBeGreaterThanOrEqual(RHODES.minDecaySeconds);
  });

  it("极低音区被夹在上限里，不会响到失控", () => {
    expect(fundamentalDecaySeconds(21, RHODES)).toBe(RHODES.maxDecaySeconds);
  });

  it("一个音自然响完的时间随音高变短", () => {
    expect(noteLifeSeconds(72, RHODES)).toBeLessThan(noteLifeSeconds(48, RHODES));
  });

  it("每个泛音的起音都比基音短（起音是「敲」出来的，不是「渐入」的）", () => {
    for (let index = 1; index < RHODES.partials.length; index += 1) {
      expect(RHODES.partials[index]?.attack).toBeLessThan(RHODES.partials[0]?.attack ?? 0);
    }
  });
});

describe("听辨用纯音", () => {
  it("八度泛音是基频的两倍——不改变音高感知", () => {
    const fundamental = midiToFrequency(60);
    expect(fundamental * 2).toBeCloseTo(midiToFrequency(72), 6);
  });

  it("八度泛音的增益远小于主音，音色被剥掉但不至于刺耳", () => {
    expect(PLAIN_TONE.octaveGain).toBeGreaterThan(0);
    expect(PLAIN_TONE.octaveGain).toBeLessThan(0.2);
  });

  it("起音够短，不会把音高盖住", () => {
    expect(PLAIN_TONE.attackSeconds).toBeLessThan(0.05);
  });
});
