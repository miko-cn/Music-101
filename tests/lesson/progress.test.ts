import { describe, expect, it } from "vitest";
import {
  emptyProgress,
  loadProgress,
  parseProgress,
  saveProgress,
  serializeProgress,
} from "../../src/core/lesson/progress.ts";

describe("进度", () => {
  it("坏数据和高版本都回到空进度", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("not json")).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ schema: 99, level1Passed: true }))).toEqual(emptyProgress());
  });

  it("能写进 storage 再读回来", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const progress = { ...emptyProgress(), level1Passed: true };
    saveProgress(storage, progress);
    expect(loadProgress(storage)).toEqual(progress);
    expect(serializeProgress(progress)).toContain('"schema":1');
  });
});
