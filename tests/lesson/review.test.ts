import { describe, expect, it } from "vitest";
import {
  REVIEW_DAY_MS,
  REVIEW_INTERVAL_DAYS,
  REVIEW_MAX_BOX,
  dueReviewCards,
  findReviewCard,
  gradeReviewCard,
  nextReviewDueAt,
  reviewCardId,
  reviewDueAt,
  reviewDueText,
  reviewIntervalDays,
  shuffleChoices,
  syncReviewCard,
  type ReviewCard,
} from "../../src/core/lesson/review.ts";
import { reviewQuestionFor } from "../../src/core/lesson/review-questions.ts";
import { LEVEL1_EAR } from "../../src/content/lessons/level-01.ts";
import { lessonById } from "../../src/content/index.ts";

const DAY = REVIEW_DAY_MS;
const NOW = 1_700_000_000_000;

function card(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: reviewCardId(11),
    levelId: 11,
    box: 0,
    round: 0,
    lastAt: NOW,
    dueAt: NOW,
    lastVisit: "v1",
    lastPassed: true,
    ...overrides,
  };
}

describe("复习盒子 · 间隔表", () => {
  it("档位越高间隔拉得越开", () => {
    expect(REVIEW_INTERVAL_DAYS).toEqual([0, 1, 3, 7, 16, 35]);
    for (let box = 1; box < REVIEW_INTERVAL_DAYS.length; box += 1) {
      expect(REVIEW_INTERVAL_DAYS[box]).toBeGreaterThan(REVIEW_INTERVAL_DAYS[box - 1]!);
    }
  });

  it("越界的档位夹回区间，不抛错", () => {
    expect(reviewIntervalDays(-3)).toBe(REVIEW_INTERVAL_DAYS[0]);
    expect(reviewIntervalDays(0)).toBe(0);
    expect(reviewIntervalDays(REVIEW_MAX_BOX)).toBe(REVIEW_INTERVAL_DAYS[REVIEW_MAX_BOX]);
    expect(reviewIntervalDays(999)).toBe(REVIEW_INTERVAL_DAYS[REVIEW_MAX_BOX]);
    expect(reviewIntervalDays(2.7)).toBe(REVIEW_INTERVAL_DAYS[2]);
  });

  it("到期时间 = 现在 + 这一档的天数", () => {
    expect(reviewDueAt(0, NOW)).toBe(NOW);
    expect(reviewDueAt(3, NOW)).toBe(NOW + 7 * DAY);
    expect(reviewDueAt(5, NOW)).toBe(NOW + 35 * DAY);
  });
});

describe("复习盒子 · 建卡与升降", () => {
  it("第一次过关：建卡、盒子 0、今天就到期", () => {
    const cards = syncReviewCard([], { levelId: 11, visitId: "v1", passed: true, now: NOW });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: "level:11",
      levelId: 11,
      box: 0,
      round: 0,
      dueAt: NOW,
      lastVisit: "v1",
      lastPassed: true,
    });
  });

  it("没过关的关卡不进队列", () => {
    expect(syncReviewCard([], { levelId: 11, visitId: "v1", passed: false, now: NOW })).toEqual([]);
  });

  it("同一次进关重复结算：盒子不动（关卡页会反复调结算）", () => {
    const first = syncReviewCard([], { levelId: 11, visitId: "v1", passed: true, now: NOW });
    const second = syncReviewCard(first, { levelId: 11, visitId: "v1", passed: true, now: NOW + 1000 });
    expect(second[0]?.box).toBe(0);
    expect(second[0]?.dueAt).toBe(NOW);
    expect(second[0]?.lastAt).toBe(NOW);
  });

  it("换一次进关再过关：升一档，按新档位排下次到期", () => {
    const first = syncReviewCard([], { levelId: 11, visitId: "v1", passed: true, now: NOW });
    const second = syncReviewCard(first, { levelId: 11, visitId: "v2", passed: true, now: NOW });
    expect(second[0]?.box).toBe(1);
    expect(second[0]?.dueAt).toBe(NOW + 1 * DAY);
  });

  it("同一 visitId 从没过关变成过关：要能生效", () => {
    const first = syncReviewCard([], { levelId: 11, visitId: "v1", passed: false, now: NOW });
    const second = syncReviewCard(first, { levelId: 11, visitId: "v1", passed: true, now: NOW });
    expect(second).toHaveLength(1);
    expect(second[0]?.box).toBe(0);
    expect(second[0]?.lastPassed).toBe(true);
  });

  it("没过关：降一档，今天还要再练", () => {
    const cards = syncReviewCard([card({ box: 3, dueAt: NOW + 7 * DAY })], {
      levelId: 11,
      visitId: "v2",
      passed: false,
      now: NOW,
    });
    expect(cards[0]?.box).toBe(2);
    expect(cards[0]?.dueAt).toBe(NOW);
  });

  it("没过关时不会把盒子降到负数", () => {
    const cards = syncReviewCard([card({ box: 0 })], {
      levelId: 11,
      visitId: "v2",
      passed: false,
      now: NOW,
    });
    expect(cards[0]?.box).toBe(0);
  });

  it("过关升到顶就不再升", () => {
    const cards = syncReviewCard([card({ box: REVIEW_MAX_BOX })], {
      levelId: 11,
      visitId: "v2",
      passed: true,
      now: NOW,
    });
    expect(cards[0]?.box).toBe(REVIEW_MAX_BOX);
    expect(cards[0]?.dueAt).toBe(NOW + 35 * DAY);
  });

  it("别的关卡不受影响", () => {
    const before = [card({ levelId: 11 }), { ...card({ id: "level:12" }), levelId: 12 }];
    const after = syncReviewCard(before, { levelId: 11, visitId: "v2", passed: true, now: NOW });
    expect(after.find((item) => item.levelId === 12)?.box).toBe(0);
  });
});

