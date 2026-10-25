import { midiToPitchClass, type PitchClass } from "../theory/pitch.ts";
import { computerKeyAction } from "./keys.ts";

/**
 * 电脑键 → 声音的接线。
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

/** 关卡界面要提供的东西。 */
export interface ComputerKeyboardHost {
  /** 当前八度。 */
  getOctave(): number;
  /** 拿引擎。返回 null 表示这个浏览器里没有声音，界面照样能用。 */
  getEngine(): KeyboardEngine | null;
  /** 按下：点亮琴键、选中这个音高。 */
  onPress(pitch: PitchClass, midi: number): void;
  /** 松开：熄灭琴键。 */
  onRelease(pitch: PitchClass, midi: number): void;
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
 * pitch 和 midi 一起存着，松手时亮灭的也是当初那把琴键。
 */
interface ActiveKey {
  pitch: PitchClass;
  midi: number;
  /** 引擎里的句柄。没有引擎时是 null（界面照样能亮灭）。 */
  voiceId: number | null;
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
  /** 按着的键 → 当初那把琴键。亮灯跟声音分开记，没有引擎时琴键也照样能熄。 */
  const active = new Map<string, ActiveKey>();

  /** 把所有还响着的音收掉。notify 为 false 时只收声音，不动界面（卸载时用）。 */
  const releaseAll = (notify: boolean) => {
    if (active.size === 0) return;
    const engine = host().getEngine();
    for (const entry of active.values()) {
      if (entry.voiceId !== null) engine?.releasePitch(entry.voiceId);
      if (notify) host().onRelease(entry.pitch, entry.midi);
    }
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

      const pitch = midiToPitchClass(action.midi);
      host().onPress(pitch, action.midi);

      const engine = host().getEngine();
      let voiceId: number | null = null;
      if (engine) {
        void engine.resume();
        // 同一个键重复按下（keyup 漏了）：先把上一个音收掉，别叠成两个。
        const previous = active.get(action.key);
        if (previous && previous.voiceId !== null) engine.releasePitch(previous.voiceId);
        voiceId = engine.pressPitch(action.midi);
      }
      active.set(action.key, { pitch, midi: action.midi, voiceId });
    },

    keyUp(event) {
      const action = computerKeyAction({ key: event.key, octave: host().getOctave(), down: false });
      if (!action || action.kind !== "release") return;
      const entry = active.get(action.key);
      if (!entry) return;
      active.delete(action.key);
      if (entry.voiceId !== null) host().getEngine()?.releasePitch(entry.voiceId);
      host().onRelease(entry.pitch, entry.midi);
    },

    blur() {
      releaseAll(true);
    },

    dispose() {
      releaseAll(false);
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
 * 订阅电脑键的人（关卡页、全局键盘面板）。
 *
 * 界面只靠这三件事更新自己：按下了哪个音、松开了哪个音、八度变了。
 */
export interface ComputerKeyboardListener {
  onPress(pitch: PitchClass, midi: number): void;
  onRelease(pitch: PitchClass, midi: number): void;
  onOctave(octave: number): void;
}

/** 全站唯一的电脑键盘。 */
export interface ComputerKeyboardService {
  /**
   * 订阅电脑键事件。
   *
   * 第一个订阅者进来时才把键盘接上浏览器，最后一个走的时候摘掉——
   * 没有人在用键盘时，按 A 不该到处乱响。
   */
  subscribe(listener: ComputerKeyboardListener): () => void;
  /** 当前八度。 */
  getOctave(): number;
  /** 设置八度（关卡的修正按钮要用）。 */
  setOctave(octave: number): void;
  /** 拿引擎。 */
  getEngine(): KeyboardEngine | null;
}

/**
 * 造一个电脑键盘服务。
 *
 * 发声只有这一处：界面订阅它，而不是各自去接键盘。
 * 否则同一个键会被接好几次——声音叠两遍，还亮两遍。
 */
export function createComputerKeyboardService(options: {
  /** 把控制器接到浏览器上。 */
  attach: (host: () => ComputerKeyboardHost) => () => void;
  /** 拿引擎。 */
  getEngine: () => KeyboardEngine | null;
}): ComputerKeyboardService {
  const listeners = new Set<ComputerKeyboardListener>();
  let detach: (() => void) | null = null;
  let octave = 4;

  const host = (): ComputerKeyboardHost => ({
    getOctave: () => octave,
    getEngine: options.getEngine,
    onPress: (pitch, midi) => {
      for (const listener of listeners) listener.onPress(pitch, midi);
    },
    onRelease: (pitch, midi) => {
      for (const listener of listeners) listener.onRelease(pitch, midi);
    },
    onOctave: (next) => {
      octave = next;
      for (const listener of listeners) listener.onOctave(next);
    },
  });

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!detach) detach = options.attach(host);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detach) {
          detach();
          detach = null;
        }
      };
    },
    getOctave: () => octave,
    setOctave(next) {
      host().onOctave(next);
    },
    getEngine: options.getEngine,
  };
}
