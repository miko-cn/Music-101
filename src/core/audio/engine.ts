import {
  SUPERSAW_CENTS,
  bassVoice,
  kickVoice,
  pluckVoice,
  saturationCurve,
  sidechainAutomation,
  subVoice,
  supersawVoice,
  type GainPoint,
} from "./params.ts";
import {
  PLAIN_TONE,
  PIANO_HOLD_SECONDS,
  RHODES,
  partialDecays,
  partialFrequencies,
} from "./piano.ts";
import { EAR_MELODIC_SPACING_SECONDS, earChoiceHoldSeconds, earChoiceSchedule } from "./ear.ts";
import { stepSeconds } from "./schedule.ts";
import { midiToFrequency } from "../theory/pitch.ts";

export type VoiceId = "kick" | "sub" | "bass" | "supersaw" | "pluck" | "chop" | "fx" | "piano" | "pure";

export interface MusicEngine {
  resume(): Promise<void>;
  /** 点琴键 / 试听用的参考音：电钢。 */
  playPitch(midi: number, when?: number, duration?: number): void;
  /** 依次播放若干个音（听辨题的「播放」按钮：把几个备选一个一个弹出来对比）。 */
  playSequence(midis: readonly number[]): void;
  /** 播放听辨题的一个选项：和弦同时响，旋律依次响。用纯音。 */
  playEarOption(midis: readonly number[]): void;
  playVoice(voice: VoiceId, when: number, duration: number, midi?: number): void;
  playSteps(steps: readonly boolean[], midi: number, bpm: number): void;
  /** 两小节：kick 在每拍上，808 经过侧链被抽下去。 */
  playPump(bpm?: number): void;
  applySidechain(gain: GainNode, points: readonly GainPoint[], origin: number): void;
  stopAll(): void;
}

interface Stoppable {
  stop: (when: number) => void;
}