describe("复习盒子 · 复习判定", () => {
  it("答对升一档、轮次 +1、按新档位排下次", () => {
    const cards = gradeReviewCard([card({ box: 1 })], { levelId: 11, correct: true, now: NOW });
    expect(cards[0]?.box).toBe(2);
    expect(cards[0]?.round).toBe(1);
    expect(cards[0]?.dueAt).toBe(NOW + 3 * DAY);
  });

  it("答错掉回 0，今天还要再练", () => {
    const cards = gradeReviewCard([card({ box: 4 })], { levelId: 11, correct: false, now: NOW });
    expect(cards[0]?.box).toBe(0);
    expect(cards[0]?.round).toBe(1);
    expect(cards[0]?.dueAt).toBe(NOW);
  });

  it("没有卡就什么都不做", () => {
    expect(gradeReviewCard([], { levelId: 11, correct: true, now: NOW })).toEqual([]);
  });

  it("答对升到顶就停在顶", () => {
    const cards = gradeReviewCard([card({ box: REVIEW_MAX_BOX })], {
      levelId: 11,
      correct: true,
      now: NOW,
    });
    expect(cards[0]?.box).toBe(REVIEW_MAX_BOX);
  });
});

describe("复习盒子 · 到期与排序", () => {
  it("只留下已经到期的卡，按到期先后排", () => {
    const cards = [
      card({ id: "level:11", levelId: 11, dueAt: NOW + 3 * DAY }),
      card({ id: "level:12", levelId: 12, dueAt: NOW - DAY }),
      card({ id: "level:13", levelId: 13, dueAt: NOW }),
    ];
    const due = dueReviewCards(cards, NOW);
    expect(due.map((item) => item.levelId)).toEqual([12, 13]);
  });

  it("同时到期按关号排，顺序稳定", () => {
    const cards = [
      card({ id: "level:13", levelId: 13, dueAt: NOW }),
      card({ id: "level:11", levelId: 11, dueAt: NOW }),
    ];
    expect(dueReviewCards(cards, NOW).map((item) => item.levelId)).toEqual([11, 13]);
  });

  it("下一张到期时间取最早的那张", () => {
    expect(nextReviewDueAt([])).toBeNull();
    expect(
      nextReviewDueAt([
        card({ id: "level:11", levelId: 11, dueAt: NOW + 5 * DAY }),
        card({ id: "level:12", levelId: 12, dueAt: NOW + DAY }),
      ]),
    ).toBe(NOW + DAY);
  });

  it("到期时间说成人话", () => {
    expect(reviewDueText(NOW, NOW)).toBe("现在就能复习");
    expect(reviewDueText(NOW + DAY, NOW)).toBe("明天");
    expect(reviewDueText(NOW + 3 * DAY, NOW)).toBe("3 天后");
  });

  it("按关号找卡", () => {
    const cards = [card({ levelId: 11 })];
    expect(findReviewCard(cards, 11)?.levelId).toBe(11);
    expect(findReviewCard(cards, 12)).toBeNull();
  });
});

