import type {
  CadenceType,
  ChordQuality,
  ChordSpec,
  HarmonyEvent,
  KeySpec,
  Meter,
  MusicStyle,
} from "./types";
import { PPQ } from "./types";
import type { LevelDef } from "./difficulty";
import type { RhythmicEvent } from "./rhythm";
import { getStyle } from "./style";
import { weightedPick, type Rng } from "./rng";

const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  halfDim7: [0, 3, 6, 10],
};

const MAJOR_QUALITIES: ChordQuality[] = ["maj", "min", "min", "maj", "maj", "min", "dim"];
const MINOR_QUALITIES: ChordQuality[] = ["min", "dim", "maj", "min", "maj", "maj", "dim"];

const MAJOR_PHRASES: Record<MusicStyle, number[][]> = {
  mixed: [
    [0, 3, 4, 4],
    [0, 5, 3, 4],
    [0, 5, 1, 4],
    [0, 1, 4, 4],
  ],
  classical: [
    [0, 3, 4, 4],
    [0, 5, 1, 4],
    [0, 3, 4, 4],
    [0, 5, 3, 4],
  ],
  pop: [
    [0, 4, 5, 4],
    [0, 5, 3, 4],
    [0, 1, 4, 4],
    [0, 4, 1, 4],
  ],
  jazz: [
    [0, 5, 1, 4],
    [2, 5, 1, 4],
    [1, 4, 0, 4],
    [0, 1, 4, 4],
  ],
};

const MAJOR_FINALS: Record<MusicStyle, number[][]> = {
  mixed: [
    [0, 3, 4, 0],
    [0, 5, 4, 0],
    [0, 1, 4, 0],
  ],
  classical: [
    [0, 3, 4, 0],
    [0, 5, 4, 0],
    [0, 1, 4, 0],
  ],
  pop: [
    [0, 5, 4, 0],
    [0, 3, 4, 0],
    [0, 1, 4, 0],
    [0, 5, 4, 0],
  ],
  jazz: [
    [0, 5, 4, 0],
    [0, 1, 4, 0],
    [0, 3, 4, 0],
    [0, 5, 4, 0],
  ],
};

const MINOR_PHRASES: number[][] = [
  [0, 5, 2, 4],
  [0, 3, 6, 4],
  [0, 5, 6, 4],
  [0, 2, 5, 4],
];

const MINOR_FINALS: number[][] = [
  [0, 5, 4, 0],
  [0, 3, 4, 0],
  [0, 6, 4, 0],
  [0, 1, 4, 0],
];

export function chordIntervals(quality: ChordQuality): number[] {
  return QUALITY_INTERVALS[quality];
}

export function chordPcsFor(rootPc: number, quality: ChordQuality): number[] {
  return chordIntervals(quality).map((interval) => (rootPc + interval + 12) % 12);
}

export function makeChord(
  degree: number,
  rootPc: number,
  quality: ChordQuality,
  inversion: number,
  secondaryOf: number | null = null,
): ChordSpec {
  const intervals = chordIntervals(quality);
  const safeInversion = Math.min(Math.max(0, inversion), intervals.length - 1);
  return {
    degree,
    rootPc,
    quality,
    inversion: safeInversion,
    bassPc: (rootPc + intervals[safeInversion]) % 12,
    pcs: chordPcsFor(rootPc, quality),
    secondaryOf,
  };
}

export function chordAt(harmony: HarmonyEvent[], start: number): ChordSpec {
  let current = harmony[0];
  for (const event of harmony) {
    if (event.start <= start) current = event;
    else break;
  }
  return current.chord;
}

export function harmonyForMeasure(chord: ChordSpec, meter: Meter): HarmonyEvent[] {
  return [{ start: 0, duration: meter.ticks, chord }];
}

export interface MeasureHarmonyOptions {
  chords: ChordSpec[];
  rhythms: RhythmicEvent[][];
  meter: Meter;
  level: LevelDef;
  style: MusicStyle;
  rng: Rng;
}

function hasOnset(events: RhythmicEvent[], tick: number): boolean {
  let cursor = 0;
  for (const event of events) {
    if (cursor === tick) return true;
    if (cursor > tick) return false;
    cursor += event.ticks;
  }
  return cursor === tick;
}

