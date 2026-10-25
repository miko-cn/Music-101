import { describe, expect, it } from "vitest";
import {
  EAR_BLOCK_HOLD_SECONDS,
  EAR_MELODIC_HOLD_SECONDS,
  EAR_MELODIC_SPACING_SECONDS,
  earChoiceHoldSeconds,
  earChoiceKind,
  earChoiceSchedule,
  isTertianStack,
} from "../../src/core/audio/ear.ts";
import { FLOW_LESSONS } from "../../src/content/index.ts";

describe("听辨选项的播法", () => {
  it("一个音就是单音", () => {
    expect(earChoiceKind([60])).toBe("single");
    expect(earChoiceKind([])).toBe("single");
  });

  it("两个音一定是旋律（音程题）", () => {
    expect(earChoiceKind([60, 64])).toBe("melodic");
    expect(earChoiceKind([60, 61])).toBe("melodic");
  });

  it("三和弦是和弦：音要同时响", () => {
    expect(earChoiceKind([60, 64, 67])).toBe("block");
    expect(earChoiceKind([60, 63, 67])).toBe("block");
  });

  it("七和弦也是和弦", () => {
    expect(earChoiceKind([60, 64, 67, 71])).toBe("block");
  });

  it("音阶是旋律：级进的音要一个接一个响", () => {
    expect(earChoiceKind([60, 62, 64, 65, 67, 69, 71])).toBe("melodic");
    expect(earChoiceKind([60, 62, 63, 65, 67, 68, 70])).toBe("melodic");
  });

  it("三个音一起响就是和弦，哪怕不是三度叠起来的", () => {
    // 「哪个是大三和弦」里的干扰项 C F G：必须同时响，否则比的就成了琶音
    expect(earChoiceKind([60, 65, 67])).toBe("block");
  });

  it("四个以上必须三度叠起来才算和弦", () => {
    // C E G D = Cadd9，是和弦
    expect(earChoiceKind([60, 64, 67, 72])).toBe("block");
    // C G Am F 只存了根音，是和弦进行，根音得依次响
    expect(earChoiceKind([60, 67, 69, 65])).toBe("melodic");
  });

  it("同一个音重复不是和弦（节奏题的占位音）", () => {
    expect(earChoiceKind([60, 60, 60])).toBe("melodic");
    expect(earChoiceKind([60, 60, 60, 60])).toBe("melodic");
  });

  it("散得很开的三个音不是和弦，是几件东西依次出现", () => {
    // 贝斯 + kick + supersaw：三个音代表三层，跨度 36 半音
    expect(earChoiceKind([36, 48, 72])).toBe("melodic");
  });

  it("和弦的播放计划里所有音同时响", () => {
    const plan = earChoiceSchedule([60, 64, 67]);
    expect(plan).toHaveLength(3);
    expect(plan.every((note) => note.offset === 0)).toBe(true);
  });

  it("旋律的播放计划里音依次响", () => {
    const plan = earChoiceSchedule([60, 62, 64]);
    expect(plan.map((note) => note.offset)).toEqual([0, 0.42, 0.84]);
  });

  it("旋律的音不会跟下一个音叠在一起", () => {
    expect(EAR_MELODIC_HOLD_SECONDS).toBeLessThan(EAR_MELODIC_SPACING_SECONDS);
  });

  it("和弦按住的比旋律长——要听得出性质", () => {
    expect(EAR_BLOCK_HOLD_SECONDS).toBeGreaterThan(EAR_MELODIC_HOLD_SECONDS);
    expect(earChoiceHoldSeconds([60, 64, 67])).toBe(EAR_BLOCK_HOLD_SECONDS);
    expect(earChoiceHoldSeconds([60, 64])).toBe(EAR_MELODIC_HOLD_SECONDS);
  });
});

describe("课程内容的一致性守卫", () => {
  const lessons = FLOW_LESSONS;

  it("所有关卡都有听辨题", () => {
    expect(lessons.length).toBeGreaterThan(0);
    for (const lesson of lessons) {
      expect(lesson.ear.length).toBeGreaterThan(0);
    }
  });

  it("被判定为旋律的选项，不能是三度叠起来的和弦", () => {
    // 和弦被当旋律播，就是把「什么性质的和弦」听成了「一串音」——必须挡住
    for (const lesson of lessons) {
      for (const question of lesson.ear) {
        for (const choice of question.choices) {
          if (earChoiceKind(choice.midis) !== "melodic") continue;
          expect(isTertianStack(choice.midis)).toBe(false);
        }
      }
    }
  });

  it("全是和弦的那道题，每个选项都必须同时响", () => {
    // 这是「哪个是大三和弦」这类题：一旦有一个选项被当旋律播，
    // 听到的就是琶音，答的却是和弦。
    for (const lesson of lessons) {
      for (const question of lesson.ear) {
        const allChords = question.choices.every((choice) => isTertianStack(choice.midis));
        if (!allChords) continue;
        for (const choice of question.choices) {
          expect(earChoiceKind(choice.midis)).toBe("block");
        }
      }
    }
  });

  it("四个音以上被判为和弦的选项，必须三度叠起来", () => {
    // 否则就是把和弦进行（只存了根音）当成了一个和弦同时响
    for (const lesson of lessons) {
      for (const question of lesson.ear) {
        for (const choice of question.choices) {
          if (earChoiceKind(choice.midis) !== "block") continue;
          if (choice.midis.length < 4) continue;
          expect(isTertianStack(choice.midis)).toBe(true);
        }
      }
    }
  });

  it("被判定为和弦的选项，跨度不超过两个八度", () => {
    for (const lesson of lessons) {
      for (const question of lesson.ear) {
        for (const choice of question.choices) {
          if (earChoiceKind(choice.midis) !== "block") continue;
          const sorted = [...choice.midis].sort((a, b) => a - b);
          const span = (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0);
          expect(span).toBeLessThanOrEqual(16);
        }
      }
    }
  });

  it("同一个音重复 N 次算 N 次事件，不是和弦", () => {
    // 节奏题在数拍子：「每一拍」= 4 个一样的音
    for (const lesson of lessons) {
      for (const question of lesson.ear) {
        for (const choice of question.choices) {
          if (new Set(choice.midis).size !== 1) continue;
          if (choice.midis.length < 2) continue;
          expect(earChoiceKind(choice.midis)).toBe("melodic");
        }
      }
    }
  });
});
