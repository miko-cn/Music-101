/** 规格 3.3.1 的首版默认值。改判定先改这里。 */
export const THRESHOLDS = {
  /** 最低音低于这个 MIDI 音高，音区权重用低频。 */
  lowRegisterBelow: 60,
  /** 最低音低于这个 MIDI 音高（且 ≥ lowRegisterBelow）算中频区，否则算高频区。 */
  midRegisterBelow: 80,
  lowWeight: 1,
  midWeight: 0.6,
  highWeight: 0.4,
  /** 副歌平均能量 / 主歌平均能量 要达到的倍数。 */
  chorusEnergyRatio: 1.5,
  /** 副歌平均层数至少比主歌多这么多。 */
  chorusLayerDelta: 1,
  /** 808 最低音低于这个 MIDI 音高才可能和 kick 冲突（约 45Hz）。 */
  subPitchBelow: 33,
  /** 相邻小节音级集合 Jaccard 大于这个值算色彩重复。等于不算。 */
  chordColorJaccard: 0.75,
  /** 中频带，单位 Hz。两条轨的重心都落在这里且彼此太近，算挤在一起。 */
  midBandLowHz: 250,
  midBandHighHz: 2000,
  centroidClashHz: 150,
  /** 同一个音级集合连续这么多个小节，从这一串的最后一小节开始算失去新鲜感。 */
  staleRunBars: 4,
  decorativeRoles: ["FX", "CHOP"] as const,
} as const;