function changeTickFor(meter: Meter): number {
  return meter.label === "2/4" ? PPQ : PPQ * 2;
}

export function makeMeasureHarmony(options: MeasureHarmonyOptions): HarmonyEvent[][] {
  const { chords, rhythms, meter, level, style, rng } = options;
  const rate = Math.min(0.85, level.harmony.changeRate * getStyle(style).harmonicRhythmBias);
  const changeTick = changeTickFor(meter);

  return chords.map((chord, index) => {
    if (rate <= 0 || index >= chords.length - 2) return harmonyForMeasure(chord, meter);
    const next = chords[index + 1];
    if (
      next.degree === chord.degree ||
      chord.secondaryOf !== null ||
      next.secondaryOf !== null ||
      !hasOnset(rhythms[index], changeTick) ||
      rng() >= rate
    ) {
      return harmonyForMeasure(chord, meter);
    }
    return [
      { start: 0, duration: changeTick, chord },
      { start: changeTick, duration: meter.ticks - changeTick, chord: next },
    ];
  });
}

function diatonicQuality(key: KeySpec, degree: number): ChordQuality {
  if (key.mode === "minor" && degree === 4) return "maj";
  const table = key.mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  return table[degree] ?? "maj";
}

function seventhQuality(
  key: KeySpec,
  degree: number,
  base: ChordQuality,
  isFinalTonic: boolean,
  isPhraseStart: boolean,
  level: LevelDef,
  style: MusicStyle,
  rng: Rng,
): ChordQuality {
  if (isFinalTonic || isPhraseStart) return base;
  const rate = level.harmony.seventhRate * getStyle(style).seventhBias;
  if (rate <= 0 || rng() >= rate) return base;
  if (degree === 4) return "dom7";
  if (degree === 1) return base === "dim" ? "halfDim7" : "min7";
  if (degree === 0) return key.mode === "major" ? "maj7" : "min7";
  if (degree === 3) return base === "min" ? "min7" : "maj7";
  if (degree === 5) return key.mode === "major" ? "min7" : "maj7";
  if (degree === 2) return key.mode === "major" ? "min7" : "maj7";
  if (degree === 6) return "halfDim7";
  return base;
}

function chooseDegrees(
  key: KeySpec,
  level: LevelDef,
  style: MusicStyle,
  phraseLength: number,
  cadence: CadenceType,
  isFirst: boolean,
  rng: Rng,
): number[] {
  if (phraseLength === 2) {
    if (cadence === "half") return style === "jazz" ? [1, 4] : [0, 4];
    if (cadence === "deceptive") return [4, 5];
    return [4, 0];
  }

  if (level.level <= 2) {
    if (cadence === "half") return [0, 4, 0, 4];
    if (cadence === "deceptive") return [0, 3, 4, 5];
    return [0, 3, 4, 0];
  }

  const isFinal = cadence === "perfectAuthentic";
  const templates =
    key.mode === "minor"
      ? isFinal
        ? MINOR_FINALS
        : MINOR_PHRASES
      : isFinal
        ? MAJOR_FINALS[style]
        : MAJOR_PHRASES[style];
  const degrees = [
    ...weightedPick(
      rng,
      templates.map((template, index) => ({ value: template, weight: index === 0 ? 1.4 : 1 })),
    ),
  ];

  if (isFinal) degrees[0] = 0;
  if (isFirst) degrees[0] = 0;

  const last = degrees.length - 1;
  if (cadence === "half") {
    degrees[last] = 4;
  } else {
    degrees[last - 1] = 4;
    degrees[last] = cadence === "deceptive" ? 5 : 0;
  }
  return degrees;
}

function nearestMidiForPc(pc: number, target: number, low: number, high: number): number {
  let best = low;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let midi = low; midi <= high; midi += 1) {
    if (midi % 12 !== pc) continue;
    const distance = Math.abs(midi - target);
    if (distance < bestDistance) {
      best = midi;
      bestDistance = distance;
    }
  }
  return best;
}

