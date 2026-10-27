/**
 * 声音偏好的界面层 store：读写 localStorage，并把音量推给引擎。
 *
 * 引擎是懒创建的（第一次出声才建 AudioContext），
 * 所以除了「改偏好时推一次」，每次播反馈音之前也要推一次——见 useFeedbackSfx。
 */
import { useSyncExternalStore } from "react";
import type { MusicEngine } from "../core/audio/engine.ts";
import { sharedEngine } from "../core/audio/engine.ts";
import {
  SETTINGS_KEY,
  effectiveSfxVolume,
  parseSoundPrefs,
  serializeSoundPrefs,
  type SoundPrefs,
} from "../core/prefs.ts";

const storage = typeof localStorage === "undefined" ? null : localStorage;
let prefs: SoundPrefs = parseSoundPrefs(storage?.getItem(SETTINGS_KEY) ?? null);
const listeners = new Set<() => void>();

export function getSoundPrefs(): SoundPrefs {
  return prefs;
}

export function setSoundPrefs(next: SoundPrefs): void {
  prefs = next;
  sharedEngine()?.setSfxVolume(effectiveSfxVolume(next));
  for (const listener of listeners) listener();
  // 最后才写存储：隐私模式、配额满时 setItem 会抛，不能让它拦住界面和引擎。
  try {
    storage?.setItem(SETTINGS_KEY, serializeSoundPrefs(next));
  } catch {
    // 存不下就只在本次会话生效。
  }
}

export function applySfxVolume(engine: MusicEngine): void {
  engine.setSfxVolume(effectiveSfxVolume(prefs));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(subscribe, getSoundPrefs);
}
