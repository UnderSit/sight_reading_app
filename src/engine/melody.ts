import type {
  CadenceType,
  ChordSpec,
  HarmonyEvent,
  KeySpec,
  Meter,
  NoteEvent,
  PhraseRole,
} from "./types";
import { PPQ } from "./types";
import type { LevelDef } from "./difficulty";
import { chordAt } from "./harmony";
import { scalePcs } from "./theory";
import { copyRhythm, type RhythmicEvent } from "./rhythm";
import { pick, weightedPick, type Rng } from "./rng";

const RH_LOW = 60;

export interface MelodyState {
  prev: number | null;
  prevPrev: number | null;
  lastInterval: number | null;
}

export interface Motif {
  rhythm: RhythmicEvent[];
  firstPitch: number;
  offsets: (number | null)[];
}

export function createMelodyState(): MelodyState {
  return { prev: null, prevPrev: null, lastInterval: null };
}

export function cloneMelodyState(state: MelodyState): MelodyState {
  return { prev: state.prev, prevPrev: state.prevPrev, lastInterval: state.lastInterval };
}

const IDEA_SHAPES = [
  [0, 1, 2, 1, 3, 2, 1, 0],
  [0, 2, 1, 3, 2, 1, 0, -1],
  [0, 1, 0, 2, 1, 3, 2, 1],
  [0, -1, 1, 0, 2, 1, 0, -1],
  [0, 2, 3, 2, 1, 2, 1, 0],
];

const ANSWER_SHAPES = [
  [0, -1, -2, -1, 0, 1, -1, -2],
  [0, 1, -1, -2, -1, 0, 1, 0],
  [0, -2, -1, 0, -1, -2, -1, 0],
  [0, 1, 0, -1, -2, -1, 0, -1],
];

function highFor(level: LevelDef): number {
  return RH_LOW + level.rhSpan;
}

function isStrongBeat(start: number, meter: Meter): boolean {
  if (meter.label === "4/4") return start % (PPQ * 2) === 0;
  return start % meter.ticks === 0;
}

function midisForPcs(pcs: number[], low: number, high: number): number[] {
  const set = new Set(pcs);
  const result: number[] = [];
  for (let midi = low; midi <= high; midi += 1) {
    if (set.has(midi % 12)) result.push(midi);
  }
  return result;
}

function scaleMidis(key: KeySpec, low: number, high: number): number[] {
  const pcs = new Set(scalePcs(key));
  if (key.mode === "minor") pcs.add((key.tonicPc + 11) % 12);
  return midisForPcs([...pcs], low, high);
}

function nearestPitch(midis: number[], target: number): number {
  return midis.reduce((best, midi) =>
    Math.abs(midi - target) < Math.abs(best - target) ? midi : best,
  );
}

