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

/** 要配图的关号（第一批 8 关 + 第二批 9 关）。 */
const DIAGRAMMED = [1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 15, 18, 20, 22, 25, 26];

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

describe("教学图 · 第二批的数据要齐", () => {
  it("第 3 关的音程：标出来的半音数就是真的半音数", () => {
    const lesson = lessonById(3)!;
    const intervals = isStageLesson(lesson) ? lesson.intervals ?? [] : [];
    expect(intervals.length).toBeGreaterThanOrEqual(3);
    for (const item of intervals) {
      expect(item.to - item.from, `${item.quality} 的半音数对不上`).toBe(item.semitones);
      expect(item.size.length).toBeGreaterThan(0);
      expect(item.quality.length).toBeGreaterThan(0);
    }
    // 小二度必须比纯五挤：半音更少、协和度更差。
    const tight = intervals.find((item) => item.harmony === "挤");
    const wide = intervals.find((item) => item.harmony === "稳");
    expect(tight, "没有标出「挤」的音程").toBeDefined();
    expect(wide, "没有标出「稳」的音程").toBeDefined();
    expect(tight!.semitones).toBeLessThan(wide!.semitones);
  });

  it("第 4 关的和弦堆叠：根音、五音一样，只有三音差半音", () => {
    const lesson = lessonById(4)!;
    const stacks = isStageLesson(lesson) ? lesson.chordStack ?? [] : [];
    expect(stacks.length).toBe(2);
    for (const stack of stacks) {
      expect(stack.midis.length).toBe(3);
      expect(stack.roles).toEqual(["根音", "三音", "五音"]);
    }
    const [major, minor] = stacks;
    expect(major!.midis[0]).toBe(minor!.midis[0]); // 根音一样
    expect(major!.midis[2]).toBe(minor!.midis[2]); // 五音一样
    expect(major!.midis[1]! - minor!.midis[1]!).toBe(1); // 三音差半音
    // 拼写必须跟正文一致：小三的三音在 C 小调里是 E♭，不是 D♯。
    expect(major!.names).toEqual(["C", "E", "G"]);
    expect(minor!.names).toEqual(["C", "E♭", "G"]);
  });

  it("第 5 关节阶级数：七级齐全，而且全是 C 大调的音", () => {
    const lesson = lessonById(5)!;
    const steps = isStageLesson(lesson) ? lesson.scaleSteps ?? [] : [];
    expect(steps.map((step) => step.degree)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    const cMajor = [60, 62, 64, 65, 67, 69, 71];
    expect(steps.map((step) => step.midi)).toEqual(cMajor);
  });

  it("第 9 关的层数：装饰轨不算层，副歌比主歌多一层", () => {
    const lesson = lessonById(9)!;
    const columns = isStageLesson(lesson) ? lesson.layerStack ?? [] : [];
    expect(columns.length).toBe(2);
    const count = (column: (typeof columns)[number]) =>
      column.layers.filter((layer) => !layer.decorative).length;
    const verse = columns[0]!;
    const chorus = columns[1]!;
    // 副歌比主歌多两层真实轨道（kick + supersaw）。
    expect(count(chorus)).toBe(count(verse) + 2);
    expect(chorus.layers.filter((layer) => layer.added)).toHaveLength(2);
    // FX 是装饰轨：它在场，但不计入层数。
    expect(chorus.layers.some((layer) => layer.decorative)).toBe(true);
    expect(chorus.layers.filter((layer) => layer.decorative)).toHaveLength(1);
    // 装饰轨不参与「+2 层」的标注。
    expect(chorus.layers.filter((layer) => layer.added && !layer.decorative)).toHaveLength(2);
  });

  it("第 11 关的频段：kick 在最低、808 根音在它上面", () => {
    const lesson = lessonById(11)!;
    const bands = isStageLesson(lesson) ? lesson.frequencyBands : undefined;
    expect(bands).toBeDefined();
    const [kick, eightZeroEight] = bands!.bands;
    expect(kick!.to).toBeLessThanOrEqual(eightZeroEight!.from);
    // 示例音必须落在自己的频段里。
    for (const band of bands!.bands) {
      if (band.demoMidi === undefined) continue;
      const frequency = hz(band.demoMidi);
      expect(frequency).toBeGreaterThanOrEqual(band.from);
      expect(frequency).toBeLessThanOrEqual(band.to);
    }
  });

  it("第 15 关的和声功能：T → S → D，而且每块都有代表和弦", () => {
    const lesson = lessonById(15)!;
    const functions = isStageLesson(lesson) ? lesson.functions ?? [] : [];
    expect(functions.map((item) => item.code)).toEqual(["T", "S", "D"]);
    for (const item of functions) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.role.length).toBeGreaterThan(0);
      expect(item.midis?.length ?? 0, `${item.code} 没有代表和弦`).toBe(3);
    }
  });

  it("第 20 关的力度：主歌收着，副歌推上去", () => {
    const lesson = lessonById(20)!;
    const sections = isStageLesson(lesson) ? lesson.sections ?? [] : [];
    const verse = sections.find((section) => section.name === "Verse");
    const chorus = sections.find((section) => section.name === "Chorus");
    expect(verse?.velocity).toBe(70);
    expect(chorus?.velocity).toBe(110);
    expect(chorus!.velocity!).toBeGreaterThan(verse!.velocity!);
  });

  it("第 26 关的结构：段落首尾相接，正好铺满 16 小节", () => {
    const lesson = lessonById(26)!;
    const sections = isStageLesson(lesson) ? lesson.sections ?? [] : [];
    expect(sections.length).toBeGreaterThanOrEqual(3);
    let cursor = 0;
    for (const section of sections) {
      expect(section.startBar, `段落 ${section.name} 跟上一段接不上`).toBe(cursor);
      expect(section.bars).toBeGreaterThan(0);
      cursor += section.bars;
    }
    expect(cursor).toBe(isStageLesson(lesson) ? lesson.totalBars : -1);
  });
});
