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
  DAMPER_MIN_SECONDS,
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
  /** 按住琴键：起音，返回一个可以松开的句柄。延音由按住多久决定。 */
  pressPitch(midi: number): number;
  /** 松开琴键：制音器落下，声音在几十毫秒内消失。 */
  releasePitch(voiceId: number): void;
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

/** 一个正在响的、按住不放的电钢音。 */
interface HeldVoice {
  /** 起音时刻。制音器不会早于它落下。 */
  startedAt: number;
  /** 每条泛音的增益节点——制音器就落在这些节点上。 */
  gains: GainNode[];
  /** 还在响的振荡器。 */
  nodes: OscillatorNode[];
}

/** 浏览器里没有 AudioContext 时返回 null，关卡界面仍可作答和导出。 */
export function createEngine(): MusicEngine | null {
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.8;
  master.connect(context.destination);
  const live = new Set<Stoppable>();
  const heldVoices = new Map<number, HeldVoice>();
  let nextVoiceId = 1;
  const noise = createNoise(context, 1);

  /**
   * 电钢起音：加法合成。每个泛音一条正弦，起音后各自指数衰减，高次泛音先死。
   *
   * 这里只管「响起来」，不管「什么时候停」——停下是制音器的事（dampVoice）。
   */
  const startPiano = (when: number, midi: number): HeldVoice => {
    const profile = RHODES;
    const frequencies = partialFrequencies(midi, profile);
    const decays = partialDecays(midi, profile);
    const gains: GainNode[] = [];
    const nodes: OscillatorNode[] = [];
    profile.partials.forEach((partial, index) => {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencies[index] ?? midiToFrequency(midi), when);
      const gain = context.createGain();
      const peak = profile.peak * partial.gain;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(peak, when + partial.attack);
      gain.gain.setTargetAtTime(0, when + partial.attack, decays[index] ?? profile.baseDecaySeconds);
      osc.connect(gain).connect(master);
      osc.start(when);
      nodes.push(osc);
      gains.push(gain);
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
    clickGain.gain.setTargetAtTime(0, when, profile.clickSeconds / 3);
    click.connect(band).connect(clickGain).connect(master);
    track(click, when, profile.clickSeconds);
    return { startedAt: when, gains, nodes };
  };

  /**
   * 制音器落下：泛音被快速掐掉。
   *
   * 这就是「延音跟住按住时长」的关键——琴键一松，尾音立刻收掉，
   * 而不是按一个固定时长自己响完。
   */
  const dampVoice = (voice: HeldVoice, at: number) => {
    const profile = RHODES;
    const fall = Math.max(at, voice.startedAt + DAMPER_MIN_SECONDS);
    for (const gain of voice.gains) {
      gain.gain.setTargetAtTime(0, fall, profile.releaseSeconds);
    }
    for (const node of voice.nodes) {
      try {
        node.stop(fall + profile.releaseSeconds * 6);
      } catch {
        // 已经停过的节点再 stop 会抛，忽略即可。
      }
    }
  };

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
      // 电钢：起音 + 定时制音。
      const held = startPiano(when, midi);
      dampVoice(held, when + Math.max(duration, 0.05));
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
    pressPitch(midi) {
      const id = nextVoiceId++;
      heldVoices.set(id, startPiano(context.currentTime + 0.02, midi));
      return id;
    },
    releasePitch(voiceId) {
      const voice = heldVoices.get(voiceId);
      if (!voice) return;
      heldVoices.delete(voiceId);
      dampVoice(voice, context.currentTime);
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
      for (const voice of heldVoices.values()) dampVoice(voice, at);
      heldVoices.clear();
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

let shared: MusicEngine | null = null;
let sharedReady = false;

/**
 * 全站共用一个引擎，也就是只开一个 AudioContext。
 *
 * 关卡页、全局键盘面板、电脑键服务都用它——
 * 几个 AudioContext 各响各的，同一个音会听出两层厚度，还多占资源。
 */
export function sharedEngine(): MusicEngine | null {
  if (!sharedReady) {
    shared = createEngine();
    sharedReady = true;
  }
  return shared;
}
