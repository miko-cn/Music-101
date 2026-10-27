export {
  SUPERSAW_CENTS,
  bassVoice,
  kickVoice,
  pluckVoice,
  saturationCurve,
  sidechainAutomation,
  subVoice,
  supersawVoice,
} from "./params.ts";
export { stepSeconds, takeDue } from "./schedule.ts";
export { createEngine } from "./engine.ts";
export type { MusicEngine, VoiceId } from "./engine.ts";
export { sfxSteps } from "./sfx.ts";
export type { SfxCue, SfxOptions, SfxStep, SfxVoice } from "./sfx.ts";
export type { GainPoint } from "./params.ts";
export {
  PLAIN_TONE,
  PIANO_HOLD_SECONDS,
  RHODES,
  fundamentalDecaySeconds,
  inharmonicityAt,
  noteLifeSeconds,
  partialDecays,
  partialFrequencies,
} from "./piano.ts";
export type { PartialSpec, PlainToneProfile, ToneProfile } from "./piano.ts";
export {
  EAR_BLOCK_HOLD_SECONDS,
  EAR_MELODIC_HOLD_SECONDS,
  EAR_MELODIC_SPACING_SECONDS,
  earChoiceHoldSeconds,
  earChoiceKind,
  earChoiceSchedule,
} from "./ear.ts";
export type { EarChoiceKind, EarScheduleNote } from "./ear.ts";