function chooseBassInversion(
  chord: ChordSpec,
  previousBass: number | null,
  level: LevelDef,
  style: MusicStyle,
  rootPosition: boolean,
  rng: Rng,
): ChordSpec {
  const intervals = chordIntervals(chord.quality);
  if (rootPosition || intervals.length < 2 || level.harmony.inversionRate <= 0) {
    return makeChord(chord.degree, chord.rootPc, chord.quality, 0, chord.secondaryOf);
  }
  if (rng() >= level.harmony.inversionRate * getStyle(style).inversionBias) {
    return makeChord(chord.degree, chord.rootPc, chord.quality, 0, chord.secondaryOf);
  }

  const maxInversion =
    level.level >= 9 ? intervals.length - 1 : level.level >= 5 ? Math.min(2, intervals.length - 1) : 1;
  const target = previousBass ?? 48;
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let inversion = 1; inversion <= maxInversion; inversion += 1) {
    const bassPc = (chord.rootPc + intervals[inversion]) % 12;
    const bass = nearestMidiForPc(bassPc, target, 42, 55);
    const movement = previousBass === null ? Math.abs(bass - 48) : Math.abs(bass - previousBass);
    const score = -movement * 0.8 + (inversion === 1 ? 0.7 : 0) + rng() * 0.9;
    if (score > bestScore) {
      best = inversion;
      bestScore = score;
    }
  }
  return makeChord(chord.degree, chord.rootPc, chord.quality, best, chord.secondaryOf);
}

export interface PhraseHarmonyOptions {
  key: KeySpec;
  level: LevelDef;
  style: MusicStyle;
  phraseLength: number;
  cadence: CadenceType;
  isFirst: boolean;
  rng: Rng;
}

export function makePhraseHarmony(options: PhraseHarmonyOptions): ChordSpec[] {
  const { key, level, style, phraseLength, cadence, isFirst, rng } = options;
  const isFinal = cadence === "perfectAuthentic";
  const degrees = chooseDegrees(key, level, style, phraseLength, cadence, isFirst, rng);
  const lastIndex = degrees.length - 1;
  const styleDef = getStyle(style);

  let chords = degrees.map((degree, index) => {
    let quality = diatonicQuality(key, degree);
    if (
      key.mode === "major" &&
      degree === 3 &&
      level.harmony.borrowedRate > 0 &&
      rng() < level.harmony.borrowedRate * styleDef.borrowedBias
    ) {
      quality = "min";
    }
    quality = seventhQuality(
      key,
      degree,
      quality,
      isFinal && index === lastIndex,
      index === 0,
      level,
      style,
      rng,
    );
    return makeChord(degree, key.degrees[degree].pc, quality, 0);
  });

  const secondaryRate = level.harmony.secondaryRate * styleDef.secondaryBias;
  let secondaries = 0;
  if (secondaryRate > 0) {
    for (let index = 2; index < chords.length; index += 1) {
      const target = chords[index].degree;
      if (![1, 3, 4, 5].includes(target)) continue;
      if (chords[index - 1].secondaryOf !== null) continue;
      if (index === lastIndex && cadence !== "half") continue;
      if (secondaries >= 2 || rng() >= secondaryRate) continue;
      const rootPc = (key.degrees[target].pc + 7) % 12;
      const quality: ChordQuality = level.level >= 8 && rng() < 0.6 ? "dom7" : "maj";
      chords[index - 1] = makeChord(target, rootPc, quality, 0, target);
      secondaries += 1;
    }
  }

  let previousBass: number | null = null;
  chords = chords.map((chord, index) => {
    const finalTonic = isFinal && index === lastIndex && chord.degree === 0;
    const finalDominant = isFinal && index === lastIndex - 1 && chord.degree === 4;
    const rootPosition = finalTonic || finalDominant;
    const voiced = chooseBassInversion(chord, previousBass, level, style, rootPosition, rng);
    const intervals = chordIntervals(voiced.quality);
    previousBass = nearestMidiForPc(
      (voiced.rootPc + intervals[voiced.inversion]) % 12,
      previousBass ?? 48,
      42,
      55,
    );
    return voiced;
  });

  return chords;
}
