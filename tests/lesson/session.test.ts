import { describe, expect, it } from "vitest";
import {
  LESSON_POLICY,
  REVIEW_POLICY,
  canReveal,
  createSession,
  displayOrder,
  sessionReducer,
  sessionSummary,
  solvedSession,
  type SessionAction,
  type SessionPolicy,
  type SessionState,
} from "../../src/core/lesson/session.ts";

const QUESTIONS = [{ correct: 0 }, { correct: 2 }, { correct: 1 }];

function run(actions: SessionAction[], policy: SessionPolicy = LESSON_POLICY): SessionState {
  return actions.reduce(
    (state, action) => sessionReducer(state, action, QUESTIONS, policy),
    createSession(QUESTIONS, 1000),
  );
}

describe("会话：定稿才写 committed", () => {
  it("选了没检查：committed 仍是 null", () => {
    const state = run([{ type: "select", choice: 1 }]);
    expect(state.selected[0]).toBe(1);
    expect(state.committed[0]).toBeNull();
    expect(state.phase[0]).toBe("answering");
  });

  it("检查判错：committed 仍是 null，可以再试", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }]);
    expect(state.phase[0]).toBe("wrong");
    expect(state.committed[0]).toBeNull();
    expect(state.attempts[0]).toBe(1);
  });

  it("检查判对：committed 写入正确下标", () => {
    const state = run([{ type: "select", choice: 0 }, { type: "check" }]);
    expect(state.phase[0]).toBe("correct");
    expect(state.committed[0]).toBe(0);
    expect(state.firstTry[0]).toBe(true);
  });

  it("错过一次再对：算对，但不是第一次就对", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "retry" },
      { type: "select", choice: 0 },
      { type: "check" },
    ]);
    expect(state.committed[0]).toBe(0);
    expect(state.firstTry[0]).toBe(false);
  });

  it("判错之后直接选别的项，等于再试一次", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "select", choice: 2 }]);
    expect(state.phase[0]).toBe("answering");
    expect(state.selected[0]).toBe(2);
  });
});

describe("会话：看答案", () => {
  it("错不满 revealAfter 次不能看", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "reveal" }]);
    expect(state.phase[0]).toBe("wrong");
    expect(canReveal(state, LESSON_POLICY)).toBe(false);
  });

  it("错满两次能看；看了之后 committed 是最后那个错下标，计为错", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "select", choice: 2 },
      { type: "check" },
      { type: "reveal" },
    ]);
    expect(state.phase[0]).toBe("revealed");
    expect(state.committed[0]).toBe(2);
    expect(state.committed[0]).not.toBe(QUESTIONS[0].correct);
  });

  it("定稿之后选不动", () => {
    const state = run([{ type: "select", choice: 0 }, { type: "check" }, { type: "select", choice: 1 }]);
    expect(state.selected[0]).toBe(0);
  });
});

describe("会话：复习策略", () => {
  it("错一次就直接亮答案并定稿，不能再试", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "retry" }], REVIEW_POLICY);
    expect(state.phase[0]).toBe("revealed");
    expect(state.committed[0]).toBe(1);
  });
});

describe("会话：前进与结束", () => {
  it("没定稿不能前进", () => {
    const state = run([{ type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 2000 }]);
    expect(state.cursor).toBe(0);
  });

  it("定稿后前进；最后一题前进写 finishedAt，之后什么都不动", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 2000 },
      { type: "select", choice: 2 }, { type: "check" }, { type: "continue", now: 3000 },
      { type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 9000 },
      { type: "select", choice: 0 },
    ]);
    expect(state.cursor).toBe(2);
    expect(state.finishedAt).toBe(9000);
    expect(state.selected[2]).toBe(1);
  });
});

describe("会话：连对", () => {
  it("判对 +1，判错清零，记住最长", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 1 },
      { type: "select", choice: 2 }, { type: "check" }, { type: "continue", now: 2 },
      { type: "select", choice: 0 }, { type: "check" },
    ]);
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(2);
  });
});

describe("会话：结算", () => {
  it("统计对了几题、第一次就对几题、用时", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 2000 },
      { type: "select", choice: 0 }, { type: "check" }, { type: "select", choice: 1 }, { type: "check" },
      { type: "reveal" }, { type: "continue", now: 3000 },
      { type: "select", choice: 1 }, { type: "check" }, { type: "continue", now: 61000 },
    ]);
    expect(sessionSummary(state, QUESTIONS)).toEqual({
      total: 3,
      correct: 2,
      firstTryCorrect: 2,
      bestStreak: 1,
      seconds: 60,
    });
  });

  it("solvedSession：已完成、全对、全是第一次就对", () => {
    const state = solvedSession(QUESTIONS, 5000);
    expect(state.finishedAt).toBe(5000);
    expect(state.committed).toEqual([0, 2, 1]);
    expect(sessionSummary(state, QUESTIONS).firstTryCorrect).toBe(3);
  });

  it("没有题的会话一创建就算完成", () => {
    expect(createSession([], 7).finishedAt).toBe(7);
  });
});

describe("会话：边界", () => {
  it("错满两次后点了再试，回到 answering 就不能看答案", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "select", choice: 2 },
      { type: "check" },
      { type: "retry" },
      { type: "reveal" },
    ]);
    expect(state.phase[0]).toBe("answering");
    expect(state.committed[0]).toBeNull();
    expect(canReveal(state, LESSON_POLICY)).toBe(false);
  });

  it("看了答案之后锁死：再选、再试、再检查都改不了 committed", () => {
    const state = run([
      { type: "select", choice: 1 },
      { type: "check" },
      { type: "select", choice: 2 },
      { type: "check" },
      { type: "reveal" },
      { type: "select", choice: 0 },
      { type: "retry" },
      { type: "check" },
    ]);
    expect(state.phase[0]).toBe("revealed");
    expect(state.committed[0]).toBe(2);
    expect(state.selected[0]).toBe(2);
  });

  it("没选就检查：不计错，不能靠空检查凑够看答案的次数", () => {
    const state = run([{ type: "check" }, { type: "check" }]);
    expect(state.phase[0]).toBe("answering");
    expect(state.attempts[0]).toBe(0);
  });

  it("最后一题没定稿时 continue 不写 finishedAt", () => {
    const state = run([
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 2000 },
      { type: "select", choice: 2 }, { type: "check" }, { type: "continue", now: 3000 },
      { type: "select", choice: 0 }, { type: "check" }, { type: "continue", now: 9000 },
    ]);
    expect(state.cursor).toBe(2);
    expect(state.phase[2]).toBe("wrong");
    expect(state.finishedAt).toBeNull();
  });

  it("cursor 越界：什么动作都原样返回", () => {
    const state: SessionState = { ...createSession(QUESTIONS, 1000), cursor: 5 };
    const actions: SessionAction[] = [
      { type: "select", choice: 0 },
      { type: "check" },
      { type: "retry" },
      { type: "reveal" },
      { type: "continue", now: 2000 },
    ];
    for (const action of actions) {
      expect(sessionReducer(state, action, QUESTIONS, LESSON_POLICY)).toBe(state);
    }
  });
});

describe("displayOrder：只洗显示层", () => {
  it("是 0..n-1 的一个排列，同种子稳定", () => {
    const order = displayOrder(4, "7#visit#q1");
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(displayOrder(4, "7#visit#q1")).toEqual(order);
  });

  it("不同种子大体上会换位置", () => {
    const seen = new Set<string>();
    for (let index = 0; index < 20; index += 1) seen.add(displayOrder(3, `seed-${index}`).join(","));
    expect(seen.size).toBeGreaterThan(1);
  });
});
