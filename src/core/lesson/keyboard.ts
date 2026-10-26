import { midiToPitchClass, type PitchClass } from "../theory/pitch.ts";
import { computerKeyAction } from "./keys.ts";

/**
 * 电脑键与琴键 → 声音的接线。
 *
 * 「按住多久响多久」这条规则必须只有一处实现：
 * 按下用 pressPitch 起音，松手用 releasePitch 制音，
 * 而不是按一个固定时长自己响完（playPitch 的老做法——那正是以前键盘不跟手的原因）。
 *
 * 这一层不碰 DOM，也不碰 React：
 * 关卡界面只负责把自己的状态接上来，声音的来龙去脉全在这里。
 */

/** 这段接线用到的引擎接口。测试可以塞个假的进来。 */
export interface KeyboardEngine {
  resume(): Promise<void>;
  /** 起音，返回一个能松开的句柄。 */
  pressPitch(midi: number): number;
  /** 松手：制音器落下。 */
  releasePitch(voiceId: number): void;
}

/** 一次键盘事件里我们关心的东西。 */
export interface KeyboardEventLike {
  key: string;
  repeat?: boolean;
  target?: unknown;
  preventDefault?: () => void;
}

/** 接线要用的宿主。 */
export interface ComputerKeyboardHost {
  /** 当前八度。 */
  getOctave(): number;
  /** 起音（按下）。 */
  pressNote(midi: number): void;
  /** 制音（松开）。 */
  releaseNote(midi: number): void;
  /** 换八度。 */
  onOctave(octave: number): void;
}

/** 键盘控制器。测试直接调它的方法，不需要浏览器。 */
export interface KeyboardController {
  keyDown(event: KeyboardEventLike): void;
  keyUp(event: KeyboardEventLike): void;
  /** 窗口失焦：这时候键盘的 keyup 不会来，得自己把还响着的音收掉。 */
  blur(): void;
  /** 离开这一页：把还响着的音收掉。 */
  dispose(): void;
  /** 现在还有几个音在响。测试用。 */
  soundingCount(): number;
}

/**
 * 电脑键 → 正在响的音。
 *
 * 用「键帽字符」做键而不是音高：按着音的时候换八度（Z / X），
 * 松手那一刻算出来的音高已经变了，按音高找会找不到当初按下的那个音。
 * midi 一起存着，松手时收掉的也是当初那个音。
 */
interface ActiveKey {
  pitch: PitchClass;
  midi: number;
}

/** 焦点在输入框里时不抢键盘。 */
export function isTypingTarget(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const element = target as { closest?: (selector: string) => unknown };
  if (typeof element.closest !== "function") return false;
  return element.closest("input, textarea, select, .ant-select") !== null;
}

/**
 * 造一个键盘控制器。
 *
 * host 用函数传进来，是因为关卡界面每次渲染都会换新对象，
 * 而这里要在事件发生的那一刻拿到「当前」的界面状态（比如当前八度）。
 */
export function createKeyboardController(host: () => ComputerKeyboardHost): KeyboardController {
  /** 按着的键 → 当初那个音。 */
  const active = new Map<string, ActiveKey>();

  /** 把所有还响着的音收掉。 */
  const releaseAll = () => {
    if (active.size === 0) return;
    for (const entry of active.values()) host().releaseNote(entry.midi);
    active.clear();
  };

  return {
    keyDown(event) {
      if (isTypingTarget(event.target)) return;
      const action = computerKeyAction({
        key: event.key,
        octave: host().getOctave(),
        down: true,
        repeat: event.repeat,
      });
      if (!action) return;
      event.preventDefault?.();
      if (action.kind === "octave") {
        host().onOctave(action.octave);
        return;
      }
      if (action.kind !== "press") return;
      active.set(action.key, { pitch: midiToPitchClass(action.midi), midi: action.midi });
      host().pressNote(action.midi);
    },

    keyUp(event) {
      const action = computerKeyAction({ key: event.key, octave: host().getOctave(), down: false });
      if (!action || action.kind !== "release") return;
      const entry = active.get(action.key);
      if (!entry) return;
      active.delete(action.key);
      host().releaseNote(entry.midi);
    },

    blur() {
      releaseAll();
    },

    dispose() {
      releaseAll();
    },

    soundingCount() {
      return active.size;
    },
  };
}

/** 事件来源。浏览器里是 window，测试里是个假的。 */
export interface KeyboardEventTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

