import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("课程大纲样式", () => {
  const css = readFileSync(join(ROOT, "src", "ui", "path.css"), "utf8");

  it("不再是蛇形航道", () => {
    expect(css).not.toContain("path-track");
    expect(css).not.toContain("m101-breathe");
    expect(css).not.toContain("--m101-path-");
    expect(css).not.toContain("<svg");
  });

  it("顶卡、折叠和行都有短动效", () => {
    expect(css).toContain("path-card-in");
    expect(css).toContain("translateY(6px)");
    expect(css).toContain("grid-template-rows: 0fr");
    expect(css).toContain("grid-template-rows: 1fr");
    expect(css).toContain("var(--m101-dur-base)");
    expect(css).toContain("var(--m101-ease-out)");
    expect(css).toContain("path-row-in");
    expect(css).toContain("translateY(4px)");
    expect(css).toContain("var(--m101-veil)");
    expect(css).toContain("translateY(1px)");
    expect(css).toContain("var(--m101-brand)");
  });

  it("减动效时关掉位移、错峰和折叠过渡", () => {
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThanOrEqual(0);
    const reduced = css.slice(start);
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("transition: none");
    expect(reduced).toContain(".path-stage-panel");
    expect(reduced).toContain(".path-row");
    expect(reduced).toContain("transform: none");
  });
});
