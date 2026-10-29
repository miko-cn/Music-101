/**
 * 重新裁剪主界面字体（思源黑体 Noto Sans SC，400–800 可变）。
 *
 * 用法：npm run make:font
 *
 * 为什么要有这个脚本：字体是按「站点实际用到的字」裁的。
 * 改了文案之后如果不重裁，新字不在旧子集里，浏览器会拿系统字体顶上，
 * 页面上就会有一两个字形跟别的不一样。
 *
 * 源字体不入库（14MB）：脚本会从 jsdelivr 下载到 out/fonts/（已 gitignore）。
 * 裁剪依据 SIL OFL 1.1，允许裁剪后分发；许可全文见 public/fonts/OFL.txt。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/Variable/OTF/Subset/NotoSansSC-VF.otf";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// 缓存放在 node_modules/.cache：out/ 会被部署归档带走，node_modules 不会。
const SOURCE_FILE = join(ROOT, "node_modules/.cache/music101-font/NotoSansSC-VF.otf");
const OUTPUT_FILE = join(ROOT, "public/fonts/noto-sans-sc.woff2");

/** 扫出站点实际会渲染的字符：源码里的中文标点，加上界面到处用的拉丁和记号。 */
function collectCharset(): string {
  const roots = ["src", "index.html"];
  const ext = /\.(tsx?|css|html)$/;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (ext.test(name)) files.push(full);
    }
  };
  for (const root of roots) {
    if (root.includes(".")) files.push(root);
    else walk(join(ROOT, root));
  }

  const chars = new Set<string>();
  for (const file of files) {
    for (const ch of readFileSync(file, "utf8")) {
      if (ch.codePointAt(0)! > 0x2000) chars.add(ch);
    }
  }
  for (let code = 0x20; code <= 0x7e; code += 1) chars.add(String.fromCharCode(code));
  for (const ch of "°·×÷±→←↑↓≈≠≤≥♪♯♭♮√∞") chars.add(ch);
  return [...chars].sort().join("");
}

async function sourceFont(): Promise<Buffer> {
  if (existsSync(SOURCE_FILE)) return readFileSync(SOURCE_FILE);
  process.stdout.write("下载源字体（14MB，只需一次）…\n");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`下载源字体失败：${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(SOURCE_FILE), { recursive: true });
  writeFileSync(SOURCE_FILE, buf);
  return buf;
}

const charset = collectCharset();
const subsetFont = (await import("subset-font")).default;
const out = await subsetFont(await sourceFont(), charset, {
  targetFormat: "woff2",
  // 站点用到的字重是 400/600/700/800，区间必须覆盖到 800，
  // 否则 800 会被浏览器合成（假粗），中文字合成出来很难看。
  variationAxes: { wght: { min: 400, max: 800 } },
});
writeFileSync(OUTPUT_FILE, out);
process.stdout.write(
  `裁剪完成：${charset.length} 字 → ${(out.length / 1024).toFixed(1)} KB（public/fonts/noto-sans-sc.woff2）\n`,
);
