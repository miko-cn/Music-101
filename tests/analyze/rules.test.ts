import { describe, expect, it } from "vitest";
import { diagnoseArrangement } from "../../src/core/analyze/rules/index.ts";
import { energySeries } from "../../src/core/analyze/energy.ts";
import {
  borrowedSong,
  chorusFlatSong,
  chorusLiftedSong,
  freshColorSong,
  lowEndClashSong,
  midClashSong,
  outOfKeySong,
  repeatedColorSong,
  separatedSpectrumSong,
  staleSong,
} from "../../src/core/analyze/fixtures.ts";

function ids(song: Parameters<typeof diagnoseArrangement>[0]): string[] {
  return diagnoseArrangement(song).map((item) => item.id);
}

describe("和声归属", () => {
  it("C 大调里的 F# 定位到第 1 小节", () => {
    const found = diagnoseArrangement(outOfKeySong()).filter((item) => item.id.startsWith("harmony"));
    expect(found).toHaveLength(1);
    expect(found[0]?.bar).toBe(0);
    expect(found[0]?.message).toContain("F#");
  });

  it("关卡 8 之后的 ♭VII 放行，之前不放行", () => {
    expect(ids(borrowedSong(false)).some((id) => id.startsWith("harmony"))).toBe(true);
    expect(ids(borrowedSong(true)).some((id) => id.startsWith("harmony"))).toBe(false);
  });
});

describe("能量曲线", () => {
  it("一层低音、力度 80，能量是 80", () => {
    const series = energySeries(chorusFlatSong());
    expect(series[0]).toMatchObject({ bar: 0, layers: 1, lowest: 48, energy: 80 });
  });

  it("副歌没抬层时定位到副歌第一小节；抬层后这条消失", () => {
    const flat = diagnoseArrangement(chorusFlatSong()).find((item) => item.id === "energy-lift");
    expect(flat?.bar).toBe(4);
    expect(diagnoseArrangement(chorusLiftedSong()).some((item) => item.id === "energy-lift")).toBe(false);
  });
});

describe("低频冲突", () => {
  it("808 低于 MIDI 33 且同一小节有 kick，定位到第 2 小节", () => {
    const found = diagnoseArrangement(lowEndClashSong()).filter((item) => item.id.startsWith("low-end"));
    expect(found.map((item) => item.bar)).toEqual([1]);
  });
});

describe("频段占位", () => {
  it("两条中频轨重心重合时报冲突，kick 和 supersaw 分开时不报", () => {
    const clash = diagnoseArrangement(midClashSong()).find((item) => item.id.startsWith("spectrum"));
    expect(clash?.bar).toBe(0);
    expect(clash?.message).toContain("BASS");
    expect(diagnoseArrangement(separatedSpectrumSong()).some((item) => item.id.startsWith("spectrum"))).toBe(false);
  });
});

describe("结构体检", () => {
  it("同一个和声连着四小节，从第 4 小节报失去新鲜感", () => {
    const stale = diagnoseArrangement(staleSong()).find((item) => item.id === "structure-stale");
    expect(stale?.bar).toBe(3);
    expect(stale?.message).toContain("第 4 小节");
  });
});

describe("和弦色彩重复度", () => {
  it("完全相同的相邻小节报在后一小节，换成 F 大三则不报", () => {
    const repeat = diagnoseArrangement(repeatedColorSong()).find((item) => item.id.startsWith("color"));
    expect(repeat?.bar).toBe(1);
    expect(diagnoseArrangement(freshColorSong()).some((item) => item.id.startsWith("color"))).toBe(false);
  });
});
