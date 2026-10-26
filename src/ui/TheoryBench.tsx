import { useEffect, useState } from "react";
import { Card, Col, Flex, Row, Select, Tag } from "antd";
import {
  CHORD_LABELS,
  SCALE_LABELS,
  degreeOfPitch,
  getChordPitches,
  getScalePitches,
  pitchClassToName,
  romanNumeral,
  spellChordTones,
  spellScaleNotes,
  type ChordQuality,
  type PitchClass,
  type ScaleId,
} from "../core/index.ts";
import { computerKeyboard } from "../core/lesson/computer-keyboard.ts";
import { toNotationName } from "../core/theory/notation.ts";
import { Piano } from "./Piano.tsx";
import { NoteName } from "./NoteName.tsx";

const ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as PitchClass[];
const SCALES: ScaleId[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
const QUALITIES: ChordQuality[] = ["maj", "min", "maj7", "min7", "add9", "sus4", "dom7"];

export function TheoryBench() {
  const [root, setRoot] = useState<PitchClass>(6);
  const [scale, setScale] = useState<ScaleId>("naturalMinor");
  const [quality, setQuality] = useState<ChordQuality>("min");
  const [preferFlat, setPreferFlat] = useState(false);
  const [held, setHeld] = useState<ReadonlySet<PitchClass>>(() => new Set());

  /**
   * 点琴键既换调，也响一声——按住的键会亮，松手就收。
   *
   * 走全站唯一的键盘服务，所以这里点琴键，
   * 全局键盘面板里对应的键也会一起亮。
   */
  useEffect(() => {
    return computerKeyboard.subscribe({
      onPress: (pitch) => {
        setHeld((current) => (current.has(pitch) ? current : new Set(current).add(pitch)));
      },
      onRelease: (pitch) => {
        setHeld((current) => {
          if (!current.has(pitch)) return current;
          const next = new Set(current);
          next.delete(pitch);
          return next;
        });
      },
      onOctave: () => undefined,
    });
  }, []);

  const scalePitches = getScalePitches(root, scale);
  const chord = { root, quality };
  const chordPitches = getChordPitches(chord);
  const numeral = romanNumeral(chord, root);
  const scaleNames = spellScaleNotes(root, scale, preferFlat);
  const chordNames = spellChordTones(chord, preferFlat);
  const scaleSet = new Set(scalePitches);
  const chordSet = new Set(chordPitches);
  const tonicName = pitchClassToName(root, preferFlat);
  const spelled = new Map<PitchClass, string>();
  scalePitches.forEach((pitch, index) => {
    const name = scaleNames[index];
    if (name !== undefined) spelled.set(pitch, name);
  });
  chordPitches.forEach((pitch, index) => {
    const name = chordNames[index];
    if (name !== undefined) spelled.set(pitch, name);
  });
  const spell = (pitch: PitchClass) => spelled.get(pitch) ?? pitchClassToName(pitch, preferFlat);

  return (
    <>
      <p className="lead">
        先选定调、音阶和和弦性质。下面给出这个调的七个音、和弦的罗马数字级数，以及这些音在键盘上的位置。点琴键可以换调。
      </p>

      <Card title="选择">
        <Flex wrap gap={16} align="flex-end">
          <div className="field">
            <label htmlFor="key-root">调</label>
            <Select<PitchClass>
              id="key-root"
              size="large"
              value={root}
              style={{ minWidth: 112 }}
              onChange={setRoot}
              options={ROOTS.map((pitch) => ({
                value: pitch,
                label: toNotationName(pitchClassToName(pitch, preferFlat)),
              }))}
            />
          </div>
          <div className="field">
            <label htmlFor="key-scale">音阶</label>
            <Select<ScaleId>
              id="key-scale"
              size="large"
              value={scale}
              style={{ minWidth: 168 }}
              onChange={setScale}
              options={SCALES.map((item) => ({ value: item, label: SCALE_LABELS[item] }))}
            />
          </div>
          <div className="field">
            <label htmlFor="key-quality">和弦性质</label>
            <Select<ChordQuality>
              id="key-quality"
              size="large"
              value={quality}
              style={{ minWidth: 200 }}
              onChange={setQuality}
              options={QUALITIES.map((item) => ({
                value: item,
                label: `${CHORD_LABELS[item]} · ${item}`,
              }))}
            />
          </div>
          <div className="field">
            <label htmlFor="key-spelling">记谱</label>
            <Select<"sharp" | "flat">
              id="key-spelling"
              size="large"
              value={preferFlat ? "flat" : "sharp"}
              style={{ minWidth: 120 }}
              onChange={(value) => setPreferFlat(value === "flat")}
              options={[
                { value: "sharp", label: "升号" },
                { value: "flat", label: "降号" },
              ]}
            />
          </div>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="调内音" className="result-card">
            <h2 className="result-heading">
              <NoteName name={tonicName} /> {SCALE_LABELS[scale]}
            </h2>
            <ol className="degree-list">
              {scalePitches.map((pitch, index) => (
                <li key={`${index}-${pitch}`}>
                  <span className="degree-index">{index + 1}</span>
                  <NoteName name={scaleNames[index] ?? ""} />
                </li>
              ))}
            </ol>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="和弦与级数" className="result-card">
            <p className="chord-symbol">
              <NoteName name={tonicName} />
              {quality} → {numeral}
            </p>
            <p className="numeral-label">级数</p>
            <p className="numeral">{numeral}</p>
            <p className="quality-label">{CHORD_LABELS[quality]}</p>
            <Flex wrap gap={8}>
              {chordPitches.map((pitch, index) => {
                const degree = degreeOfPitch(pitch, root, scale);
                return (
                  <Tag key={`${index}-${pitch}`} color={degree === null ? "gold" : "blue"}>
                    <NoteName name={chordNames[index] ?? ""} />
                    {degree === null ? " · 调外" : ` · ${degree} 级`}
                  </Tag>
                );
              })}
            </Flex>
            <p className="hint">
              级数按这个调的平行大调来记。大三和弦用大写，小三和弦用小写，减三和弦加 °。
            </p>
          </Card>
        </Col>
      </Row>

      <Card title="键盘">
        <Piano
          spell={spell}
          isRoot={(pitch) => pitch === root}
          isHeld={(pitch) => held.has(pitch)}
          inScale={(pitch) => scaleSet.has(pitch)}
          inChord={(pitch) => chordSet.has(pitch)}
          onPick={setRoot}
          onPress={(pitch) => {
            computerKeyboard.pressNote((computerKeyboard.getOctave() + 1) * 12 + pitch);
          }}
          onRelease={(pitch) => {
            computerKeyboard.releaseNote((computerKeyboard.getOctave() + 1) * 12 + pitch);
          }}
          label="一个八度的键盘，点击换调"
        />
        <ul className="piano-legend">
          <li>
            <i className="swatch swatch-chord" />
            填色是和弦音
          </li>
          <li>
            <i className="swatch swatch-scale" />
            底部色条是调内音
          </li>
          <li>
            <i className="swatch swatch-root" />
            黄框是当前主音
          </li>
        </ul>
      </Card>
    </>
  );
}
