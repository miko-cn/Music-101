import { describe, expect, it } from "vitest";
import { STAGE_LESSONS } from "../../src/content/stage1.ts";
import { ARRANGING_LESSONS } from "../../src/content/arranging.ts";

/**
 * MIDI 标记文本跟它写的音高必须是同一个和弦。
 *
 * 标记文本是导出到 .mid 之后在 Cubase 里看到的东西，音高是网页里播的东西。
 * 两者对不上，学习者听到的和在 Cubase 里看到的就是两回事——而且这种错
 * 肉眼看截图是发现不了的，只能靠校验。
 *
 * 真出过一回：关 4 的手做选项标着 "Cdim"，音高却写成了 C E♭ A♭。
 */

interface Chord {
  pitches: number[];
  text: string;
}

const ROOT_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 性质 → 相对根音的音级偏移。 */
const PATTERNS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  "m(maj7)": [0, 3, 7, 11],
  "m(add9)": [0, 3, 7, 14],
};

function parseChordText(text: string): { root: string; rootOffset: number; quality: string } | null {
  let name = text.replace(/\s+/g, "");
  const withDegree = /^([A-G][^\s(]*)\s*\((?:[IViv]+|♭[IViv]+)\)$/.exec(text);
  if (withDegree) name = withDegree[1]!;
  const match =
    /^([A-G])([#b]?)(m)?(\(maj7\)|\(add9\)|maj7|m7b5|dim7|add9|sus4|sus2|dim|aug|m7|m|7)?$/.exec(name);
  if (!match) return null;
  const letter = match[1]!;
  const acc = match[2] ?? "";
  const minor = match[3] === "m";
  const tail = match[4] ?? "";
  const quality = tail ? `${minor ? "m" : ""}${tail}` : minor ? "m" : "";
  return {
    root: letter,
    rootOffset: acc === "#" ? 1 : acc === "b" ? -1 : 0,
    quality,
  };
}

const ALL_LESSONS = [...STAGE_LESSONS, ...ARRANGING_LESSONS];

function allChords(): { lesson: string; chord: Chord }[] {
  const out: { lesson: string; chord: Chord }[] = [];
  for (const lesson of ALL_LESSONS) {
    for (const choice of lesson.handChoices ?? []) {
      for (const chord of choice.chords ?? []) {
        out.push({ lesson: `关 ${lesson.id} · ${lesson.title}`, chord });
      }
    }
  }
  return out;
}

describe("MIDI 标记与音高一致", () => {
  const chords = allChords();

  it("确实有和弦要校验（别让守卫变成空跑）", () => {
    expect(chords.length).toBeGreaterThan(20);
  });

  it("每个和弦的标记都跟音高对得上", () => {
    const problems: string[] = [];
    for (const { lesson, chord } of chords) {
      const parsed = parseChordText(chord.text);
      if (!parsed) {
        problems.push(`${lesson}：认不出来的记号 "${chord.text}"`);
        continue;
      }
      const pattern = PATTERNS[parsed.quality];
      if (!pattern) {
        problems.push(`${lesson}：认不出来的性质 "${chord.text}"`);
        continue;
      }
      const base = ROOT_SEMITONE[parsed.root]! + parsed.rootOffset;
      const actual = [...chord.pitches].sort((a, b) => a - b);
      const rootPitch = actual.find((pitch) => pitch % 12 === base);
      if (rootPitch === undefined) {
        problems.push(`${lesson}："${chord.text}" 的音高 [${actual.join(",")}] 里没有根音`);
        continue;
      }
      const want = pattern.map((offset) => rootPitch + offset).sort((a, b) => a - b);
      if (actual.length !== want.length || actual.some((pitch, i) => pitch !== want[i])) {
        problems.push(
          `${lesson}：标记 "${chord.text}" 的音高 [${actual.join(",")}] 应为 [${want.join(",")}]`,
        );
      }
    }
    expect(problems).toEqual([]);
  });
});