/**
 * 把控制器接到浏览器键盘上。
 *
 * 返回一个清理函数：调用它会把还在响的音收掉。
 */
export function attachComputerKeyboard(
  host: () => ComputerKeyboardHost,
  target: KeyboardEventTarget = window,
): () => void {
  const controller = createKeyboardController(host);
  const onKeyDown = (event: Event) => controller.keyDown(event as unknown as KeyboardEventLike);
  const onKeyUp = (event: Event) => controller.keyUp(event as unknown as KeyboardEventLike);
  const onBlur = () => controller.blur();

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);
  return () => {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
    target.removeEventListener("blur", onBlur);
    controller.dispose();
  };
}

/**
 * 订阅音符事件的人（关卡页、全局键盘面板、乐理工作台）。
 *
 * 界面只靠这三件事更新自己：按下了哪个音、松开了哪个音、八度变了。
 */
export interface ComputerKeyboardListener {
  onPress(pitch: PitchClass, midi: number): void;
  onRelease(pitch: PitchClass, midi: number): void;
  onOctave(octave: number): void;
}

/** 全站唯一的键盘服务。 */
export interface ComputerKeyboardService {
  /**
   * 订阅音符事件。
   *
   * 第一个订阅者进来时才把电脑键接上浏览器，最后一个走的时候摘掉——
   * 没有人在用键盘时，按 A 不该到处乱响。
   */
  subscribe(listener: ComputerKeyboardListener): () => void;
  /** 当前八度。 */
  getOctave(): number;
  /** 设置八度（关卡的修正按钮要用）。 */
  setOctave(octave: number): void;
  /** 拿引擎。 */
  getEngine(): KeyboardEngine | null;
  /**
   * 起音。任何界面按下琴键都走这里。
   *
   * 电脑键、鼠标点琴键、触屏——全都汇到这一处，
   * 这样同一个音只响一次，所有键盘也一起亮。
   */
  pressNote(midi: number): void;
  /** 制音。任何界面松开琴键都走这里。 */
  releaseNote(midi: number): void;
}

/**
 * 造一个键盘服务。
 *
 * 发声只有这一处：界面订阅它，而不是各自去接键盘或各自开引擎。
 * 否则同一个键会被触发两次——声音叠两遍，还亮两遍。
 */
export function createComputerKeyboardService(options: {
  /** 把控制器接到浏览器上。 */
  attach: (host: () => ComputerKeyboardHost) => () => void;
  /** 拿引擎。 */
  getEngine: () => KeyboardEngine | null;
}): ComputerKeyboardService {
  const listeners = new Set<ComputerKeyboardListener>();
  /** 正在响的音：MIDI → 引擎里的句柄。 */
  const notes = new Map<number, number>();
  let detach: (() => void) | null = null;
  let octave = 4;

  const pressNote = (midi: number) => {
    const engine = options.getEngine();
    if (engine) {
      void engine.resume();
      // 同一个音重复按下：先把上一个收掉，别叠成两个。
      const previous = notes.get(midi);
      if (previous !== undefined) engine.releasePitch(previous);
      notes.set(midi, engine.pressPitch(midi));
    }
    const pitch = midiToPitchClass(midi);
    for (const listener of listeners) listener.onPress(pitch, midi);
  };

  const releaseNote = (midi: number) => {
    const engine = options.getEngine();
    const voiceId = notes.get(midi);
    if (voiceId !== undefined) {
      engine?.releasePitch(voiceId);
      notes.delete(midi);
    }
    const pitch = midiToPitchClass(midi);
    for (const listener of listeners) listener.onRelease(pitch, midi);
  };

  const host = (): ComputerKeyboardHost => ({
    getOctave: () => octave,
    pressNote,
    releaseNote,
    onOctave: (next) => {
      octave = next;
      for (const listener of listeners) listener.onOctave(next);
    },
  });

  /** 没人再听的时候，把还响着的音全收掉。 */
  const releaseAllNotes = () => {
    if (notes.size === 0) return;
    const engine = options.getEngine();
    for (const voiceId of notes.values()) engine?.releasePitch(voiceId);
    notes.clear();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!detach) detach = options.attach(host);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detach) {
          detach();
          detach = null;
          releaseAllNotes();
        }
      };
    },
    getOctave: () => octave,
    setOctave(next) {
      host().onOctave(next);
    },
    getEngine: options.getEngine,
    pressNote,
    releaseNote,
  };
}
