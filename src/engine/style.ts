import type { LhPatternId, MusicStyle } from "./types";

export interface MusicStyleDef {
  id: MusicStyle;
  label: string;
  blurb: string;
  lhWeights: Record<LhPatternId, number>;
  rhHarmonyBias: number;
  rhTriadChance: number;
  syncopationBias: number;
  restBias: number;
  sixteenthBias: number;
  dottedBias: number;
  seventhBias: number;
  secondaryBias: number;
  borrowedBias: number;
  inversionBias: number;
  harmonicRhythmBias: number;
}

export const STYLE_DEFS: MusicStyleDef[] = [
  {
    id: "mixed",
    label: "Mixed",
    blurb: "A balanced blend of classical, pop, and jazz textures.",
    lhWeights: {
      rootWhole: 1,
      rootHalf: 1,
      rootFifth: 1,
      block: 1,
      broken: 1,
      alberti: 0.7,
      waltz: 1,
      arpeggio: 1,
      openFifths: 1,
      stride: 1,
    },
    rhHarmonyBias: 1,
    rhTriadChance: 0.5,
    syncopationBias: 1,
    restBias: 1,
    sixteenthBias: 1,
    dottedBias: 1,
    seventhBias: 1,
    secondaryBias: 1,
    borrowedBias: 1,
    inversionBias: 1,
    harmonicRhythmBias: 1,
  },
  {
    id: "classical",
    label: "Classical",
    blurb: "Alberti, broken chords, and flowing arpeggios over traditional harmony.",
    lhWeights: {
      rootWhole: 1,
      rootHalf: 1,
      rootFifth: 0.6,
      block: 0.8,
      broken: 1.1,
      alberti: 1.1,
      waltz: 1,
      arpeggio: 1.6,
      openFifths: 0.35,
      stride: 0.2,
    },
    rhHarmonyBias: 0.85,
    rhTriadChance: 0.3,
    syncopationBias: 0.65,
    restBias: 0.8,
    sixteenthBias: 0.65,
    dottedBias: 1.15,
    seventhBias: 0.75,
    secondaryBias: 0.8,
    borrowedBias: 0.7,
    inversionBias: 1.2,
    harmonicRhythmBias: 0.75,
  },
  {
    id: "pop",
    label: "Pop",
    blurb: "Open fifths, arpeggios, and steady chordal grooves over pop progressions.",
    lhWeights: {
      rootWhole: 1,
      rootHalf: 1,
      rootFifth: 1.2,
      block: 1.1,
      broken: 0.9,
      alberti: 0.2,
      waltz: 0.5,
      arpeggio: 1.3,
      openFifths: 1.7,
      stride: 0.9,
    },
    rhHarmonyBias: 1.1,
    rhTriadChance: 0.7,
    syncopationBias: 1.2,
    restBias: 1.1,
    sixteenthBias: 0.85,
    dottedBias: 1,
    seventhBias: 0.9,
    secondaryBias: 0.8,
    borrowedBias: 1.1,
    inversionBias: 0.9,
    harmonicRhythmBias: 1.1,
  },
  {
    id: "jazz",
    label: "Jazz",
    blurb: "Stride and broken bass with ii–V–I flavored progressions.",
    lhWeights: {
      rootWhole: 1,
      rootHalf: 1,
      rootFifth: 0.7,
      block: 1.1,
      broken: 1.1,
      alberti: 0.35,
      waltz: 0.7,
      arpeggio: 1.1,
      openFifths: 0.8,
      stride: 1.7,
    },
    rhHarmonyBias: 1.2,
    rhTriadChance: 0.8,
    syncopationBias: 1.35,
    restBias: 1.2,
    sixteenthBias: 1.25,
    dottedBias: 0.9,
    seventhBias: 1.35,
    secondaryBias: 1.3,
    borrowedBias: 1.2,
    inversionBias: 1.1,
    harmonicRhythmBias: 1.35,
  },
];

export function getStyle(id: MusicStyle): MusicStyleDef {
  return STYLE_DEFS.find((style) => style.id === id) ?? STYLE_DEFS[0];
}

export function isMusicStyle(value: unknown): value is MusicStyle {
  return STYLE_DEFS.some((style) => style.id === value);
}
