import { splitNoteName } from "../core/theory/notation.ts";

/**
 * 音名的记谱显示。
 *
 * 字母用衬线体（跟正文的无衬线拉开），变音记号用 Noto Music 记谱字体，
 * 八度数字做成下标——这是谱面的写法，不是正文的写法。
 *
 * 渲染出来是 "C♯4" 这样一个整体，但结构是分开的：
 * 字母、变音记号、八度各有各的排版规则。
 */
export function NoteName({ name, className }: { name: string; className?: string }) {
  const { letter, accidental, octave } = splitNoteName(name);
  return (
    <span className={className ? `note-name ${className}` : "note-name"}>
      {letter}
      {accidental ? <NoteAccidental sign={accidental} /> : null}
      {octave ? <span className="note-octave">{octave}</span> : null}
    </span>
  );
}

/**
 * 变音记号。
 *
 * 记谱字体的变音符号是按「五线谱上的位置」设计的，不是按文字基线设计的：
 *
 * - **升号 / 重升号**是横跨谱线的：它有一半在基线以下。跟字母并排时必须往上提，
 *   否则重心偏低，看着像掉下去了。
 * - **降号 / 重降号**的碗就坐在基线上：不能提，一提就浮起来了。它的柄本来就往上长。
 *
 * 另外记谱符号的笔画比字母细，同尺寸下会细成一根发丝，所以整体放大到比字母大一号。
 */
function NoteAccidental({ sign }: { sign: string }) {
  const raised = sign === "♯" || sign === "\u{1D12A}";
  return (
    <span className={raised ? "note-accidental is-sharp" : "note-accidental is-flat"}>{sign}</span>
  );
}
