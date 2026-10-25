import type { CSSProperties } from "react";
import type { PitchClass } from "../core/theory/pitch.ts";
import { toNotationName } from "../core/theory/notation.ts";
import { NoteName } from "./NoteName.tsx";

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] as PitchClass[];
/** 黑键中心落在第 afterWhite 个白键的右边界上。 */
const BLACK_KEYS: readonly { pitch: PitchClass; afterWhite: number }[] = [
  { pitch: 1, afterWhite: 0 },
  { pitch: 3, afterWhite: 1 },
  { pitch: 6, afterWhite: 3 },
  { pitch: 8, afterWhite: 4 },
  { pitch: 10, afterWhite: 5 },
];

export function Piano({
  spell,
  isRoot,
  inScale,
  inChord,
  onPick,
  label = "一个八度的键盘",
  rootWord = "当前主音",
  keycap,
  isHeld,
}: {
  spell: (pitch: PitchClass) => string;
  isRoot: (pitch: PitchClass) => boolean;
  inScale: (pitch: PitchClass) => boolean;
  inChord: (pitch: PitchClass) => boolean;
  onPick: (pitch: PitchClass) => void;
  label?: string;
  rootWord?: string;
  /** 印在琴键上的电脑键帽，例如 A、W。 */
  keycap?: (pitch: PitchClass) => string | null;
  isHeld?: (pitch: PitchClass) => boolean;
}) {
  return (
    <div className="piano" role="group" aria-label={label}>
      {WHITE_KEYS.map((pitch) => (
        <KeyButton
          key={pitch}
          kind="white"
          name={spell(pitch)}
          keycap={keycap?.(pitch) ?? null}
          isRoot={isRoot(pitch)}
          isHeld={isHeld?.(pitch) === true}
          inScale={inScale(pitch)}
          inChord={inChord(pitch)}
          rootWord={rootWord}
          onPick={() => onPick(pitch)}
        />
      ))}
      {BLACK_KEYS.map((key) => (
        <KeyButton
          key={key.pitch}
          kind="black"
          name={spell(key.pitch)}
          keycap={keycap?.(key.pitch) ?? null}
          isRoot={isRoot(key.pitch)}
          isHeld={isHeld?.(key.pitch) === true}
          inScale={inScale(key.pitch)}
          inChord={inChord(key.pitch)}
          rootWord={rootWord}
          onPick={() => onPick(key.pitch)}
          style={{
            left: `${((key.afterWhite + 1 - 0.29) / WHITE_KEYS.length) * 100}%`,
            width: `${(0.58 / WHITE_KEYS.length) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

function KeyButton({
  kind,
  name,
  keycap,
  isRoot,
  isHeld,
  inScale,
  inChord,
  rootWord,
  onPick,
  style,
}: {
  kind: "white" | "black";
  name: string;
  keycap: string | null;
  isRoot: boolean;
  isHeld: boolean;
  inScale: boolean;
  inChord: boolean;
  rootWord: string;
  onPick: () => void;
  style?: CSSProperties;
}) {
  const role = inChord ? "和弦音" : inScale ? "调内音" : "调外音";
  return (
    <button
      type="button"
      className={[
        "piano-key",
        kind === "white" ? "piano-white" : "piano-black",
        inScale ? "is-scale" : "",
        inChord ? "is-chord" : "",
        isRoot ? "is-root" : "",
        isHeld ? "is-held" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isRoot || isHeld}
      aria-label={`${toNotationName(name)}${keycap ? `，电脑键 ${keycap}` : ""}，${isRoot ? `${rootWord}，` : ""}${role}`}
      style={style}
      onClick={onPick}
    >
      {keycap ? <span className="keycap">{keycap}</span> : null}
      <NoteName name={name} className="key-name" />
    </button>
  );
}