function nearestIndex(midis: number[], target: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  midis.forEach((midi, index) => {
    const distance = Math.abs(midi - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

interface PitchOptions {
  target: number;
  chord: ChordSpec;
  key: KeySpec;
  level: LevelDef;
  state: MelodyState;
  strong: boolean;
  forcedPcs: number[] | null;
  rng: Rng;
}

function scorePitch(candidate: number, options: PitchOptions): number {
  const { state, chord, level, strong, rng } = options;
  const chordPcs = new Set(chord.pcs);
  let score = -Math.abs(candidate - options.target) * 0.55;

  if (state.prev !== null) {
    const distance = Math.abs(candidate - state.prev);
    if (distance <= 2) score += 1.5 * level.melody.stepBias;
    if (distance === 0) score -= 2.4;
    if (distance > 2) score += 0.35 * level.melody.leapBias;

    if (state.lastInterval !== null && Math.abs(state.lastInterval) > 2) {
      const direction = Math.sign(candidate - state.prev);
      const previousDirection = Math.sign(state.lastInterval);
      if (direction !== 0 && direction === -previousDirection) score += 1.9;
      if (direction === previousDirection && distance > 2) score -= 2.3;
    }

    if (state.prevPrev !== null && candidate === state.prev && state.prev === state.prevPrev) {
      score -= 100;
    }
  }

  if (strong && chordPcs.has(candidate % 12)) score += 0.9;
  if (!strong && chordPcs.has(candidate % 12)) {
    score += (1 - level.melody.nonChordRate) * 0.8;
  }

  const high = highFor(level);
  const edge = Math.min(candidate - RH_LOW, high - candidate);
  if (edge < 2) score -= 0.6;
  return score + rng() * 1.2;
}

function choosePitch(options: PitchOptions): number {
  const { chord, key, level, state, strong, forcedPcs, rng } = options;
  const high = highFor(level);
  const scale = scaleMidis(key, RH_LOW, high);
  const chordMidis = midisForPcs(chord.pcs, RH_LOW, high);
  let pool: number[];

  if (forcedPcs !== null) {
    pool = midisForPcs(forcedPcs, RH_LOW, high);
  } else if (strong) {
    pool = chordMidis;
  } else {
    const combined = new Set([...scale, ...chordMidis]);
    pool = [...combined].sort((a, b) => a - b);
  }

  if (pool.length === 0) pool = scale;
  if (pool.length === 0) pool = chordMidis;
  if (pool.length === 0) return RH_LOW;

  if (state.prev !== null && forcedPcs === null) {
    const limited = pool.filter((midi) => Math.abs(midi - state.prev!) <= level.maxLeap);
    if (limited.length > 0) {
      pool = limited;
    } else {
      pool = [nearestPitch(pool, state.prev)];
    }
  }

  const scored = pool
    .map((candidate) => ({ candidate, score: scorePitch(candidate, options) }))
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(4, scored.length));
  return weightedPick(
    rng,
    top.map((item, index) => ({ value: item.candidate, weight: 1 / (index + 1) })),
  );
}

function pushNote(
  notes: NoteEvent[],
  state: MelodyState,
  start: number,
  duration: number,
  pitch: number | null,
): void {
  if (pitch === null) {
    notes.push({ start, duration, pitches: [] });
    state.lastInterval = null;
    return;
  }
  const previous = state.prev;
  notes.push({ start, duration, pitches: [pitch] });
  state.prevPrev = previous;
  state.prev = pitch;
  state.lastInterval = previous === null ? null : pitch - previous;
}

function firstPitch(
  chord: ChordSpec,
  key: KeySpec,
  level: LevelDef,
  state: MelodyState,
  rng: Rng,
): number {
  const high = highFor(level);
  const target = state.prev ?? RH_LOW + Math.min(7, (high - RH_LOW) / 2);
  return choosePitch({
    target,
    chord,
    key,
    level,
    state,
    strong: true,
    forcedPcs: null,
    rng,
  });
}

function generateIdeaBar(
  rhythm: RhythmicEvent[],
  harmony: HarmonyEvent[],
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  state: MelodyState,
  rng: Rng,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const shape = pick(rng, IDEA_SHAPES);
  let start = 0;
  let pitched = 0;
  let anchor: number | null = null;

  rhythm.forEach((event) => {
    if (event.rest) {
      pushNote(notes, state, start, event.ticks, null);
      start += event.ticks;
      return;
    }

    const chord = chordAt(harmony, start);
    let pitch: number;
    if (pitched === 0) {
      pitch = firstPitch(chord, key, level, state, rng);
      anchor = pitch;
    } else {
      const target = (anchor ?? RH_LOW) + shape[Math.min(pitched, shape.length - 1)] * 2;
      pitch = choosePitch({
        target,
        chord,
        key,
        level,
        state,
        strong: isStrongBeat(start, meter),
        forcedPcs: null,
        rng,
      });
    }
    pushNote(notes, state, start, event.ticks, pitch);
    pitched += 1;
    start += event.ticks;
  });

  return notes;
}

function generateContinuationBar(
  rhythm: RhythmicEvent[],
  harmony: HarmonyEvent[],
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  state: MelodyState,
  rng: Rng,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const shape = pick(rng, ANSWER_SHAPES);
  let start = 0;
  let pitched = 0;

  rhythm.forEach((event) => {
    if (event.rest) {
      pushNote(notes, state, start, event.ticks, null);
      start += event.ticks;
      return;
    }

    const chord = chordAt(harmony, start);
    const base = state.prev ?? RH_LOW + Math.min(7, level.rhSpan / 2);
    const target = base + shape[Math.min(pitched, shape.length - 1)] * 2;
    const pitch = choosePitch({
      target,
      chord,
      key,
      level,
      state,
      strong: isStrongBeat(start, meter),
      forcedPcs: null,
      rng,
    });
    pushNote(notes, state, start, event.ticks, pitch);
    pitched += 1;
    start += event.ticks;
  });

  return notes;
}

export function extractMotif(
  notes: NoteEvent[],
  rhythm: RhythmicEvent[],
  key: KeySpec,
  level: LevelDef,
): Motif | null {
  const high = highFor(level);
  const scale = scaleMidis(key, RH_LOW - 12, high + 12);
  const first = notes.find((note) => note.pitches.length > 0);
  if (first === undefined || scale.length === 0) return null;
  const firstPitch = Math.max(...first.pitches);
  const firstIndex = nearestIndex(scale, firstPitch);
  const offsets = notes.map((note) =>
    note.pitches.length === 0
      ? null
      : nearestIndex(scale, Math.max(...note.pitches)) - firstIndex,
  );
  return {
    rhythm: copyRhythm(rhythm),
    firstPitch,
    offsets,
  };
}

function sequenceBar(
  motif: Motif,
  rhythm: RhythmicEvent[],
  harmony: HarmonyEvent[],
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  state: MelodyState,
  rng: Rng,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const high = highFor(level);
  const scale = scaleMidis(key, RH_LOW, high);
  const anchor = nearestPitch(scale, motif.firstPitch);
  const anchorIndex = nearestIndex(scale, anchor);
  const shouldSequence = level.melody.sequence > 0 && rng() < level.melody.sequence;
  const shift = shouldSequence ? pick(rng, [-2, -1, 1, 2]) : 0;
  let start = 0;

  rhythm.forEach((event, index) => {
    if (event.rest) {
      pushNote(notes, state, start, event.ticks, null);
      start += event.ticks;
      return;
    }

    const chord = chordAt(harmony, start);
    const offset = motif.offsets[index];
    let target = state.prev ?? motif.firstPitch;
    if (offset !== null && offset !== undefined && scale.length > 0) {
      const targetIndex = Math.min(
        scale.length - 1,
        Math.max(0, anchorIndex + offset + shift),
      );
      target = scale[targetIndex];
    }

    const pitch = choosePitch({
      target,
      chord,
      key,
      level,
      state,
      strong: isStrongBeat(start, meter),
      forcedPcs: null,
      rng,
    });
    pushNote(notes, state, start, event.ticks, pitch);
    start += event.ticks;
  });

  return notes;
}

function recapBar(
  rhythm: RhythmicEvent[],
  harmony: HarmonyEvent[],
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  state: MelodyState,
  rng: Rng,
  motif: Motif,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const high = highFor(level);
  const scale = scaleMidis(key, RH_LOW - 12, high + 12);
  const openingChord = chordAt(harmony, 0);
  const chordMidis = midisForPcs(openingChord.pcs, RH_LOW, high);
  const desired = nearestPitch(chordMidis.length > 0 ? chordMidis : scale, motif.firstPitch);
  let base = desired;
  if (state.prev !== null && Math.abs(base - state.prev) > level.maxLeap) {
    const close = chordMidis.filter((midi) => Math.abs(midi - state.prev!) <= level.maxLeap);
    if (close.length > 0) base = nearestPitch(close, desired);
  }
  const baseIndex = nearestIndex(scale, base);
  let start = 0;
  let firstPitched = true;

  rhythm.forEach((event, index) => {
    if (event.rest) {
      pushNote(notes, state, start, event.ticks, null);
      start += event.ticks;
      return;
    }

    const chord = chordAt(harmony, start);
    const offset = motif.offsets[index] ?? 0;
    const targetIndex = Math.min(scale.length - 1, Math.max(0, baseIndex + offset));
    const target = firstPitched ? base : scale[targetIndex];
    firstPitched = false;
    const strong = isStrongBeat(start, meter);
    const pitch =
      target >= RH_LOW &&
      target <= high &&
      (state.prev === null || Math.abs(target - state.prev) <= level.maxLeap) &&
      (!strong || chord.pcs.includes(target % 12))
        ? target
        : choosePitch({
            target,
            chord,
            key,
            level,
            state,
            strong,
            forcedPcs: null,
            rng,
          });
    pushNote(notes, state, start, event.ticks, pitch);
    start += event.ticks;
  });

  return notes;
}

function cadenceBar(
  rhythm: RhythmicEvent[],
  harmony: HarmonyEvent[],
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  cadence: CadenceType,
  state: MelodyState,
  rng: Rng,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const high = highFor(level);
  const cadenceChord = harmony[harmony.length - 1].chord;
  let fixedPcs = cadenceChord.pcs;
  if (cadence === "perfectAuthentic") {
    fixedPcs = [key.tonicPc];
  } else if (cadence === "imperfectAuthentic") {
    const nonTonic = cadenceChord.pcs.filter((pc) => pc !== key.tonicPc);
    if (nonTonic.length > 0) fixedPcs = nonTonic;
  }
  const fixed = midisForPcs(fixedPcs, RH_LOW, high);
  const center = RH_LOW + Math.min(7, (high - RH_LOW) / 2);
  const finalPitch = fixed.length > 0 ? nearestPitch(fixed, center) : RH_LOW;
  const pitchedCount = rhythm.filter((event) => !event.rest).length;
  const leadingMidis = midisForPcs([(key.tonicPc + 11) % 12], RH_LOW, high);
  let start = 0;
  let pitched = 0;

  rhythm.forEach((event) => {
    if (event.rest) {
      pushNote(notes, state, start, event.ticks, null);
      start += event.ticks;
      return;
    }

    const chord = chordAt(harmony, start);
    const remaining = pitchedCount - pitched - 1;
    const isFinal = remaining === 0;
    const strong = isStrongBeat(start, meter);
    const target = finalPitch + Math.min(remaining * 2, 10);
    let pitch: number;

    if (isFinal && cadence === "perfectAuthentic") {
      pitch = finalPitch;
    } else if (isFinal) {
      const chordMidis = midisForPcs(cadenceChord.pcs, RH_LOW, high);
      const close = chordMidis.filter(
        (midi) => state.prev === null || Math.abs(midi - state.prev) <= level.maxLeap,
      );
      pitch = nearestPitch(close.length > 0 ? close : chordMidis, target);
    } else if (
      cadence === "perfectAuthentic" &&
      pitched === pitchedCount - 2 &&
      !strong &&
      leadingMidis.length > 0
    ) {
      const close = leadingMidis.filter(
        (midi) => state.prev === null || Math.abs(midi - state.prev) <= level.maxLeap,
      );
      pitch =
        close.length > 0
          ? nearestPitch(close, target)
          : choosePitch({
              target,
              chord,
              key,
              level,
              state,
              strong,
              forcedPcs: null,
              rng,
            });
    } else {
      pitch = choosePitch({
        target,
        chord,
        key,
        level,
        state,
        strong,
        forcedPcs: null,
        rng,
      });
    }
    pushNote(notes, state, start, event.ticks, pitch);
    pitched += 1;
    start += event.ticks;
  });

  return notes;
}

export interface PhraseMelodyOptions {
  rhythms: RhythmicEvent[][];
  harmony: HarmonyEvent[][];
  key: KeySpec;
  meter: Meter;
  level: LevelDef;
  role: PhraseRole;
  cadence: CadenceType;
  state: MelodyState;
  rng: Rng;
  motif?: Motif | null;
}

export function generatePhraseMelody(options: PhraseMelodyOptions): NoteEvent[][] {
  const { rhythms, harmony, key, meter, level, role, cadence, state, rng, motif } = options;
  if (rhythms.length === 2) {
    const first =
      role === "final" && motif
        ? recapBar(rhythms[0], harmony[0], key, meter, level, state, rng, motif)
        : generateIdeaBar(rhythms[0], harmony[0], key, meter, level, state, rng);
    return [
      first,
      cadenceBar(rhythms[1], harmony[1], key, meter, level, cadence, state, rng),
    ];
  }

  const first =
    role === "final" && motif
      ? recapBar(rhythms[0], harmony[0], key, meter, level, state, rng, motif)
      : generateIdeaBar(rhythms[0], harmony[0], key, meter, level, state, rng);
  const second = generateContinuationBar(rhythms[1], harmony[1], key, meter, level, state, rng);
  const phraseMotif = extractMotif(first, rhythms[0], key, level);
  const third = phraseMotif
    ? sequenceBar(phraseMotif, rhythms[2], harmony[2], key, meter, level, state, rng)
    : generateContinuationBar(rhythms[2], harmony[2], key, meter, level, state, rng);
  const fourth = cadenceBar(rhythms[3], harmony[3], key, meter, level, cadence, state, rng);
  return [first, second, third, fourth];
}
