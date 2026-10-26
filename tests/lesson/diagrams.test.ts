import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LESSONS, lessonById } from "../../src/content/index.ts";
import { isStageLesson } from "../../src/content/types.ts";
import { DIAGRAM_KINDS } from "../../src/ui/diagrams/index.tsx";
import { blackKeyGroups, keyboardGeometry } from "../../src/ui/diagrams/keyboard-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(HERE, "..", "..", "src", "content", "lessons");

/** MIDI 音高转频率（Hz）。 */
function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 第一批要配图的关号。 */
const DIAGRAMMED = [1, 2, 7, 10, 12, 13, 18, 22];

describe("教学图 · 内容层", () => {
  it("第一批要配图的关卡都声明了图", () => {
    for (const id of DIAGRAMMED) {
      const lesson = lessonById(id);
      expect(lesson, `没有第 ${id} 关`).not.toBeNull();
      expect(lesson!.diagrams?.length ?? 0, `第 ${id} 关没有配图`).toBeGreaterThan(0);
    }
  });

  it("内容里用到的图种都登记在册（不会出现画不出来的哑巴图）", () => {
    for (const lesson of LESSONS) {
      for (const diagram of lesson.diagrams ?? []) {
        expect(DIAGRAM_KINDS, `第 ${lesson.id} 关用了没登记的图种 ${diagram.kind}`).toContain(
          diagram.kind,
        );
      }
    }
  });

  it("每张图都有图注——图讲形状，文字讲意思，两样都要有", () => {
    for (const lesson of LESSONS) {
      for (const diagram of lesson.diagrams ?? []) {
        expect(diagram.caption.trim().length, `第 ${lesson.id} 关的 ${diagram.kind} 没有图注`).toBeGreaterThan(
          10,
        );
      }
    }
  });

  it("内容文件保持纯数据：不 import React，也不 import 界面组件", () => {
    for (const name of readdirSync(LESSONS_DIR)) {
      if (!name.endsWith(".ts")) continue;
      const source = readFileSync(join(LESSONS_DIR, name), "utf8");
      expect(source, `${name} 引了 React`).not.toMatch(/from\s+"react"/);
      expect(source, `${name} 引了界面组件`).not.toMatch(/from\s+"[^"]*\/ui\//);
    }
  });
});