describe("复习盒子 · 洗牌", () => {
  it("同一个种子给同一个顺序", () => {
    const items = [0, 1, 2, 3, 4, 5];
    expect(shuffleChoices(items, "seed")).toEqual(shuffleChoices(items, "seed"));
  });

  it("换种子通常换顺序（这里断言至少一个位置变了）", () => {
    const items = [0, 1, 2, 3, 4, 5];
    const left = shuffleChoices(items, "seed-a");
    const right = shuffleChoices(items, "seed-b");
    expect(left).not.toEqual(right);
  });

  it("不改动原数组", () => {
    const items = [0, 1, 2, 3];
    const copy = [...items];
    shuffleChoices(items, "seed");
    expect(items).toEqual(copy);
  });

  it("打乱后每一项都还在，也还是那些项", () => {
    const items = [0, 1, 2, 3, 4];
    const out = shuffleChoices(items, "seed");
    expect(out).toHaveLength(items.length);
    expect([...out].sort((left, right) => left - right)).toEqual(items);
  });
});

describe("复习抽题", () => {
  it("第 1 关从 LEVEL1_EAR 抽题，选项被统一成带 midis 数组的形状", () => {
    const question = reviewQuestionFor(1, 0);
    expect(question).not.toBeNull();
    expect(question!.choices).toHaveLength(LEVEL1_EAR[0]!.choices.length);
    for (const choice of question!.choices) {
      expect(Array.isArray(choice.midis)).toBe(true);
      expect(choice.midis).toHaveLength(1);
    }
  });

  it("轮次决定抽到第几道题，一关里的题都能轮到", () => {
    const seen = new Set<string>();
    for (let round = 0; round < LEVEL1_EAR.length; round += 1) {
      seen.add(reviewQuestionFor(1, round)!.id);
    }
    expect(seen.size).toBe(LEVEL1_EAR.length);
  });

  it("轮次转一圈就回到第一道", () => {
    expect(reviewQuestionFor(1, 0)!.id).toBe(reviewQuestionFor(1, LEVEL1_EAR.length)!.id);
  });

  it("correct 下标指向的内容跟原题一致（重映射没写错）", () => {
    for (let round = 0; round < LEVEL1_EAR.length * 2; round += 1) {
      const question = reviewQuestionFor(1, round)!;
      const source = LEVEL1_EAR.find((item) => item.id === question.id)!;
      expect(question.choices[question.correct]?.label).toBe(source.choices[source.correct]?.label);
      expect(question.correct).toBeGreaterThanOrEqual(0);
      expect(question.correct).toBeLessThan(question.choices.length);
    }
  });

  it("同一轮刷新页面顺序不变，换一轮才换位置", () => {
    const first = reviewQuestionFor(1, 0)!;
    const again = reviewQuestionFor(1, 0)!;
    expect(again.choices.map((item) => item.label)).toEqual(first.choices.map((item) => item.label));
    expect(again.correct).toBe(first.correct);
  });

  it("带记忆锚，答错时能补一句", () => {
    const question = reviewQuestionFor(11, 0)!;
    const lesson = lessonById(11)!;
    expect(question.anchorName).toBe(lesson.anchor.name);
    expect(question.anchorHook).toBe(lesson.anchor.hook);
  });

  it("不存在的关卡抽不出题", () => {
    expect(reviewQuestionFor(999, 0)).toBeNull();
  });

  it("每一关抽出来的题都对得上它自己的题库", () => {
    for (let levelId = 2; levelId <= 27; levelId += 1) {
      const question = reviewQuestionFor(levelId, 0);
      expect(question, `第 ${levelId} 关抽不出题`).not.toBeNull();
      expect(question!.choices.length).toBeGreaterThanOrEqual(2);
      expect(question!.correct).toBeLessThan(question!.choices.length);
    }
  });
});