/** 浏览器里没有 AudioContext 时返回 null，关卡界面仍可作答和导出。 */
export function createEngine(): MusicEngine | null {
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.8;
  master.connect(context.destination);
  const live = new Set<Stoppable>();
  const noise = createNoise(context, 1);

  const track = (node: OscillatorNode | AudioBufferSourceNode, when: number, duration: number) => {
    const item = {
      stop: (at: number) => {
        try {
          node.stop(at);
        } catch {
          // 已经停过的节点再 stop 会抛，忽略即可。
        }
      },
    };
    live.add(item);
    node.onended = () => live.delete(item);
    node.start(when);
    node.stop(when + duration + 0.02);
  };

  const playVoice = (voice: VoiceId, when: number, duration: number, midi = 60) => {
    const frequency = midiToFrequency(midi);
    if (voice === "kick") {
      const spec = kickVoice();
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(spec.startHz, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(spec.endHz, 1), when + spec.pitchSeconds);
      const gain = envelope(context, when, spec.duration, 0.9);
      osc.connect(gain).connect(master);
      track(osc, when, spec.duration);
      const click = context.createBufferSource();
      click.buffer = noise;
      const clickGain = envelope(context, when, spec.clickSeconds, 0.35);
      click.connect(clickGain).connect(master);
      track(click, when, spec.clickSeconds);
      return;
    }
    if (voice === "sub") {
      const spec = subVoice();
      const osc = context.createOscillator();
      osc.type = "sine";
      const start = Math.max(frequency, spec.endHz);
      osc.frequency.setValueAtTime(start, when);
      osc.frequency.exponentialRampToValueAtTime(spec.endHz, when + spec.pitchSeconds);
      const shape = waveshaper(context, spec.drive);
      const gain = envelope(context, when, duration || spec.duration, 0.7);
      osc.connect(shape).connect(gain).connect(master);
      track(osc, when, duration || spec.duration);
      return;
    }
    if (voice === "bass") {
      const spec = bassVoice();
      const osc = context.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequency, when);
      const filter = lowpass(context, spec.lowpassHz);
      const shape = waveshaper(context, spec.drive);
      const gain = envelope(context, when, duration || spec.duration, 0.25);
      osc.connect(filter).connect(shape).connect(gain).connect(master);
      track(osc, when, duration || spec.duration);
      return;
    }
    if (voice === "supersaw") {
      const spec = supersawVoice();
      const filter = lowpass(context, spec.lowpassHz);
      const gain = envelope(context, when, duration || spec.duration, 0.12);
      filter.connect(gain).connect(master);
      for (const cents of SUPERSAW_CENTS) {
        const osc = context.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(frequency, when);
        osc.detune.setValueAtTime(cents, when);
        osc.connect(filter);
        track(osc, when, duration || spec.duration);
      }
      return;
    }
    if (voice === "chop") {
      const carrier = context.createOscillator();
      const modulator = context.createOscillator();
      carrier.type = "sine";
      modulator.type = "sine";
      carrier.frequency.setValueAtTime(frequency, when);
      modulator.frequency.setValueAtTime(frequency * 2, when);
      const amount = context.createGain();
      amount.gain.setValueAtTime(frequency * 1.4, when);
      modulator.connect(amount).connect(carrier.frequency);
      const gain = envelope(context, when, duration || 0.2, 0.2);
      carrier.connect(gain).connect(master);
      track(carrier, when, duration || 0.2);
      track(modulator, when, duration || 0.2);
      return;
    }
    if (voice === "fx") {
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 6;
      filter.frequency.setValueAtTime(400, when);
      filter.frequency.exponentialRampToValueAtTime(4000, when + Math.max(duration, 0.2));
      const gain = envelope(context, when, duration || 0.8, 0.15);
      source.connect(filter).connect(gain).connect(master);
      track(source, when, duration || 0.8);
      return;
    }
    if (voice === "piano") {
      // 电钢：加法合成。每个泛音一条正弦，起音后各自指数衰减，高次泛音先死。
      const profile = RHODES;
      const frequencies = partialFrequencies(midi, profile);
      const decays = partialDecays(midi, profile);
      const longestAttack = Math.max(...profile.partials.map((partial) => partial.attack));
      // 按住的时间不能比起音还短，否则包络事件会乱序。
      const hold = Math.max(duration, longestAttack + 0.01);
      profile.partials.forEach((partial, index) => {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequencies[index] ?? frequency, when);
        const gain = context.createGain();
        const peak = profile.peak * partial.gain;
        const attack = partial.attack;
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(peak, when + attack);
        gain.gain.setTargetAtTime(0, when + attack, decays[index] ?? profile.baseDecaySeconds);
        // 松键：制音器落下，剩下的余音被快速掐掉，不跟下一个音叠在一起。
        gain.gain.setTargetAtTime(0, when + hold, profile.releaseSeconds);
        osc.connect(gain).connect(master);
        track(osc, when, hold + profile.releaseSeconds * 5);
      });
      // 槌击 / 音叉的瞬态噪声。
      const click = context.createBufferSource();
      click.buffer = noise;
      const band = context.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = profile.clickHz;
      band.Q.value = 0.8;
      const clickGain = context.createGain();
      clickGain.gain.setValueAtTime(profile.clickGain, when);
      clickGain.gain.setTargetAtTime(0, when + 0.002, profile.clickSeconds / 3);
      click.connect(band).connect(clickGain).connect(master);
      track(click, when, profile.clickSeconds);
      return;
    }
    if (voice === "pure") {
      // 纯音：听辨用。剥掉音色，只留音高。
      const spec = PLAIN_TONE;
      const hold = Math.max(duration, spec.attackSeconds + 0.01);
      const voices: { frequency: number; gain: number }[] = [
        { frequency, gain: spec.peak },
        // 八度泛音不改变音高感知，只是让音不那么刺耳。
        { frequency: frequency * 2, gain: spec.peak * spec.octaveGain },
      ];
      voices.forEach((voice) => {
        const osc = context.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(voice.frequency, when);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(voice.gain, when + spec.attackSeconds);
        gain.gain.setValueAtTime(voice.gain, when + hold);
        gain.gain.setTargetAtTime(0, when + hold, spec.releaseSeconds);
        osc.connect(gain).connect(master);
        track(osc, when, hold + spec.releaseSeconds * 5);
      });
      return;
    }
    const spec = pluckVoice();
    const osc = context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, when);
    const filter = lowpass(context, spec.lowpassHz);
    const gain = envelope(context, when, duration || spec.duration, 0.22);
    osc.connect(filter).connect(gain).connect(master);
    track(osc, when, duration || spec.duration);
  };

  return {
    async resume() {
      if (context.state === "suspended") await context.resume();
    },
    playPitch(midi, when = context.currentTime + 0.02, duration = PIANO_HOLD_SECONDS) {
      playVoice("piano", when, duration, midi);
    },
    playSequence(midis) {
      const start = context.currentTime + 0.05;
      midis.forEach((midi, index) => {
        playVoice(
          "pure",
          start + index * EAR_MELODIC_SPACING_SECONDS,
          EAR_MELODIC_SPACING_SECONDS - 0.12,
          midi,
        );
      });
    },
    playEarOption(midis) {
      const start = context.currentTime + 0.05;
      const hold = earChoiceHoldSeconds(midis);
      for (const note of earChoiceSchedule(midis)) {
        playVoice("pure", start + note.offset, hold, note.midi);
      }
    },
    playVoice,
    playSteps(steps, midi, bpm) {
      const seconds = stepSeconds(bpm);
      const origin = context.currentTime + 0.05;
      steps.forEach((on, index) => {
        if (!on) return;
        playVoice("piano", origin + index * seconds, Math.min(seconds * 0.9, 0.2), midi);
      });
    },
    playPump(bpm = 120) {
      const origin = context.currentTime + 0.06;
      const bus = context.createGain();
      bus.gain.setValueAtTime(1, origin);
      bus.connect(master);
      const seconds = stepSeconds(bpm);
      const triggers = [0, 4, 8, 12, 16, 20, 24, 28];
      const points = sidechainAutomation(triggers, seconds, 0.12, seconds * 3);
      const param = bus.gain;
      param.cancelScheduledValues(origin);
      param.setValueAtTime(1, origin);
      for (const point of points) param.linearRampToValueAtTime(point.gain, origin + point.time);
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(midiToFrequency(36), origin);
      const subGain = envelope(context, origin, seconds * 32, 0.35);
      osc.connect(subGain).connect(bus);
      track(osc, origin, seconds * 32);
      for (const step of triggers) playVoice("kick", origin + step * seconds, 0.18, 36);
    },
    applySidechain(gain, points, origin) {
      const param = gain.gain;
      param.cancelScheduledValues(origin);
      for (const point of points) {
        param.linearRampToValueAtTime(point.gain, origin + point.time);
      }
    },
    stopAll() {
      const at = context.currentTime;
      for (const node of live) node.stop(at);
      live.clear();
    },
  };
}

function envelope(context: AudioContext, when: number, duration: number, peak: number): GainNode {
  const gain = context.createGain();
  const end = Math.max(duration, 0.03);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + end);
  return gain;
}

function lowpass(context: AudioContext, frequency: number): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;
  return filter;
}

function waveshaper(context: AudioContext, drive: number): WaveShaperNode {
  const shape = context.createWaveShaper();
  shape.curve = saturationCurve(257, drive) as Float32Array<ArrayBuffer>;
  shape.oversample = "2x";
  return shape;
}

function createNoise(context: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

export { sidechainAutomation };
