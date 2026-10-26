/**
 * 复习队列（Leitner 盒）。
 *
 * 这个文件只管「盒子怎么动」：不碰 DOM、不碰 React、不碰关卡内容，
 * 所以到期算法和升降规则能被单测直接守卫。
 *
 * 为什么要有它：碎片学习的敌人是遗忘，不是难度。
 * 之前「连续 2 次卡住就复习上一关」只是一句读完就散的建议，
 * 一周没碰的关卡永远不会被叫回去——这个盒子就是那个「叫回去」的机制。
 */

/** 盒子最高档。过了这一档就不再往上加，只是不再天天出现。 */
export const REVIEW_MAX_BOX = 5;

/**
 * 每一档隔几天复习一次（天）。
 *
 * 0、1、3、7、16、35——越往上的盒子间隔拉得越开，
 * 这是遗忘曲线的大致形状：刚学的要快看一眼，记得牢的少打扰。
 */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const;

/** 一天多少毫秒。 */
export const REVIEW_DAY_MS = 24 * 60 * 60 * 1000;

/** 复习卡片最多留多少张：够把 27 关都排上，再多也没意义。 */
export const REVIEW_MAX_CARDS = 64;

/**
 * 一张复习卡 = 一关。
 *
 * 卡片上不存题目内容：题从关卡内容里抽，
 * 抽哪一道由 round 决定（每轮换一道，不会只记住同一道）。
 */
export interface ReviewCard {
  /** 卡片 id：`level:3`。 */
  id: string;
  /** 指向哪一关。 */
  levelId: number;
  /** Leitner 盒等级 0..5。 */
  box: number;
  /** 已经复习了几轮——决定这次抽到第几道题。 */
  round: number;
  /** 上次改盒子 / 上次复习的时间（epoch 毫秒）。 */
  lastAt: number;
  /** 下次到期时间（epoch 毫秒）。 */
  dueAt: number;
  /** 上次改盒子用的 visitId——同一次进关重复结算时不再动盒子。 */
  lastVisit: string;
  /** 上次改盒子时是否通过。 */
  lastPassed: boolean;
}

export function reviewCardId(levelId: number): string {
  return `level:${levelId}`;
}

/** 这一档隔几天。越界的一律夹回区间里，不抛错。 */
export function reviewIntervalDays(box: number): number {
  const index = Math.max(0, Math.min(REVIEW_MAX_BOX, Math.trunc(box)));
  return REVIEW_INTERVAL_DAYS[index];
}

/** 在 now 这个时刻，某个盒子下次什么时候到期。 */
export function reviewDueAt(box: number, now: number): number {
  return now + reviewIntervalDays(box) * REVIEW_DAY_MS;
}

/** 32 位字符串散列：把卡片 id 变成一个稳定的种子。 */
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32：小而稳的伪随机数发生器，同一个种子永远给同一个顺序。 */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 按种子打乱顺序。
 *
 * 同一个种子永远给同一个顺序（刷新页面不会变），
 * 换一轮复习换种子（选项位置不会固定下来）。
 */
export function shuffleChoices<T>(items: readonly T[], seed: string): T[] {
  const random = makeRandom(hashSeed(seed));
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = out[index];
    out[index] = out[swap];
    out[swap] = current;
  }
  return out;
}

/** 找到某关的卡。 */
export function findReviewCard(cards: readonly ReviewCard[], levelId: number): ReviewCard | null {
  return cards.find((card) => card.levelId === levelId) ?? null;
}

function nowOf(now: number | undefined): number {
  return typeof now === "number" && Number.isFinite(now) ? now : Date.now();
}

/**
 * 关卡结算之后同步盒子。
 *
 * 同一次进关（visitId 相同）重复结算时不动盒子——
 * 关卡页的 effect 会在切步骤、切选项时反复调用结算，
 * 不做幂等的话，盒子会在一次进关里连升好几格。
 *
 * 规则：
 * - 第一次过关 → 建卡，盒子 0，今天就到期（刚学完趁热抽一次，
 *   把「看过」变成「能自己答出来」）。
 * - 再一次通过（新的 visitId）→ 升一档，按新档位排下次到期。
 * - 没过关 → 已经在这张卡里的降一档，今天还要再练；
 *   没学过的关卡不进队列（它还在关卡流程里，没到复习的时候）。
 */
export function syncReviewCard(
  cards: readonly ReviewCard[],
  input: { levelId: number; visitId: string; passed: boolean; now?: number },
): ReviewCard[] {
  const now = nowOf(input.now);
  const existing = findReviewCard(cards, input.levelId);
  if (existing && existing.lastVisit === input.visitId && existing.lastPassed === input.passed) {
    return [...cards];
  }
  if (!input.passed) {
    if (!existing) return [...cards];
    const box = Math.max(0, existing.box - 1);
    const next: ReviewCard = {
      ...existing,
      box,
      dueAt: now,
      lastAt: now,
      lastVisit: input.visitId,
      lastPassed: false,
    };
    return cards.map((card) => (card.levelId === input.levelId ? next : card));
  }
  if (!existing) {
    const card: ReviewCard = {
      id: reviewCardId(input.levelId),
      levelId: input.levelId,
      box: 0,
      round: 0,
      lastAt: now,
      dueAt: now,
      lastVisit: input.visitId,
      lastPassed: true,
    };
    return [...cards, card];
  }
  const box = Math.min(REVIEW_MAX_BOX, existing.box + 1);
  const next: ReviewCard = {
    ...existing,
    box,
    dueAt: reviewDueAt(box, now),
    lastAt: now,
    lastVisit: input.visitId,
    lastPassed: true,
  };
  return cards.map((card) => (card.levelId === input.levelId ? next : card));
}

/**
 * 复习答完一题：答对升一档，答错掉回最低档、今天还要再练。
 */
export function gradeReviewCard(
  cards: readonly ReviewCard[],
  input: { levelId: number; correct: boolean; now?: number },
): ReviewCard[] {
  const now = nowOf(input.now);
  const existing = findReviewCard(cards, input.levelId);
  if (!existing) return [...cards];
  const box = input.correct ? Math.min(REVIEW_MAX_BOX, existing.box + 1) : 0;
  const next: ReviewCard = {
    ...existing,
    box,
    round: existing.round + 1,
    dueAt: input.correct ? reviewDueAt(box, now) : now,
    lastAt: now,
  };
  return cards.map((card) => (card.levelId === input.levelId ? next : card));
}

/** 今天到期的卡：到期时间不晚于现在，按到期先后排。 */
export function dueReviewCards(cards: readonly ReviewCard[], now: number): ReviewCard[] {
  return cards
    .filter((card) => card.dueAt <= now)
    .sort((left, right) => left.dueAt - right.dueAt || left.levelId - right.levelId);
}

/** 下一张卡什么时候到期——「今天没有要复习的」那句话要它。 */
export function nextReviewDueAt(cards: readonly ReviewCard[]): number | null {
  if (cards.length === 0) return null;
  return cards.reduce((min, card) => Math.min(min, card.dueAt), Number.POSITIVE_INFINITY);
}

/** 把到期时间说成人话。 */
export function reviewDueText(dueAt: number, now: number): string {
  const diff = dueAt - now;
  if (diff <= 0) return "现在就能复习";
  const days = Math.round(diff / REVIEW_DAY_MS);
  if (days <= 0) return "今天晚些时候";
  if (days === 1) return "明天";
  return `${days} 天后`;
}
