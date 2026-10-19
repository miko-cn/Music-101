import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 守卫测试：所有相对导入必须写明扩展名。
 *
 * 原因：Node 原生类型剥离（node --experimental-strip-types / Node 24 默认行为）
 * 不做模块解析推断，浏览器端也需要确定的 URL。因此相对导入必须带
 * `.ts` / `.tsx` / `.js` / `.css` 后缀。
 */

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const SCAN_DIRS = ["src", "scripts"];
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-ssr", "out", "coverage", ".git", ".vite"]);
const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".css"];

/** `import x from "./y"` / `export * from "./y"` / `import type {...} from "./y"` */
const FROM_RE = /\bfrom\s*["']([^"']+)["']/;
/** 副作用导入 `import "./y.css"` */
const BARE_IMPORT_RE = /^\s*import\s+["']([^"']+)["']/;
/** 动态导入 `await import("./y.ts")` */
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/;

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function hasAllowedExtension(specifier: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => specifier.endsWith(ext));
}

function findViolations(): string[] {
  const violations: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of collectSourceFiles(join(ROOT, dir))) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (isCommentLine(line)) return;
        const isImportOrExport = /^\s*(import|export)\b/.test(line);
        const specifiers: string[] = [];
        if (isImportOrExport) {
          const from = FROM_RE.exec(line);
          if (from?.[1]) specifiers.push(from[1]);
          const bare = BARE_IMPORT_RE.exec(line);
          if (bare?.[1]) specifiers.push(bare[1]);
        }
        const dynamic = DYNAMIC_IMPORT_RE.exec(line);
        if (dynamic?.[1]) specifiers.push(dynamic[1]);

        for (const specifier of specifiers) {
          if (!isRelative(specifier)) continue;
          if (hasAllowedExtension(specifier)) continue;
          violations.push(
            `${relative(ROOT, file).replace(/\\/g, "/")}:${index + 1} 相对导入缺少扩展名 -> "${specifier}"`,
          );
        }
      });
    }
  }
  return violations;
}

describe("import 扩展名守卫", () => {
  it("src/ 与 scripts/ 下的相对导入必须带 .ts/.tsx/.js/.css 扩展名", () => {
    const violations = findViolations();
    expect(violations).toEqual([]);
  });
});
