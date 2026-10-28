import { describe, expect, it } from "vitest";
import { lesson as level26 } from "../../src/content/lessons/level-26.ts";
import {
  chorusLifted,
  endsOnTonic,
  hasTaughtColor,
  inKeyChords,
  taughtProgression,
} from "../../src/core/lesson/capstone.ts";
import { choiceEnergySong, diagnoseStage, emptyStageState, stagePassed } from "../../src/core/lesson/stage1.ts";

function stateAt(hand: number) {
  return {
    earAnswers: level26.ear.map((question) => question.correct),
    hand,
  };
}

describe("第 26 关压轴按教过的规则判", () => {
  it("I–V–vi–IV 和 i–♭VI–♭III–♭VII 都能过，缺层 / 跑调 / 没收在 T 不能过", () => {
    const labels = level26.handChoices.map((choice) => choice.label);
    expect(labels.some((label) => label.includes("I–V–vi–IV"))).toBe(true);
    expect(labels.some((label) => /i–♭VI–♭III–♭VII|i–bVI–bIII–bVII/.test(label))).toBe(true);
    expect(labels.some((label) => /add9|maj7|三和弦/.test(label))).toBe(true);

    const passing = level26.handChoices.flatMap((choice, index) => {
      const chords = choice.chords;
      const song = choiceEnergySong(level26, index);
      const ok =
        taughtProgression(chords) &&
        inKeyChords(chords) &&
        hasTaughtColor(chords) &&
        endsOnTonic(chords) &&
        song !== null &&
        chorusLifted(song);
      return ok ? [index] : [];
    });
    expect(passing.length).toBeGreaterThanOrEqual(2);
    for (const index of passing) {
      expect(stagePassed(level26, stateAt(index)), `选项 ${index} 应能过`).toBe(true);
    }

    const failing = level26.handChoices
      .map((_, index) => index)
      .filter((index) => !passing.includes(index));
    expect(failing.length).toBeGreaterThanOrEqual(2);
    for (const index of failing) {
      expect(stagePassed(level26, stateAt(index)), `选项 ${index} 不应只靠 supersaw 过关`).toBe(false);
    }
  });

  it("诊断查调内、副歌抬层和收在 T，不把没 supersaw 当成唯一错误", () => {
    const empty = { ...emptyStageState(level26), earAnswers: level26.ear.map((question) => question.correct) };
    expect(diagnoseStage(level26, empty).some((item) => item.id.includes("hand-empty"))).toBe(true);

    const ids = new Set(
      level26.handChoices.flatMap((_, index) => diagnoseStage(level26, stateAt(index)).map((item) => item.id)),
    );
    expect([...ids].some((id) => /harmony|inkey|lift|cadence|color/.test(id))).toBe(true);
    expect([...ids].every((id) => !id.includes("supersaw"))).toBe(true);
  });
});