describe("教学图 · 每张图的数据要齐", () => {
  it("第 7 关的和弦进行是 I–V–vi–IV，和弦是 C G Am F", () => {
    const lesson = lessonById(7)!;
    const steps = isStageLesson(lesson) ? lesson.progression ?? [] : [];
    expect(steps.map((step) => step.roman)).toEqual(["I", "V", "vi", "IV"]);
    expect(steps.map((step) => step.symbol)).toEqual(["C", "G", "Am", "F"]);
    // 小写的 vi 必须是小三，性质和大小写要对得上。
    expect(steps[2]?.quality).toBe("小三");
    expect(steps[0]?.quality).toBe("大三");
    for (const step of steps) {
      expect(step.midis?.length ?? 0, `${step.roman} 没有音高`).toBe(3);
    }
  });

  it("第 10 关的鼓型：踢在第 1、9 格，军鼓和拍手在第 5、13 格，踩镲铺满八分", () => {
    const lesson = lessonById(10)!;
    const lanes = isStageLesson(lesson) ? lesson.drums ?? [] : [];
    const byRole = Object.fromEntries(lanes.map((lane) => [lane.role, lane.target]));
    const on = (target: boolean[] | undefined, index: number) => target?.[index] === true;
    expect(on(byRole.KICK, 0)).toBe(true);
    expect(on(byRole.KICK, 8)).toBe(true);
    expect(on(byRole.KICK, 4)).toBe(false);
    expect(on(byRole.SNARE, 4)).toBe(true);
    expect(on(byRole.SNARE, 12)).toBe(true);
    expect(on(byRole.CLAP, 4)).toBe(true);
    expect(on(byRole.CLAP, 12)).toBe(true);
    // 踩镲铺满八分：16 格里占 8 个偶数位。
    expect(byRole.HAT?.filter(Boolean).length).toBe(8);
  });

  it("第 13 关的段落能量：副歌是主歌的 1.5 倍", () => {
    const lesson = lessonById(13)!;
    const sections = isStageLesson(lesson) ? lesson.sections ?? [] : [];
    const verse = sections.find((section) => section.name === "Verse");
    const chorus = sections.find((section) => section.name === "Chorus");
    expect(verse?.energy).toBe(1);
    expect(chorus?.energy).toBe(1.5);
  });

  it("第 18 关的频段：每个角色都落在自己声明的区间里，示例音也在区间内", () => {
    const lesson = lessonById(18)!;
    const bands = isStageLesson(lesson) ? lesson.frequencyBands : undefined;
    expect(bands).toBeDefined();
    expect(bands!.bands.length).toBeGreaterThanOrEqual(4);
    for (const band of bands!.bands) {
      expect(band.from, `${band.label} 的下限大于上限`).toBeLessThan(band.to);
      expect(band.from).toBeGreaterThanOrEqual(0);
      if (band.demoMidi === undefined) continue;
      const frequency = hz(band.demoMidi);
      expect(frequency, `${band.label} 的示例音不在它自己的频段里`).toBeGreaterThanOrEqual(
        band.from,
      );
      expect(frequency, `${band.label} 的示例音不在它自己的频段里`).toBeLessThanOrEqual(band.to);
    }
    // 中频危险区必须落在人声 / 主旋律的地盘上。
    expect(bands!.zone?.from).toBe(200);
    expect(bands!.zone?.to).toBe(2000);
  });

  it("第 22 关的分层：副歌比主歌多两层，多出来的是和声层不是低频", () => {
    const lesson = lessonById(22)!;
    const columns = isStageLesson(lesson) ? lesson.layerStack ?? [] : [];
    expect(columns.length).toBe(2);
    const verse = columns[0]!;
    const chorus = columns[1]!;
    expect(chorus.layers.length - verse.layers.length).toBe(2);
    const added = chorus.layers.filter((layer) => layer.added).map((layer) => layer.name);
    expect(added.some((name) => name.includes("supersaw"))).toBe(true);
    // 副歌没有多出一条贝斯——多的是和声厚度。
    expect(chorus.layers.filter((layer) => layer.name.includes("贝斯")).length).toBe(
      verse.layers.filter((layer) => layer.name.includes("贝斯")).length,
    );
  });
});

describe("教学图 · 键盘几何", () => {
  it("黑键永远是二个一组、三个一组循环", () => {
    const geometry = keyboardGeometry(60, 15);
    const groups = blackKeyGroups(geometry.blacks);
    expect(groups.map((group) => group.size)).toEqual([2, 3, 2, 3]);
  });

  it("C 和 F 的定位点落在二黑键组和三黑键组左边", () => {
    const geometry = keyboardGeometry(60, 8);
    const whites = geometry.whites;
    // C 是第 0 个白键，E–F 之间没有黑键 → C 左边是二黑键组的头。
    expect(geometry.blacks[0]?.name).toBe("C♯4");
    expect(whites[0]?.name).toBe("C4");
    // F 是第 3 个白键，前面两个黑键（C#、D#）是一组。
    expect(whites[3]?.name).toBe("F4");
    expect(geometry.blacks.map((key) => key.name).slice(0, 5)).toEqual([
      "C♯4",
      "D♯4",
      "F♯4",
      "G♯4",
      "A♯4",
    ]);
  });

  it("E–F 和 B–C 之间没有黑键（整台键盘仅有的两个空档）", () => {
    const geometry = keyboardGeometry(60, 8);
    const blackAfter = new Set(geometry.blacks.map((key) => key.index));
    expect(blackAfter.has(2)).toBe(false); // E 后面没有黑键
    expect(blackAfter.has(6)).toBe(false); // B 后面没有黑键
    expect(blackAfter.has(0)).toBe(true);
    expect(blackAfter.has(1)).toBe(true);
  });
});
