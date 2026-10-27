import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { palette, radii, springs, tokenStylesheet } from "../../src/ui/theme.ts";

/**
 * 设计 token 的一致性守卫。
 *
 * token 层存在的全部意义是「改一处，全站生效」。
 * 一旦 CSS 变量和 antd 主题各写一份，改了这边忘了那边，
 * 深色面板上就会冒出一个说不清来历的颜色——token 层就白做了。
 *
 * 这几条断言就是防止那种事发生。
 */
const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("设计 token", () => {
  it("CSS 变量里带上全部色板", () => {
    const css = tokenStylesheet();
    for (const value of Object.values(palette)) {
      expect(css, `色板里的 ${value} 没有进 CSS 变量`).toContain(value);
    }
  });

  it("圆角和动效时长也进 CSS 变量", () => {
    const css = tokenStylesheet();
    expect(css).toContain(`--m101-radius-md:${radii.md}px`);
    expect(css).toContain("--m101-dur-fast:");
    expect(css).toContain("--m101-ease-spring:");
  });

  it("CSS 变量名带 m101 前缀，不跟全局变量撞名", () => {
    const css = tokenStylesheet();
    const names = css.match(/--[a-z0-9-]+/g) ?? [];
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      expect(name, `${name} 没有 m101 前缀`).toMatch(/^--m101-/);
    }
  });

  it("样式表里的颜色都从 token 来，不写死", () => {
    const css = readFileSync(join(ROOT, "src", "styles.css"), "utf8");
    // 主色和语义色如果还写死在 styles.css 里，改 token 就改不动它们。
    for (const value of [palette.brand, palette.danger, palette.success]) {
      expect(css, `styles.css 里还有写死的 ${value}，应该用 var(--m101-*)`).not.toContain(value);
    }
  });

  it("动效表里必须处理 prefers-reduced-motion", () => {
    const css = readFileSync(join(ROOT, "src", "ui", "motion.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("弹簧只有三档，且都是物理弹簧", () => {
    expect(Object.keys(springs).sort()).toEqual(["base", "snappy", "soft"]);
    for (const spring of Object.values(springs)) {
      expect(spring.type).toBe("spring");
      expect(spring.stiffness).toBeGreaterThan(0);
      expect(spring.damping).toBeGreaterThan(0);
    }
  });

  it("View Transition 的伪元素也有 reduced-motion 降级", () => {
    const css = readFileSync(join(ROOT, "src", "ui", "motion.css"), "utf8");
    // media 块的收尾大括号顶格，块内规则都缩进：截到第一个顶格的 } 就是整个块。
    const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).toBeGreaterThanOrEqual(0);
    const end = css.indexOf("\n}", start);
    const reduced = css.slice(start, end === -1 ? undefined : end);
    expect(reduced).toMatch(/::view-transition-group\(\*\)/);
  });

  it("CSS 里引用的每个 token 都定义过", () => {
    // 引用一个没定义的变量，浏览器会当成无效值丢弃——
    // 那条声明直接失效，样式静悄悄地不生效。
    // 这条守卫把这种错挡在提交之前。
    const defined = new Set(tokenStylesheet().match(/--m101-[a-z0-9-]+/g) ?? []);
    const files = [
      join(ROOT, "src", "styles.css"),
      join(ROOT, "src", "ui", "motion.css"),
      join(ROOT, "src", "ui", "path.css"),
      join(ROOT, "src", "ui", "session", "session.css"),
    ];
    for (const file of files) {
      const css = readFileSync(file, "utf8");
      const used = new Set(css.match(/var\((--m101-[a-z0-9-]+)\)/g) ?? []);
      for (const reference of used) {
        const name = reference.replace(/^var\(/, "").replace(/\)$/, "");
        expect(defined.has(name), `${file} 用了没定义的 ${name}`).toBe(true);
      }
    }
  });
});
