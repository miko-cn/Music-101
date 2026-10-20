import { PPQ } from "../midi/types.ts";
import type { TrackRole } from "../midi/project.ts";
import type { AnalysisNote, AnalysisSong, AnalysisTrack } from "./song.ts";

const BAR = 4 * PPQ;

export function noteAt(bar: number, pitch: number, vel = 90, dur = PPQ * 2): AnalysisNote {
  return { tick: bar * BAR, dur, pitch, vel };
}

export function track(role: TrackRole, notes: AnalysisNote[]): AnalysisTrack {
  return { role, notes };
}

export function song(partial: Partial<AnalysisSong> & Pick<AnalysisSong, "tracks" | "totalBars">): AnalysisSong {
  return {
    keyRoot: 0,
    keyScale: "major",
    beatsPerBar: 4,
    allowBorrowed: false,
    sections: [],
    ...partial,
  };
}

/** 第 1 小节塞进 F#，C 大调里这是调外音。 */
export function outOfKeySong(): AnalysisSong {
  return song({
    totalBars: 1,
    tracks: [track("MELODY", [noteAt(0, 66)])],
  });
}

/** C 大调里的 Bb 大三和弦，关卡 8 之后当 ♭VII 放行。 */
export function borrowedSong(allowBorrowed: boolean): AnalysisSong {
  return song({
    totalBars: 1,
    allowBorrowed,
    tracks: [track("MELODY", [noteAt(0, 70), noteAt(0, 74), noteAt(0, 77)])],
  });
}

/** 主歌一层，副歌还是一层，能量抬不起来。 */
export function chorusFlatSong(): AnalysisSong {
  return song({
    totalBars: 8,
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    tracks: [
      track(
        "BASS",
        [0, 1, 2, 3, 4, 5, 6, 7].map((bar) => noteAt(bar, 48, 80)),
      ),
    ],
  });
}

/** 副歌多一条高一层的轨，能量和层数都够。 */
export function chorusLiftedSong(): AnalysisSong {
  return song({
    totalBars: 8,
    sections: [
      { name: "Verse", startBar: 0, bars: 4 },
      { name: "Chorus", startBar: 4, bars: 4 },
    ],
    tracks: [
      track(
        "BASS",
        [0, 1, 2, 3, 4, 5, 6, 7].map((bar) => noteAt(bar, 48, 80)),
      ),
      track(
        "SUPERSAW",
        [4, 5, 6, 7].map((bar) => noteAt(bar, 72, 100)),
      ),
    ],
  });
}

/** 第 2 小节 808 在 MIDI 28，kick 也在。 */
export function lowEndClashSong(): AnalysisSong {
  return song({
    totalBars: 2,
    sections: [{ name: "Verse", startBar: 0, bars: 2 }],
    tracks: [
      track("KICK", [noteAt(1, 36, 110, 120)]),
      track("808", [noteAt(0, 40, 100), noteAt(1, 28, 100)]),
    ],
  });
}

/** 两条中频轨重心叠在一起。 */
export function midClashSong(): AnalysisSong {
  return song({
    totalBars: 1,
    sections: [{ name: "Verse", startBar: 0, bars: 1 }],
    tracks: [track("BASS", [noteAt(0, 60, 90)]), track("SUPERSAW", [noteAt(0, 60, 90)])],
  });
}

/** kick 在低频，supersaw 在中高频，不打架。 */
export function separatedSpectrumSong(): AnalysisSong {
  return song({
    totalBars: 1,
    sections: [{ name: "Verse", startBar: 0, bars: 1 }],
    tracks: [track("KICK", [noteAt(0, 36, 100, 120)]), track("SUPERSAW", [noteAt(0, 76, 80)])],
  });
}

/** 四个小节同一个 C 大三和弦。 */
export function staleSong(): AnalysisSong {
  return song({
    totalBars: 4,
    sections: [{ name: "Verse", startBar: 0, bars: 4 }],
    tracks: [track("MELODY", [0, 1, 2, 3].map((bar) => noteAt(bar, 60)))],
  });
}

/** 相邻两小节都是 C 大三。 */
export function repeatedColorSong(): AnalysisSong {
  return song({
    totalBars: 2,
    sections: [{ name: "Verse", startBar: 0, bars: 2 }],
    tracks: [
      track("MELODY", [noteAt(0, 60), noteAt(0, 64), noteAt(0, 67), noteAt(1, 60), noteAt(1, 64), noteAt(1, 67)]),
    ],
  });
}

/** 第 2 小节换成 F 大三，相似度低于阈值。 */
export function freshColorSong(): AnalysisSong {
  return song({
    totalBars: 2,
    sections: [{ name: "Verse", startBar: 0, bars: 2 }],
    tracks: [
      track("MELODY", [noteAt(0, 60), noteAt(0, 64), noteAt(0, 67), noteAt(1, 65), noteAt(1, 69), noteAt(1, 72)]),
    ],
  });
}
