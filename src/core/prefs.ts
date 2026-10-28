/**
 * 声音偏好。
 *
 * 单独一把 localStorage 键，不塞进 music-101.progress：
 * ProgressFile 的 normalize 会丢掉不认识的字段，而且偏好不该跟着进度备份一起被覆盖
 * （换电脑导入进度时，没人想顺便把音量也导回去）。
 *
 * 纯函数，不碰 localStorage：读写由界面层的 store 做。
 */
export const SETTINGS_KEY = "music-101.settings";

export interface SoundPrefs {
  /** 反馈音音量，0–1。只管反馈音，不管钢琴和听辨题。 */
  sfxVolume: number;
  sfxMuted: boolean;
}

export const DEFAULT_SOUND_PREFS: SoundPrefs = { sfxVolume: 0.8, sfxMuted: false };

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSoundPrefs(raw: string | null): SoundPrefs {
  if (!raw) return { ...DEFAULT_SOUND_PREFS };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
  if (!isRecord(value) || !isRecord(value.sound)) return { ...DEFAULT_SOUND_PREFS };
  const { sfxVolume, sfxMuted } = value.sound;
  return {
    sfxVolume:
      typeof sfxVolume === "number" && Number.isFinite(sfxVolume)
        ? clamp01(sfxVolume)
        : DEFAULT_SOUND_PREFS.sfxVolume,
    sfxMuted: typeof sfxMuted === "boolean" ? sfxMuted : DEFAULT_SOUND_PREFS.sfxMuted,
  };
}

export function serializeSoundPrefs(prefs: SoundPrefs): string {
  return JSON.stringify({ schema: 1, sound: { sfxVolume: clamp01(prefs.sfxVolume), sfxMuted: prefs.sfxMuted } });
}

export function effectiveSfxVolume(prefs: SoundPrefs): number {
  return prefs.sfxMuted ? 0 : clamp01(prefs.sfxVolume);
}
