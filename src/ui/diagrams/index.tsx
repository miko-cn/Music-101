import type { ReactNode } from "react";
import { useCallback } from "react";
import { sharedEngine } from "../../core/audio/engine.ts";
import type {
  DiagramKind,
  DiagramSpec,
  SpecialLessonEntry,
  StageLesson,
} from "../../content/types.ts";
import { ChordBuildDiagram } from "./ChordBuildDiagram.tsx";
import { ChordProgressionDiagram } from "./ChordProgression.tsx";
import { DrumGridDiagram } from "./DrumGrid.tsx";
import { DynamicCurveDiagram } from "./DynamicCurveDiagram.tsx";
import { EnergyCurveDiagram } from "./EnergyCurve.tsx";
import { FrequencyBandsDiagram } from "./FrequencyBands.tsx";
import { HarmonyFunctionDiagram } from "./HarmonyFunctionDiagram.tsx";
import { IntervalDiagram } from "./IntervalDiagram.tsx";
import { KeyboardLayoutDiagram } from "./KeyboardLayout.tsx";
import { LayerStackDiagram } from "./LayerStack.tsx";
import { ScaleDegreesDiagram } from "./ScaleDegreesDiagram.tsx";
import { SectionTimelineDiagram } from "./SectionTimelineDiagram.tsx";
import { SemitoneRulerDiagram } from "./SemitoneRuler.tsx";
import { SidechainCurveDiagram } from "./SidechainCurve.tsx";

/**
 * 教学图的登记表。
 *
 * 内容层只说「这一关要哪张图」，画法全在这里。
 * 好处是几何和配色改一处就全站生效，内容文件保持纯数据。
 *
 * 新增一种图 = 加一个组件 + 在这张表里登记一行。
 * 少登记一种，TypeScript 会报错（这张表是 Record<DiagramKind, …>），
 * 不会出现「内容写了图、界面画不出来」的哑巴状态。
 */

/** 走标准流程的关卡（有鼓型、段落、BPM 这些数据）。 */
type DiagramLesson = StageLesson | SpecialLessonEntry;

function stageOf(lesson: DiagramLesson): StageLesson | null {
  return "handChoices" in lesson ? lesson : null;
}

interface DiagramContext {
  spec: DiagramSpec;
  lesson: DiagramLesson;
  onPlay?: (midis: number[]) => void;
  onPump?: () => void;
}

const RENDERERS: Record<DiagramKind, (context: DiagramContext) => ReactNode> = {
  "keyboard-layout": ({ spec, onPlay }) => (
    <KeyboardLayoutDiagram caption={spec.caption} onPlay={onPlay} />
  ),
  "semitone-ruler": ({ spec, onPlay }) => (
    <SemitoneRulerDiagram caption={spec.caption} onPlay={onPlay} />
  ),
  "chord-progression": ({ spec, lesson, onPlay }) => (
    <ChordProgressionDiagram
      caption={spec.caption}
      steps={stageOf(lesson)?.progression ?? []}
      onPlay={onPlay}
    />
  ),
  "drum-grid": ({ spec, lesson }) => (
    <DrumGridDiagram caption={spec.caption} lanes={stageOf(lesson)?.drums ?? []} />
  ),
  sidechain: ({ spec, onPump }) => <SidechainCurveDiagram caption={spec.caption} onPump={onPump} />,
  "energy-curve": ({ spec, lesson }) => {
    const stage = stageOf(lesson);
    return stage ? <EnergyCurveDiagram caption={spec.caption} lesson={stage} /> : null;
  },
  "frequency-bands": ({ spec, lesson, onPlay }) => {
    const bands = stageOf(lesson)?.frequencyBands;
    if (!bands) return null;
    return <FrequencyBandsDiagram caption={spec.caption} spec={bands} onPlay={onPlay} />;
  },
  "layer-stack": ({ spec, lesson }) => (
    <LayerStackDiagram caption={spec.caption} columns={stageOf(lesson)?.layerStack ?? []} />
  ),
  "interval-size": ({ spec, lesson, onPlay }) => (
    <IntervalDiagram caption={spec.caption} intervals={stageOf(lesson)?.intervals ?? []} onPlay={onPlay} />
  ),
  "chord-build": ({ spec, lesson, onPlay }) => (
    <ChordBuildDiagram caption={spec.caption} stacks={stageOf(lesson)?.chordStack ?? []} onPlay={onPlay} />
  ),
  "scale-degrees": ({ spec, lesson, onPlay }) => (
    <ScaleDegreesDiagram caption={spec.caption} steps={stageOf(lesson)?.scaleSteps ?? []} onPlay={onPlay} />
  ),
  "harmony-function": ({ spec, lesson, onPlay }) => (
    <HarmonyFunctionDiagram
      caption={spec.caption}
      functions={stageOf(lesson)?.functions ?? []}
      onPlay={onPlay}
    />
  ),
  "dynamic-curve": ({ spec, lesson }) => {
    const stage = stageOf(lesson);
    return stage ? <DynamicCurveDiagram caption={spec.caption} lesson={stage} /> : null;
  },
  "section-timeline": ({ spec, lesson }) => {
    const stage = stageOf(lesson);
    return stage ? <SectionTimelineDiagram caption={spec.caption} lesson={stage} /> : null;
  },
};

/** 所有登记在册的图种。测试拿它对照内容层用到的图种。 */
export const DIAGRAM_KINDS = Object.keys(RENDERERS) as DiagramKind[];

/**
 * 一关要配的图。
 *
 * 发声走全站唯一的引擎（`sharedEngine()`），所以图上点一个音
 * 和页面上点一个键听起来是同一个声音。
 */
export function LessonDiagrams({ lesson }: { lesson: DiagramLesson }) {
  const diagrams = lesson.diagrams ?? [];
  const onPlay = useCallback((midis: number[]) => {
    const engine = sharedEngine();
    if (!engine || midis.length === 0) return;
    void engine.resume().then(() => {
      // 几个音挨着调 = 同时响，就是一个和弦。
      for (const midi of midis) engine.playPitch(midi);
    });
  }, []);
  const onPump = useCallback(() => {
    const engine = sharedEngine();
    if (!engine) return;
    void engine.resume().then(() => {
      engine.playPump(stageOf(lesson)?.bpm ?? 120);
    });
  }, [lesson]);

  if (diagrams.length === 0) return null;
  return (
    <>
      {diagrams.map((spec) => (
        <div key={spec.kind}>{RENDERERS[spec.kind]({ spec, lesson, onPlay, onPump })}</div>
      ))}
    </>
  );
}
