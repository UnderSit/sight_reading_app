export const PPQ = 480;

export type MeterLabel = "4/4" | "3/4" | "2/4";
export type Mode = "major" | "minor";
export type MusicStyle = "mixed" | "classical" | "pop" | "jazz";
export type KeyLabelSystem = "letters" | "solfege";
export type PhraseRole = "opening" | "continuation" | "development" | "final";
export type CadenceType =
  | "half"
  | "imperfectAuthentic"
  | "perfectAuthentic"
  | "deceptive";
export type ChordQuality =
  | "maj"
  | "min"
  | "dim"
  | "aug"
  | "dom7"
  | "min7"
  | "maj7"
  | "halfDim7";
export type LhPatternId =
  | "rootWhole"
  | "rootHalf"
  | "rootFifth"
  | "block"
  | "broken"
  | "alberti"
  | "waltz"
  | "arpeggio"
  | "openFifths"
  | "stride";

export interface Meter {
  label: MeterLabel;
  beats: number;
  unit: number;
  ticks: number;
}

export const METERS: Record<MeterLabel, Meter> = {
  "4/4": { label: "4/4", beats: 4, unit: 4, ticks: PPQ * 4 },
  "3/4": { label: "3/4", beats: 3, unit: 4, ticks: PPQ * 3 },
  "2/4": { label: "2/4", beats: 2, unit: 4, ticks: PPQ * 2 },
};

export interface SpelledNote {
  letter: string;
  accidental: number;
  pc: number;
  name: string;
}

export interface KeySpec {
  id: string;
  label: string;
  vf: string;
  mode: Mode;
  tonicPc: number;
  tonicName: string;
  preferFlats: boolean;
  degrees: SpelledNote[];
}

export interface NoteEvent {
  start: number;
  duration: number;
  pitches: number[];
  tieStart?: boolean;
  tieEnd?: boolean;
}

export interface ChordSpec {
  degree: number;
  rootPc: number;
  quality: ChordQuality;
  inversion: number;
  bassPc: number;
  pcs: number[];
  secondaryOf: number | null;
}

export interface HarmonyEvent {
  start: number;
  duration: number;
  chord: ChordSpec;
}

export interface Measure {
  rh: NoteEvent[];
  lh: NoteEvent[];
  harmony: HarmonyEvent[];
}

export interface Exercise {
  seed: number;
  level: number;
  style: MusicStyle;
  key: KeySpec;
  meter: Meter;
  measures: Measure[];
  degrees: number[];
  phraseEnds: number[];
  phraseRoles: PhraseRole[];
  phraseCadences: CadenceType[];
  lhPatterns: LhPatternId[];
}
