import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUND_PREFS,
  SETTINGS_KEY,
  effectiveSfxVolume,
  parseSoundPrefs,
  serializeSoundPrefs,
} from "../../src/core/prefs.ts";

describe("声音偏好", () => {
  it("键名跟进度分开", () => {
    expect(SETTINGS_KEY).toBe("music-101.settings");
  });

  it("没有数据 / 坏数据都回退默认值", () => {
    for (const raw of [null, "", "not json", "42", "null", "[]", '{"sound":"x"}']) {
      expect(parseSoundPrefs(raw)).toEqual(DEFAULT_SOUND_PREFS);
    }
  });

  it("往返不丢东西", () => {
    const prefs = { sfxVolume: 0.35, sfxMuted: true };
    expect(parseSoundPrefs(serializeSoundPrefs(prefs))).toEqual(prefs);
  });

  it("音量夹到 0–1，类型不对的字段单独回退", () => {
    expect(parseSoundPrefs('{"sound":{"sfxVolume":3,"sfxMuted":false}}').sfxVolume).toBe(1);
    expect(parseSoundPrefs('{"sound":{"sfxVolume":-1,"sfxMuted":false}}').sfxVolume).toBe(0);
    expect(parseSoundPrefs('{"sound":{"sfxVolume":"loud","sfxMuted":true}}')).toEqual({
      sfxVolume: DEFAULT_SOUND_PREFS.sfxVolume,
      sfxMuted: true,
    });
  });

  it("溢出成 Infinity 的音量回退默认值", () => {
    expect(parseSoundPrefs('{"sound":{"sfxVolume":1e999,"sfxMuted":false}}').sfxVolume).toBe(
      DEFAULT_SOUND_PREFS.sfxVolume,
    );
  });

  it("NaN 音量的有效音量是 0", () => {
    expect(effectiveSfxVolume({ sfxVolume: NaN, sfxMuted: false })).toBe(0);
  });

  it("静音时有效音量是 0", () => {
    expect(effectiveSfxVolume({ sfxVolume: 0.6, sfxMuted: true })).toBe(0);
    expect(effectiveSfxVolume({ sfxVolume: 0.6, sfxMuted: false })).toBe(0.6);
  });
});
