import type { LhPatternId, MeterLabel } from "./types";

export type { LhPatternId } from "./types";

export interface RhythmCapability {
  subdivision: number;
  syncopation: number;
  restRate: number;
  dottedRate: number;
  density: number;
}

export interface MelodyCapability {
  stepBias: number;
  leapBias: number;
  nonChordRate: number;
  sequence: number;
}

export interface HarmonyCapability {
  seventhRate: number;
  secondaryRate: number;
  borrowedRate: number;
  inversionRate: number;
  changeRate: number;
}

export interface TextureCapability {
  rhHarmonyRate: number;
  rhTriadChance: number;
}

export interface LevelDef {
  level: number;
  name: string;
  blurb: string;
  keyIds: string[];
  meters: MeterLabel[];
  maxLeap: number;
  rhSpan: number;
  lhPatterns: LhPatternId[];
  rhythm: RhythmCapability;
  melody: MelodyCapability;
  harmony: HarmonyCapability;
  texture: TextureCapability;
  tempo: number;
}

const CORE_KEYS = ["C", "G", "F"];

const COMMON_KEYS = [...CORE_KEYS, "D", "Bb", "A", "Eb"];
const WIDE_KEYS = [...COMMON_KEYS, "E", "Ab", "B", "Db", "F#"];
const MINOR_KEYS = ["Am", "Em", "Dm", "Bm", "Gm", "Cm", "Fm"];
const FULL_KEYS = [...WIDE_KEYS, ...MINOR_KEYS, "F#m", "C#m"];

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    name: "First Steps",
    blurb: "Whole, half and quarter notes in 4/4, with five-finger melodies over steady bass roots.",
    keyIds: [...CORE_KEYS],
    meters: ["4/4"],
    maxLeap: 2,
    rhSpan: 7,
    lhPatterns: ["rootWhole"],
    rhythm: { subdivision: 480, syncopation: 0, restRate: 0, dottedRate: 0, density: 0.2 },
    melody: { stepBias: 1, leapBias: 0, nonChordRate: 0, sequence: 0 },
    harmony: { seventhRate: 0, secondaryRate: 0, borrowedRate: 0, inversionRate: 0, changeRate: 0 },
    texture: { rhHarmonyRate: 0, rhTriadChance: 0 },
    tempo: 60,
  },
  {
    level: 2,
    name: "Steady Beat",
    blurb: "Dotted halves and simple rests join 3/4 time, with clear tonic and dominant harmony.",
    keyIds: [...CORE_KEYS],
    meters: ["4/4", "3/4"],
    maxLeap: 2,
    rhSpan: 7,
    lhPatterns: ["rootWhole", "rootHalf"],
    rhythm: { subdivision: 480, syncopation: 0.05, restRate: 0.08, dottedRate: 0.1, density: 0.3 },
    melody: { stepBias: 0.95, leapBias: 0.05, nonChordRate: 0.05, sequence: 0 },
    harmony: { seventhRate: 0, secondaryRate: 0, borrowedRate: 0, inversionRate: 0, changeRate: 0 },
    texture: { rhHarmonyRate: 0, rhTriadChance: 0 },
    tempo: 64,
  },
  {
    level: 3,
    name: "Moving Along",
    blurb: "Eighth-note pairs, thirds, chord-tone harmony, and bouncy root-fifth bass patterns.",
    keyIds: [...CORE_KEYS, "D", "Bb"],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 4,
    rhSpan: 12,
    lhPatterns: ["rootHalf", "rootFifth"],
    rhythm: { subdivision: 240, syncopation: 0.1, restRate: 0.12, dottedRate: 0.15, density: 0.45 },
    melody: { stepBias: 0.9, leapBias: 0.1, nonChordRate: 0.08, sequence: 0 },
    harmony: { seventhRate: 0, secondaryRate: 0, borrowedRate: 0, inversionRate: 0.1, changeRate: 0 },
    texture: { rhHarmonyRate: 0.12, rhTriadChance: 0 },
    tempo: 70,
  },
  {
    level: 4,
    name: "Finding Your Way",
    blurb: "Dotted rhythms, wider intervals, phrase sequences, and block-chord accompaniment.",
    keyIds: [...COMMON_KEYS],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 5,
    rhSpan: 12,
    lhPatterns: ["rootFifth", "block"],
    rhythm: { subdivision: 240, syncopation: 0.15, restRate: 0.15, dottedRate: 0.2, density: 0.5 },
    melody: { stepBias: 0.85, leapBias: 0.15, nonChordRate: 0.12, sequence: 0.15 },
    harmony: { seventhRate: 0, secondaryRate: 0, borrowedRate: 0, inversionRate: 0.25, changeRate: 0 },
    texture: { rhHarmonyRate: 0.2, rhTriadChance: 0 },
    tempo: 76,
  },
  {
    level: 5,
    name: "Hand in Hand",
    blurb: "Sixteenths, a wider range, seventh chords, and broken-chord or arpeggiated bass.",
    keyIds: [...WIDE_KEYS],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 7,
    rhSpan: 19,
    lhPatterns: ["block", "broken", "arpeggio"],
    rhythm: { subdivision: 120, syncopation: 0.2, restRate: 0.18, dottedRate: 0.28, density: 0.6 },
    melody: { stepBias: 0.8, leapBias: 0.2, nonChordRate: 0.18, sequence: 0.25 },
    harmony: { seventhRate: 0.22, secondaryRate: 0, borrowedRate: 0, inversionRate: 0.4, changeRate: 0.12 },
    texture: { rhHarmonyRate: 0.3, rhTriadChance: 0.1 },
    tempo: 84,
  },
  {
    level: 6,
    name: "Flowing Lines",
    blurb: "Alberti or arpeggiated bass, secondary dominants, and flowing phrase sequences.",
    keyIds: [...WIDE_KEYS, "B", "Db", "F#"],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 7,
    rhSpan: 19,
    lhPatterns: ["block", "broken", "alberti", "arpeggio"],
    rhythm: { subdivision: 120, syncopation: 0.25, restRate: 0.2, dottedRate: 0.3, density: 0.65 },
    melody: { stepBias: 0.78, leapBias: 0.22, nonChordRate: 0.22, sequence: 0.4 },
    harmony: { seventhRate: 0.35, secondaryRate: 0.18, borrowedRate: 0, inversionRate: 0.5, changeRate: 0.2 },
    texture: { rhHarmonyRate: 0.38, rhTriadChance: 0.2 },
    tempo: 92,
  },
  {
    level: 7,
    name: "Changing Colors",
    blurb: "Minor keys, borrowed colors, expressive leaps, and waltz or open-fifth accompaniment.",
    keyIds: [...WIDE_KEYS, ...MINOR_KEYS],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 9,
    rhSpan: 24,
    lhPatterns: ["broken", "alberti", "waltz", "arpeggio", "openFifths"],
    rhythm: { subdivision: 120, syncopation: 0.3, restRate: 0.22, dottedRate: 0.34, density: 0.7 },
    melody: { stepBias: 0.74, leapBias: 0.26, nonChordRate: 0.26, sequence: 0.6 },
    harmony: { seventhRate: 0.48, secondaryRate: 0.3, borrowedRate: 0.12, inversionRate: 0.58, changeRate: 0.28 },
    texture: { rhHarmonyRate: 0.46, rhTriadChance: 0.3 },
    tempo: 100,
  },
  {
    level: 8,
    name: "Wider Skies",
    blurb: "Syncopation, melodic sequences, striding bass, and an even wider keyboard range.",
    keyIds: [...WIDE_KEYS, ...MINOR_KEYS],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 12,
    rhSpan: 24,
    lhPatterns: ["alberti", "waltz", "broken", "arpeggio", "openFifths", "stride"],
    rhythm: { subdivision: 120, syncopation: 0.35, restRate: 0.24, dottedRate: 0.38, density: 0.75 },
    melody: { stepBias: 0.7, leapBias: 0.3, nonChordRate: 0.3, sequence: 0.8 },
    harmony: { seventhRate: 0.58, secondaryRate: 0.4, borrowedRate: 0.18, inversionRate: 0.65, changeRate: 0.36 },
    texture: { rhHarmonyRate: 0.54, rhTriadChance: 0.4 },
    tempo: 108,
  },
  {
    level: 9,
    name: "Full Voice",
    blurb: "Dense rhythms, voice-led inversions, and independent accompaniment across the keyboard.",
    keyIds: [...WIDE_KEYS, ...MINOR_KEYS],
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 12,
    rhSpan: 24,
    lhPatterns: ["alberti", "waltz", "broken", "arpeggio", "openFifths", "stride"],
    rhythm: { subdivision: 120, syncopation: 0.4, restRate: 0.26, dottedRate: 0.42, density: 0.8 },
    melody: { stepBias: 0.66, leapBias: 0.34, nonChordRate: 0.34, sequence: 1 },
    harmony: { seventhRate: 0.68, secondaryRate: 0.5, borrowedRate: 0.24, inversionRate: 0.72, changeRate: 0.44 },
    texture: { rhHarmonyRate: 0.62, rhTriadChance: 0.5 },
    tempo: 116,
  },
  {
    level: 10,
    name: "Free Rein",
    blurb: "The full vocabulary: fast, wide, chromatic-leaning harmony, and rhythmically rich lines.",
    keyIds: FULL_KEYS,
    meters: ["4/4", "3/4", "2/4"],
    maxLeap: 12,
    rhSpan: 24,
    lhPatterns: ["alberti", "waltz", "broken", "arpeggio", "openFifths", "stride"],
    rhythm: { subdivision: 120, syncopation: 0.45, restRate: 0.28, dottedRate: 0.46, density: 0.85 },
    melody: { stepBias: 0.62, leapBias: 0.38, nonChordRate: 0.38, sequence: 1 },
    harmony: { seventhRate: 0.78, secondaryRate: 0.6, borrowedRate: 0.3, inversionRate: 0.78, changeRate: 0.52 },
    texture: { rhHarmonyRate: 0.7, rhTriadChance: 0.6 },
    tempo: 124,
  },
];

export function getLevel(level: number): LevelDef {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return LEVELS[clamped - 1];
}
