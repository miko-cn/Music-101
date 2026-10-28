import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("关卡页挡住跳听辨、修正不代填", () => {
  it("LessonFlow / LessonOne 用 finishedAt 守跳步", () => {
    const flow = readFileSync(join(ROOT, "src", "ui", "LessonFlow.tsx"), "utf8");
    const one = readFileSync(join(ROOT, "src", "ui", "LessonOne.tsx"), "utf8");
    expect(flow).toContain("canEnterLessonStep");
    expect(flow).not.toContain("仍然可以跳步");
    expect(one).toContain("canEnterLessonStep");
  });

  it("路径顶卡接了到期复习", () => {
    const path = readFileSync(join(ROOT, "src", "ui", "PathMap.tsx"), "utf8");
    const app = readFileSync(join(ROOT, "src", "App.tsx"), "utf8");
    expect(path).toContain("onOpenReview");
    expect(path).toContain("continueTarget");
    expect(app).toContain("onOpenReview");
  });
});
