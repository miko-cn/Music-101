import { describe, expect, it } from "vitest";
import { lesson as level08 } from "../../src/content/lessons/level-08.ts";
import { lesson as level15 } from "../../src/content/lessons/level-15.ts";
import { lesson as level16 } from "../../src/content/lessons/level-16.ts";

function blob(lesson: { concept: string[]; handPrompt: string; ear: { explain: string }[]; anchor: { steps: string[]; takeaway: string[] } }): string {
  return [
    ...lesson.concept,
    ...lesson.anchor.steps,
    ...lesson.anchor.takeaway,
    lesson.handPrompt,
    ...lesson.ear.map((question) => question.explain),
  ].join("\n");
}

describe("P0 事实：自然小调调内不是借用", () => {
  it("不再把 iv / ♭VI / ♭III / ♭VII 写成不在自然小调里", () => {
    const text = blob(level08);
    expect(text).not.toMatch(/不在自然小调里/);
    expect(text).not.toMatch(/不在 A 小调里/);
    expect(text).not.toMatch(/都不在调内/);
  });

  it("手做不能把 Am–F–C–G 标成借用进行", () => {
    expect(level08.handPrompt).not.toMatch(/借用进行/);
    expect(level08.handChoices[level08.handCorrect]?.label).not.toMatch(/借用/);
  });

  it("♭ 记法被写成尺子，真借用留给和声小调 V 或大调 iv", () => {
    const text = blob(level08);
    expect(text).toMatch(/尺子/);
    expect(text).toMatch(/和声小调/);
  });
});

describe("P0 事实：ii 是 S 不是 T", () => {
  it("fn-tonic 的解析不再把 Dm / ii 写成主功能", () => {
    const question = level15.ear.find((item) => item.id === "fn-tonic");
    expect(question).toBeDefined();
    expect(question!.explain).not.toMatch(/也是主功能/);
    expect(question!.explain).toMatch(/下属|S/);
  });
});

describe("P0 事实：变格不是 Dm→C", () => {
  it("cad-plagal 用 iv→i 或 IV/iv→I，不用 Dm→C 冒充变格", () => {
    const question = level16.ear.find((item) => item.id === "cad-plagal");
    expect(question).toBeDefined();
    const correct = question!.choices[question!.correct];
    expect(correct?.label).not.toBe("Dm → C");
    expect(correct?.label).toMatch(/Dm → Am|F → C|Fm → C/);
    expect(question!.explain).not.toMatch(/Dm → C 是变格/);
  });
});
