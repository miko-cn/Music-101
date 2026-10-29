/**
 * 设计 token。
 *
 * 全站的颜色、圆角、动效时长只有这一份出处：
 * - UI 层写 CSS 变量（`var(--m101-*)`），由 `tokenStylesheet()` 注入 <style>
 * - antd 的主题读同一份常量
 *
 * 两边各写一套是 UI 走样的头号原因：改了一边忘了另一边，
 * 深色面板上就会出现一个说不清从哪来的颜色。这里从根上堵掉。
 */

/**
 * 半透明色从这里派生。
 *
 * 以前每个色相都手写一遍 rgba(255, 214, 102, 0.45) 这种，
 * 换个 hex 要改十几处，漏一处就出现「同一个金，两种深浅」。
 * 现在手写的只有色相，透明度是参数。
 */
export function alpha(hex: string, a: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 色板。冷调深底 + 品牌金 + 语义三色。
 *
 * 只有品牌金是主色：主行动、根音、记忆锚、聚焦框都用它，
 * 看到金色就知道「这是最重要的那个」。
 * 蓝降成次级色，只管和弦音和信息提示。
 */
export const palette = {
  /** 页面底色。三层中性色里最深的一层，冷灰蓝。 */
  bg: "#0f1017",
  /** 卡片、抬起的面。 */
  surface: "#191b25",
  /** 更深的面（凹陷、黑键、代码块）。 */
  surfaceDeep: "#14151e",
  /** 主文字。 */
  text: "#eceef5",
  /** 次级文字：说明、注解。 */
  textDim: "rgba(255, 255, 255, 0.66)",
  /** 最弱的一层：脚注、刻度、占位。 */
  textFaint: "rgba(255, 255, 255, 0.44)",
  /** 品牌金：全站唯一的主色。 */
  brand: "#ffd666",
  /** 品牌金的浅一档：需要金字但不能刺眼的地方。 */
  brandSoft: "#ffe58f",
  /** 和弦蓝：次级色。交互强调、和弦音、信息提示。 */
  accent: "#4096ff",
  /** 和弦蓝的浅一档：调内音、按下的键。 */
  accentSoft: "#91caff",
  /** 对了。 */
  success: "#85d96a",
  /** 不对。 */
  danger: "#ff7875",
  /**
   * 还没做完 / 要注意。
   *
   * 用橙不用黄：黄跟品牌金撞色，分不出「还没过关」和「记忆锚」。
   */
  warning: "#ffab5e",
} as const;

/**
 * 教学图和琴键用的色相。
 *
 * UI 之外的颜色都从这儿取：图里区分轨道、鼓组、频段全靠它们。
 */
const hues = {
  gold: palette.brand,
  goldSoft: palette.brandSoft,
  blue: palette.accent,
  red: palette.danger,
  green: palette.success,
  orange: "#ffa07a",
  cyan: "#73c0de",
  purple: "#b37feb",
  ivory: "#f4f1ea",
} as const;

/** 半透明叠加层。深色底上「更亮一点」几乎总是「加一层白」。 */
export const overlays = {
  /** 分隔线、描边。 */
  line: "rgba(255, 255, 255, 0.12)",
  /** 更清楚的描边（聚焦、选中）。 */
  lineStrong: "rgba(255, 255, 255, 0.16)",
  /** 一层很淡的面（卡片抬升、格子底）。 */
  veil: "rgba(255, 255, 255, 0.06)",
  /** 更淡的一层。 */
  veilSoft: "rgba(255, 255, 255, 0.04)",
  /** 语义色的淡底：对了 / 不对的底色。 */
  successSoft: alpha(palette.success, 0.16),
  dangerSoft: alpha(palette.danger, 0.16),
  brandSoft: alpha(palette.brand, 0.14),
} as const;


/**
 * 白色叠加层的完整梯度。
 *
 * 教学图里到处要用不同深浅的白（描边、填充、文字），
 * 之前是直接写 rgba(255,255,255,0.32) 这种魔数——
 * 同一个深浅在图 A 里是 0.32、在图 B 里是 0.3，看不出来但确实是两个值。
 *
 * 收成梯度之后，「描边」和「文字」都有固定的名字可用，
 * 调深浅也只改一处。
 */
export const whiteScale: Record<string, string> = {
  "w02": "rgba(255, 255, 255, 0.02)",
  "w03": "rgba(255, 255, 255, 0.03)",
  "w04": "rgba(255, 255, 255, 0.04)",
  "w05": "rgba(255, 255, 255, 0.05)",
  "w06": "rgba(255, 255, 255, 0.06)",
  "w07": "rgba(255, 255, 255, 0.07)",
  "w08": "rgba(255, 255, 255, 0.08)",
  "w10": "rgba(255, 255, 255, 0.1)",
  "w12": "rgba(255, 255, 255, 0.12)",
  "w14": "rgba(255, 255, 255, 0.14)",
  "w16": "rgba(255, 255, 255, 0.16)",
  "w18": "rgba(255, 255, 255, 0.18)",
  "w20": "rgba(255, 255, 255, 0.2)",
  "w22": "rgba(255, 255, 255, 0.22)",
  "w28": "rgba(255, 255, 255, 0.28)",
  "w30": "rgba(255, 255, 255, 0.3)",
  "w32": "rgba(255, 255, 255, 0.32)",
  "w38": "rgba(255, 255, 255, 0.38)",
  "w45": "rgba(255, 255, 255, 0.45)",
  "w50": "rgba(255, 255, 255, 0.5)",
  "w55": "rgba(255, 255, 255, 0.55)",
  "w62": "rgba(255, 255, 255, 0.62)",
  "w65": "rgba(255, 255, 255, 0.65)",
  "w72": "rgba(255, 255, 255, 0.72)",
  "w78": "rgba(255, 255, 255, 0.78)",
  "w82": "rgba(255, 255, 255, 0.82)",
  "w88": "rgba(255, 255, 255, 0.88)",
  "w90": "rgba(255, 255, 255, 0.9)",
  "w92": "rgba(255, 255, 255, 0.92)",
};

/**
 * 彩色叠加层。
 *
 * 每个色相一条梯度，键名是「色相-透明度」。
 * 教学图里的分层、配音轨、区间底色全靠它们区分。
 *
 * 值全部由 hues 派生：色相改了，这里自动跟着改。
 */
export const colorScales: Record<string, string> = {
  // 品牌金：主色、根音、记忆锚。
  "gold-14": alpha(hues.gold, 0.14),
  "gold-16": alpha(hues.gold, 0.16),
  "gold-18": alpha(hues.gold, 0.18),
  "gold-45": alpha(hues.gold, 0.45),
  "gold-50": alpha(hues.gold, 0.5),
  "gold-55": alpha(hues.gold, 0.55),
  "gold-60": alpha(hues.gold, 0.6),
  "gold-70": alpha(hues.gold, 0.7),
  "gold-85": alpha(hues.gold, 0.85),
  // 浅金：文字、聚焦框。
  "gold-soft-06": alpha(hues.goldSoft, 0.06),
  "gold-soft-45": alpha(hues.goldSoft, 0.45),
  "gold-soft-70": alpha(hues.goldSoft, 0.7),
  "gold-soft-85": alpha(hues.goldSoft, 0.85),
  "gold-soft-92": alpha(hues.goldSoft, 0.92),
  // 和弦蓝：和弦音、调内音。
  "blue-08": alpha(hues.blue, 0.08),
  "blue-14": alpha(hues.blue, 0.14),
  "blue-18": alpha(hues.blue, 0.18),
  "blue-45": alpha(hues.blue, 0.45),
  "blue-50": alpha(hues.blue, 0.5),
  // 危险红：错误、kick。
  "red-07": alpha(hues.red, 0.07),
  "red-25": alpha(hues.red, 0.25),
  "red-35": alpha(hues.red, 0.35),
  "red-85": alpha(hues.red, 0.85),
  // 暖橙：紧张、不协和。
  "orange-35": alpha(hues.orange, 0.35),
  // 成功绿：对了。
  "green-35": alpha(hues.green, 0.35),
  "green-85": alpha(hues.green, 0.85),
  // 青：军鼓。
  "cyan-16": alpha(hues.cyan, 0.16),
  "cyan-35": alpha(hues.cyan, 0.35),
  "cyan-45": alpha(hues.cyan, 0.45),
  "cyan-85": alpha(hues.cyan, 0.85),
  // 紫：拍手、低频。
  "purple-16": alpha(hues.purple, 0.16),
  "purple-35": alpha(hues.purple, 0.35),
  "purple-45": alpha(hues.purple, 0.45),
  "purple-85": alpha(hues.purple, 0.85),
  // 象牙白：白键、音符底色。
  "ivory-32": alpha(hues.ivory, 0.32),
};

/**
 * 其它不规则的颜色。
 *
 * 这些没法归进梯度：它们各自独立，用途也不同。
 * 收在这里是为了「一处定义、一处引用」，不是要归类。
 */
export const extras: Record<string, string> = {
  // 热力图的四档绿（GitHub 贡献图那一套）。
  "heat-1": "#0e4429",
  "heat-2": "#006d32",
  "heat-3": "#26a641",
  "heat-4": "#39d353",
  // 和弦蓝的实色档：比 accent 深一档，琴键上按下的和弦音。
  "blue": "#1677ff",
  "blue-bright": hues.blue,
  "blue-mid": "#69b1ff",
  "blue-soft": palette.accentSoft,
  "blue-pale": "#d6e8ff",
  "blue-deep": "#0958d9",
  // 鼓组与频段的区分色。
  cyan: hues.cyan,
  purple: hues.purple,
  green: hues.green,
  // 危险红系。
  red: hues.red,
  "red-pale": "#ffccc7",
  "red-warm": "#ff9c6e",
  "red-warm-2": "#ffa07a",
  "red-ink": "#a8071a",
  "red-ink-deep": "#4a0303",
  // 品牌金系。
  gold: hues.gold,
  "gold-soft": hues.goldSoft,
  "gold-pale": "#ffe9ad",
  "gold-fill": "#fff3c4",
  // 琴键上的深色。
  "key-black": "#1a1a22",
  "key-black-2": "#2b2b36",
  "key-black-3": "#243044",
  "key-black-4": "#10233f",
  "key-gold": "#6b5a20",
  "key-gold-2": "#8a6d1f",
  "key-off": "rgba(24, 24, 30, 0.78)",
  // 纸面色：白键、键盘面板。
  white: "#fff",
  ivory: hues.ivory,
  paper: "#f7f7f9",
  "paper-2": "#f5f5f7",
  // 投影。
  "shadow-ink": "rgba(0, 0, 0, 0.45)",
  /** 可按压按钮的底边阴影：比各自底色深一档。 */
  "press-neutral": "#0b0b10",
  "press-brand": "#b8902a",
  "press-success": "#4f8a32",
  "press-danger": "#b0484b",
};

/** 圆角。 */
export const radii = {
  sm: 8,
  md: 10,
  lg: 16,
} as const;

/**
 * 动效时长（毫秒）。
 *
 * 只有三档。档位少是为了让全站节奏一致——每处现编一个 137ms，
 * 累积起来就是「哪儿都不对劲」。
 *
 * - fast  140ms：即时反馈（按下、选中、颜色变化）
 * - base  220ms：元素入场、状态切换
 * - slow  380ms：转场、庆祝
 */
export const durations = {
  fast: 140,
  base: 220,
  slow: 380,
} as const;

/**
 * 缓动曲线。
 *
 * - out   收尾减速：入场、展开。用在「东西出现了」。
 * - spring 带回弹：答对了、盖章。用在「值得高兴一下」。
 */
export const easings = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/**
 * Motion 的物理弹簧。
 *
 * 不叫 spring：easings.spring 是 CSS 的回弹曲线，跟物理弹簧不是一回事。
 * 组件里不许现编 stiffness / damping，只从这三档里取。
 */
export const springs = {
  /** 判定条、按钮按下：快、几乎不回弹。 */
  snappy: { type: "spring", stiffness: 520, damping: 32 },
  /** 题目切换、进度条：默认。 */
  base: { type: "spring", stiffness: 380, damping: 30 },
  /** 结算页、盖章：慢一点、有一点回弹。 */
  soft: { type: "spring", stiffness: 220, damping: 22 },
} as const;

/**
 * 生成 CSS 变量的 <style> 内容。
 *
 * 用运行时注入而不是手写一份 CSS 文件，是为了保证 CSS 变量和
 * antd 主题读的是同一份常量——不会出现「CSS 里改了，组件没改」。
 */
export function tokenStylesheet(): string {
  const vars: string[] = [
    `--m101-bg:${palette.bg}`,
    `--m101-surface:${palette.surface}`,
    `--m101-surface-deep:${palette.surfaceDeep}`,
    `--m101-text:${palette.text}`,
    `--m101-text-dim:${palette.textDim}`,
    `--m101-text-faint:${palette.textFaint}`,
    `--m101-brand:${palette.brand}`,
    `--m101-brand-soft:${palette.brandSoft}`,
    `--m101-accent:${palette.accent}`,
    `--m101-accent-soft:${palette.accentSoft}`,
    `--m101-success:${palette.success}`,
    `--m101-danger:${palette.danger}`,
    `--m101-warning:${palette.warning}`,
    `--m101-line:${overlays.line}`,
    `--m101-line-strong:${overlays.lineStrong}`,
    `--m101-veil:${overlays.veil}`,
    `--m101-veil-soft:${overlays.veilSoft}`,
    `--m101-success-soft:${overlays.successSoft}`,
    `--m101-danger-soft:${overlays.dangerSoft}`,
    `--m101-brand-soft-bg:${overlays.brandSoft}`,
    `--m101-radius-sm:${radii.sm}px`,
    `--m101-radius-md:${radii.md}px`,
    `--m101-radius-lg:${radii.lg}px`,
    `--m101-dur-fast:${durations.fast}ms`,
    `--m101-dur-base:${durations.base}ms`,
    `--m101-dur-slow:${durations.slow}ms`,
    `--m101-ease-out:${easings.out}`,
    `--m101-ease-spring:${easings.spring}`,
  ];
  // 梯度色：名字就是变量名，一一对应。
  for (const [name, value] of Object.entries(whiteScale)) {
    vars.push(`--m101-${name}:${value}`);
  }
  for (const [name, value] of Object.entries(colorScales)) {
    vars.push(`--m101-${name}:${value}`);
  }
  for (const [name, value] of Object.entries(extras)) {
    vars.push(`--m101-${name}:${value}`);
  }
  return `:root{${vars.join(";")};}`;
}
