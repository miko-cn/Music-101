import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("闯关导航", () => {
  const app = readFileSync(join(ROOT, "src", "App.tsx"), "utf8");

  it("首页仍把进度和进关回调交给 PathMap", () => {
    expect(app).toContain("<PathMap progress={progress} onOpenLevel={openLevel} />");
  });

  it("顶栏文案仍随所在页面切换", () => {
    expect(app).toContain('learnView === "lesson" ? "返回路径" : "学习路径"');
  });
});
