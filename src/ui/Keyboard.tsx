import type { CSSProperties } from "react";
import { midiToNoteName } from "../core/theory/pitch.ts";
import { keyboardLayout } from "../core/theory/keyboard.ts";

export interface KeyboardProps {
  /** 起始 MIDI 音高，必须是 C（例如 36 = C2、48 = C3）。 */
  fromMidi?: number;
  /** 显示几个八度。 */
  octaves?: number;
  /** 是否在琴键上印音名。 */
  showNames?: boolean;
  /** 是否在琴键上印 MIDI 编号。 */
  showMidi?: boolean;
  /** 是否标出「2 个 / 3 个」的黑键分组，以及 C、F 的定位点。 */
  showGroups?: boolean;
  /** 需要高亮的音类集合（0–11）。 */
  highlight?: ReadonlySet<number>;
  /** 需要高亮的精确 MIDI 音高集合（比音类高亮更强）。 */
  highlightMidi?: ReadonlySet<number>;
  /** 点琴键时回调，参数是 MIDI 音高。 */
  onPick?: (midi: number) => void;
  /** 已经按下的音高集合。 */
  pressed?: ReadonlySet<number>;
  label?: string;
}

/**
 * 多八度参考键盘。
 *
 * 与关卡里那个单八度 Piano 不同，这个是「查位置」用的：
 * - 跨多个八度，才能看出「黑键 2 个一组、3 个一组」在重复
 * - 每个键都印音名（黑键也印）
 * - 可以标出 C 和 F 这两个定位点
 */
export function Keyboard({
  fromMidi = 36,
  octaves = 3,
  showNames = true,
  showMidi = false,
  showGroups = true,
  highlight,
  highlightMidi,
  onPick,
  pressed,
  label = "参考键盘",
}: KeyboardProps) {
  const { white, black, whiteCount } = keyboardLayout(fromMidi, octaves);
  const whiteWidth = 100 / whiteCount;
  const blackWidth = (0.58 / whiteCount) * 100;

  return (
    <div className="keyboard-wrap">
      {showGroups && (
        <div className="keyboard-groups" aria-hidden="true">
          {Array.from({ length: octaves }, (_, octave) => {
            const base = octave * 7;
            const pairLeft = ((base + 1 - 0.29) / whiteCount) * 100;
            const pairWidth = (1.58 / whiteCount) * 100;
            const tripleLeft = ((base + 4 - 0.29) / whiteCount) * 100;
            const tripleWidth = (2.58 / whiteCount) * 100;
            return (
              <div key={octave}>
                <span className="keyboard-group" style={{ left: `${pairLeft}%`, width: `${pairWidth}%` }}>
                  2 个
                </span>
                <span className="keyboard-group" style={{ left: `${tripleLeft}%`, width: `${tripleWidth}%` }}>
                  3 个
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="keyboard" role="group" aria-label={label}>
        {white.map((key) => (
          <KeyButton
            key={key.midi}
            kind="white"
            midi={key.midi}
            showNames={showNames}
            showMidi={showMidi}
            highlighted={highlight?.has(key.midi % 12) === true}
            exact={highlightMidi?.has(key.midi) === true}
            pressed={pressed?.has(key.midi) === true}
            onPick={onPick}
          />
        ))}
        {black.map((key) => (
          <KeyButton
            key={key.midi}
            kind="black"
            midi={key.midi}
            showNames={showNames}
            showMidi={showMidi}
            highlighted={highlight?.has(key.midi % 12) === true}
            exact={highlightMidi?.has(key.midi) === true}
            pressed={pressed?.has(key.midi) === true}
            onPick={onPick}
            style={{
              left: `${((key.whiteIndex + 1 - 0.29) / whiteCount) * 100}%`,
              width: `${blackWidth}%`,
            }}
          />
        ))}
      </div>
      {showGroups && (
        <div className="keyboard-anchors" aria-hidden="true">
          {Array.from({ length: octaves }, (_, octave) => {
            const base = octave * 7;
            return (
              <div key={octave}>
                <span className="keyboard-anchor" style={{ left: `${base * whiteWidth}%`, width: `${whiteWidth}%` }}>
                  C
                </span>
                <span
                  className="keyboard-anchor"
                  style={{ left: `${(base + 3) * whiteWidth}%`, width: `${whiteWidth}%` }}
                >
                  F
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KeyButton({
  kind,
  midi,
  showNames,
  showMidi,
  highlighted,
  exact,
  pressed,
  onPick,
  style,
}: {
  kind: "white" | "black";
  midi: number;
  showNames: boolean;
  showMidi: boolean;
  highlighted: boolean;
  exact: boolean;
  pressed: boolean;
  onPick?: (midi: number) => void;
  style?: CSSProperties;
}) {
  const name = midiToNoteName(midi);
  return (
    <button
      type="button"
      className={[
        "keyboard-key",
        kind === "white" ? "keyboard-white" : "keyboard-black",
        highlighted ? "is-highlight" : "",
        exact ? "is-highlight-exact" : "",
        pressed ? "is-pressed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`${name}${showMidi ? `，MIDI ${midi}` : ""}`}
      style={style}
      onClick={() => onPick?.(midi)}
    >
      {showNames ? <span className="keyboard-key-name">{name}</span> : null}
      {showMidi ? <span className="keyboard-key-midi">{midi}</span> : null}
    </button>
  );
}
