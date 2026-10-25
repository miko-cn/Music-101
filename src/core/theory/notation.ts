/**
 * 音名的「记谱显示」。
 *
 * 数据层（`pitch.ts`）保持 ASCII——`C#4`、`Eb2` 这些串要能被
 * `noteNameToMidi()` 解析回来，而且 Cubase / Studio One 里显示的也是这一套。
 * 只有给人看的地方才换成谱面上的写法：升号 ♯、降号 ♭、重升 𝄪、重降 𝄫。
 *
 * 为什么值得多这一层：
 * - ASCII 的 `#` / `b` 长得像代码，不像乐谱。初学者看到 "Eb" 读出来是「E b」，
 *   看到 "E♭" 才知道那是降号。
 * - 记谱符号和正文分开渲染（`src/ui/NoteName.tsx`）之后，音名在视觉上
 *   就从普通段落里跳出来了——这是「把字母和黑白键绑在一起」的必要一步。
 */

/** 升号 ♯ */
export const SHARP_SIGN = "\u266F";
/** 降号 ♭ */
export const FLAT_SIGN = "\u266D";
/** 重升号 𝄪 */
export const DOUBLE_SHARP_SIGN = "\u{1D12A}";
/** 重降号 𝄫 */
export const DOUBLE_FLAT_SIGN = "\u{1D12B}";

/** ASCII 变音记号 → 记谱符号。 */
const ACCIDENTAL_SIGNS: Record<string, string> = {
  "#": SHARP_SIGN,
  b: FLAT_SIGN,
  x: DOUBLE_SHARP_SIGN,
  "\u266F": SHARP_SIGN,
  "\u266D": FLAT_SIGN,
  "\u{1D12A}": DOUBLE_SHARP_SIGN,
  "\u{1D12B}": DOUBLE_FLAT_SIGN,
};

const NOTE_NAME_PATTERN = /^([A-Ga-g])([#bx\u266F\u266D\u{1D12A}\u{1D12B}]*)(-?\d+)?$/u;

/** 一个音名拆成三段：字母、变音记号、八度。 */
export interface NoteNameParts {
  letter: string;
  /** 变音记号。空串表示没有变音。 */
  accidental: string;
  /** 八度数字。空串表示这个音名不带八度（比如只写 "C"）。 */
  octave: string;
}

/**
 * 变音记号串 → 记谱符号。
 *
 * `##` 和 `bb` 在 ASCII 里是两个字符，但在谱上是一个重升 / 重降，
 * 所以这里要合并。`x` 是 ASCII 里重升的另一种写法。
 */
function toAccidentalSign(token: string): string {
  if (token === "") return "";
  const sharps = [...token].filter(
    (mark) => mark === "#" || mark === "\u266F" || mark === "x" || mark === "\u{1D12A}",
  );
  const flats = [...token].filter(
    (mark) => mark === "b" || mark === "\u266D" || mark === "\u{1D12B}",
  );
  if (sharps.length >= 2 && flats.length === 0) return DOUBLE_SHARP_SIGN;
  if (flats.length >= 2 && sharps.length === 0) return DOUBLE_FLAT_SIGN;
  return [...token].map((mark) => ACCIDENTAL_SIGNS[mark] ?? mark).join("");
}

/**
 * 把音名拆成字母 / 变音记号 / 八度。
 *
 * 不是音名就原样返回（字母部分），不抛错——这个函数是给显示层用的，
 * 不该因为某个字符串长得奇怪就把界面搞崩。
 */
export function splitNoteName(name: string): NoteNameParts {
  const match = NOTE_NAME_PATTERN.exec(name.trim());
  if (!match) return { letter: name, accidental: "", octave: "" };
  return {
    letter: match[1] ?? "",
    accidental: toAccidentalSign(match[2] ?? ""),
    octave: match[3] ?? "",
  };
}

/**
 * ASCII 音名 → 记谱写法：`C#4` → `C♯4`，`Bb2` → `B♭2`。
 *
 * 用在 aria-label、Select 选项这种只能塞纯文本的地方。
 */
export function toNotationName(name: string): string {
  const { letter, accidental, octave } = splitNoteName(name);
  return `${letter}${accidental}${octave}`;
}
