import type {
  CadenceType,
  Exercise,
  HarmonyEvent,
  KeySpec,
  LhPatternId,
  Measure,
  Meter,
  MeterLabel,
  MusicStyle,
  NoteEvent,
  PhraseRole,
} from "./types";
import { METERS, PPQ } from "./types";
import { getKey } from "./theory";
import { getLevel, type LevelDef } from "./difficulty";
import { getStyle } from "./style";
import {
  copyRhythm,
  makePhraseRhythm,
  type RhythmicEvent,
} from "./rhythm";
import { chordAt, makeMeasureHarmony, makePhraseHarmony } from "./harmony";
import {
  cloneMelodyState,
  createMelodyState,
  extractMotif,
  generatePhraseMelody,
  type MelodyState,
  type Motif,
} from "./melody";
import { generateAccompanimentMeasure } from "./accompaniment";
import { chooseInnerVoices } from "./voiceLeading";
import { mixSeed, mulberry32, pick, weightedPick, type Rng, type Weighted } from "./rng";

const RH_LOW = 60;
const RH_HARMONY_MIN_LEVEL = 3;
const RH_HARMONY_MIN_DURATION = 480;
const VALID_MEASURES = [2, 4, 8, 12, 16];

export interface GenerateOptions {
  seed: number;
  difficulty: number;
  measures: number;
  keyId: string;
  meter: MeterLabel | "auto";
  style?: MusicStyle;
}

interface PhrasePlan {
  role: PhraseRole;
  cadence: CadenceType;
  harmony: HarmonyEvent[][];
  rhythms: RhythmicEvent[][];
  pattern: LhPatternId;
}

interface PhraseCandidate {
  melody: NoteEvent[][];
  state: MelodyState;
  score: number;
}

interface PitchedEvent {
  note: NoteEvent;
  bar: number;
  pitch: number;
}

function phraseLengths(total: number): number[] {
  if (total === 2) return [2];
  const lengths: number[] = [];
  let remaining = total;
  while (remaining >= 4) {
    lengths.push(4);
    remaining -= 4;
  }
  if (remaining === 2) lengths.push(2);
  return lengths;
}

function phraseRoles(count: number): PhraseRole[] {
  if (count <= 1) return ["final"];
  if (count === 2) return ["opening", "final"];
  if (count === 3) return ["opening", "continuation", "final"];
  return ["opening", "continuation", "development", "final"];
}

function cadenceForRole(role: PhraseRole, phraseCount: number, level: LevelDef): CadenceType {
  if (role === "final") return "perfectAuthentic";
  if (role === "opening") return "half";
  if (role === "continuation") {
    return level.level >= 3 && phraseCount === 3 ? "deceptive" : "imperfectAuthentic";
  }
  return level.level >= 3 ? "deceptive" : "half";
}

function harmonizeMelody(
  notes: NoteEvent[],
  harmony: HarmonyEvent[],
  level: LevelDef,
  style: MusicStyle,
  cadence: "mid" | "final" | null,
  rng: Rng,
  voicing: { previous: number[] | null },
): NoteEvent[] {
  if (level.level < RH_HARMONY_MIN_LEVEL) return notes;
  const styleDef = getStyle(style);
  const maxPerMeasure = level.level >= 8 ? 2 : 1;
  const chance = Math.min(0.85, level.texture.rhHarmonyRate * styleDef.rhHarmonyBias);
  if (chance <= 0) return notes;
  let lastPitchedIndex = -1;
  notes.forEach((note, index) => {
    if (note.pitches.length > 0) lastPitchedIndex = index;
  });

  let harmonized = 0;
  return notes.map((note, index) => {
    if (note.pitches.length === 0) return note;
    const forcedFinal = cadence === "final" && index === lastPitchedIndex;
    if (harmonized >= maxPerMeasure && !forcedFinal) return note;
    const onBeat = level.level >= 8 ? note.start % PPQ === 0 : note.start % (PPQ * 2) === 0;
    if (!forcedFinal && (!onBeat || note.duration < RH_HARMONY_MIN_DURATION)) return note;
    if (!forcedFinal && rng() >= chance) return note;

    const melody = Math.max(...note.pitches);
    let voices = 1;
    if (level.level >= 8) {
      const triadChance = level.texture.rhTriadChance * styleDef.rhTriadChance;
      if (forcedFinal || (note.duration >= 960 && rng() < triadChance)) voices = 2;
    }

    const choice = chooseInnerVoices({
      melody,
      chordPcs: chordAt(harmony, note.start).pcs,
      previous: voicing.previous,
      voices,
      final: forcedFinal,
    });
    if (choice === null) return note;

    harmonized += 1;
    voicing.previous = [...choice.lower, melody];
    return {
      ...note,
      pitches: [...choice.lower, melody],
    };
  });
}

function ensureSomeRightHandHarmony(measures: Measure[]): void {
  for (const measure of measures) {
    const ordered = [
      ...measure.rh.filter(
        (note) => note.start % PPQ === 0 && note.duration >= RH_HARMONY_MIN_DURATION,
      ),
      ...measure.rh,
    ];
    for (const note of ordered) {
      if (note.pitches.length === 0) continue;
      const melody = Math.max(...note.pitches);
      const choice = chooseInnerVoices({
        melody,
        chordPcs: chordAt(measure.harmony, note.start).pcs,
        previous: null,
        voices: 1,
        final: false,
      });
      if (choice === null) continue;
      note.pitches = [...choice.lower, melody];
      return;
    }
  }
}

const TIE_DURATIONS = new Set([1920, 1440, 960, 720, 480, 360, 240, 120]);

function splitSustainedNotes(
  rh: NoteEvent[],
  harmony: HarmonyEvent[],
  meter: Meter,
): NoteEvent[] {
  const midpoint = meter.ticks / 2;
  return rh.flatMap((note) => {
    if (
      note.pitches.length !== 1 ||
      note.tieStart ||
      note.tieEnd ||
      note.start <= 0 ||
      note.start >= midpoint ||
      note.start + note.duration <= midpoint ||
      note.start + note.duration >= meter.ticks ||
      !chordAt(harmony, midpoint).pcs.includes(note.pitches[0] % 12)
    ) {
      return [note];
    }
    const first = midpoint - note.start;
    const second = note.duration - first;
    if (
      !TIE_DURATIONS.has(first) ||
      !TIE_DURATIONS.has(second) ||
      first < 240 ||
      second < 240
    ) {
      return [note];
    }
    return [
      { ...note, duration: first, tieStart: true },
      { ...note, start: midpoint, duration: second, tieEnd: true },
    ];
  });
}

function tieAcrossBars(measures: Measure[], meter: Meter): void {
  for (let index = 0; index < measures.length - 1; index += 1) {
    const current = measures[index].rh[measures[index].rh.length - 1];
    const next = measures[index + 1].rh[0];
    if (
      !current ||
      !next ||
      current.pitches.length !== 1 ||
      next.pitches.length !== 1 ||
      current.tieStart ||
      current.tieEnd ||
      next.tieStart ||
      next.tieEnd ||
      current.start + current.duration !== meter.ticks ||
      next.start !== 0 ||
      current.pitches[0] !== next.pitches[0]
    ) {
      continue;
    }
    const nextChord = chordAt(measures[index + 1].harmony, 0);
    if (!nextChord.pcs.includes(next.pitches[0] % 12)) continue;
    current.tieStart = true;
    next.tieEnd = true;
  }
}

function applyTies(measures: Measure[], meter: Meter): void {
  for (const measure of measures) {
    measure.rh = splitSustainedNotes(measure.rh, measure.harmony, meter);
  }
  tieAcrossBars(measures, meter);
}

function patternCandidates(
  level: LevelDef,
  style: MusicStyle,
  meter: Meter,
): Weighted<LhPatternId>[] {
  const weights = getStyle(style).lhWeights;
  const candidates = level.lhPatterns
    .filter((pattern) => pattern !== "waltz" || meter.label === "3/4")
    .map((value) => ({ value, weight: weights[value] }))
    .filter((candidate) => candidate.weight > 0);
  return candidates.length > 0 ? candidates : [{ value: "block", weight: 1 }];
}

function choosePatterns(
  candidates: Weighted<LhPatternId>[],
  phraseCount: number,
  rng: Rng,
): { primary: LhPatternId; secondary: LhPatternId } {
  const primary = weightedPick(rng, candidates);
  if (phraseCount < 2) return { primary, secondary: primary };
  const alternatives = candidates.filter((candidate) => candidate.value !== primary);
  const secondary = alternatives.length > 0 ? weightedPick(rng, alternatives) : primary;
  return { primary, secondary };
}

function buildPhrasePlans(
  phrases: number[],
  level: LevelDef,
  style: MusicStyle,
  meter: Meter,
  key: KeySpec,
  patterns: { primary: LhPatternId; secondary: LhPatternId },
  rng: Rng,
): PhrasePlan[] {
  const roles = phraseRoles(phrases.length);
  const cadences = roles.map((role) => cadenceForRole(role, phrases.length, level));
  let openingRhythm: [RhythmicEvent[], RhythmicEvent[]] | undefined;
  return phrases.map((length, phraseIndex) => {
    const role = roles[phraseIndex];
    const cadence = cadences[phraseIndex];
    const isFinal = role === "final";
    const pattern = phraseIndex % 2 === 0 ? patterns.primary : patterns.secondary;
    const chords = makePhraseHarmony({
      key,
      level,
      style,
      phraseLength: length,
      cadence,
      isFirst: phraseIndex === 0,
      rng,
    });
    const reuse = isFinal && length === 4 ? openingRhythm : undefined;
    const rhythms = makePhraseRhythm(level, meter, style, rng, length, isFinal, reuse);
    if (role === "opening" && length === 4) {
      openingRhythm = [copyRhythm(rhythms[0]), copyRhythm(rhythms[1])];
    }
    const harmony = makeMeasureHarmony({ chords, rhythms, meter, level, style, rng });
    return { role, cadence, harmony, rhythms, pattern };
  });
}

function isStrongBeat(start: number, meter: Meter): boolean {
  if (meter.label === "4/4") return start % (PPQ * 2) === 0;
  return start % meter.ticks === 0;
}

function bassContinuity(plan: PhrasePlan, meter: Meter, previousBass: number | null): number {
  let bass = previousBass;
  let score = 0;
  for (const harmony of plan.harmony) {
    const accompaniment = generateAccompanimentMeasure(plan.pattern, harmony, meter, bass);
    if (bass !== null) {
      const movement = Math.abs(accompaniment.bass - bass);
      if (movement <= 2) score += 0.35;
      else if (movement > 7) score -= (movement - 7) * 0.3;
      if (movement === 0) score -= 0.4;
    }
    bass = accompaniment.bass;
  }
  return score;
}

function scoreCandidate(
  melody: NoteEvent[][],
  plan: PhrasePlan,
  before: MelodyState,
  openingMotif: Motif | null,
  key: KeySpec,
  meter: Meter,
  level: LevelDef,
  bassScore: number,
): number {
  const events: PitchedEvent[] = [];
  melody.forEach((bar, barIndex) => {
    for (const note of bar) {
      if (note.pitches.length > 0) {
        events.push({ note, bar: barIndex, pitch: Math.max(...note.pitches) });
      }
    }
  });
  if (events.length === 0) return Number.NEGATIVE_INFINITY;

  let score = bassScore;
  let previous = before.prev;
  let lastInterval = before.lastInterval;
  let lastDirection = before.lastInterval === null ? 0 : Math.sign(before.lastInterval);
  let directionChanges = 0;
  const distinct = new Set<number>();
  const high = RH_LOW + level.rhSpan;
  const center = RH_LOW + level.rhSpan / 2;

  for (const event of events) {
    const chord = chordAt(plan.harmony[event.bar], event.note.start);
    const strong = isStrongBeat(event.note.start, meter);
    distinct.add(event.pitch);
    score -= Math.abs(event.pitch - center) * 0.03;
    if (strong) {
      score += chord.pcs.includes(event.pitch % 12) ? 2 : -4;
    } else if (chord.pcs.includes(event.pitch % 12)) {
      score += 0.3;
    }
    if (event.pitch <= RH_LOW + 1 || event.pitch >= high - 1) score -= 0.5;

    if (previous !== null) {
      const interval = event.pitch - previous;
      const distance = Math.abs(interval);
      if (distance <= 2) score += 1.2;
      else if (distance <= 4) score += 0.4;
      if (distance === 0) score -= 2.6;
      if (distance > level.maxLeap) score -= 6;
      if (lastInterval !== null && Math.abs(lastInterval) > 2) {
        if (Math.sign(interval) === -Math.sign(lastInterval)) score += 1.5;
        else if (distance > 2) score -= 1.3;
      }
      const direction = Math.sign(interval);
      if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) {
        directionChanges += 1;
        score += 0.45;
      }
      if (direction !== 0) lastDirection = direction;
      lastInterval = interval;
    }
    previous = event.pitch;
  }

  score += Math.min(3, directionChanges) * 0.3;
  score += Math.min(6, distinct.size) * 0.25;

  if (openingMotif !== null && plan.role === "final" && melody[0]) {
    const recalled = extractMotif(melody[0], plan.rhythms[0], key, level);
    if (recalled !== null) {
      let matches = 0;
      let total = 0;
      openingMotif.offsets.forEach((offset, index) => {
        const other = recalled.offsets[index];
        if (offset !== null && other !== null && other !== undefined) {
          total += 1;
          if (offset === other) matches += 1;
        }
      });
      if (total > 0) score += (matches / total) * 8;
      if (recalled.firstPitch === openingMotif.firstPitch) score += 1;
    }
  }

  const lastEvent = events[events.length - 1];
  const lastHarmony = plan.harmony[plan.harmony.length - 1];
  const finalChord = lastHarmony[lastHarmony.length - 1].chord;
  if (finalChord.pcs.includes(lastEvent.pitch % 12)) score += 1.2;
  else score -= 2;
  if (plan.cadence === "perfectAuthentic" && lastEvent.pitch % 12 === key.tonicPc) {
    score += 3;
  }
  if (lastEvent.note.duration >= 960) score += 0.6;
  if (events.length >= 2) {
    const penultimate = events[events.length - 2];
    if (Math.abs(lastEvent.pitch - penultimate.pitch) <= 2) score += 1.4;
    if (
      plan.cadence === "perfectAuthentic" &&
      penultimate.pitch % 12 === (key.tonicPc + 11) % 12
    ) {
      score += 2.5;
    }
  }

  return score;
}

export function generateExercise(options: GenerateOptions): Exercise {
  const level = getLevel(options.difficulty);
  const style = options.style ?? "mixed";
  const measureCount = VALID_MEASURES.includes(options.measures) ? options.measures : 8;
  const rng = mulberry32(options.seed);

  const key = options.keyId === "auto" ? getKey(pick(rng, level.keyIds)) : getKey(options.keyId);
  const meterLabel: MeterLabel =
    options.meter === "auto"
      ? weightedPick(
          rng,
          level.meters.map((label) => ({
            value: label,
            weight: label === "4/4" ? 3 : label === "3/4" ? 2 : 1,
          })),
        )
      : options.meter;
  const meter = METERS[meterLabel];

  const phrases = phraseLengths(measureCount);
  const patterns = choosePatterns(patternCandidates(level, style, meter), phrases.length, rng);
  const plans = buildPhrasePlans(phrases, level, style, meter, key, patterns, rng);
  let melodyState: MelodyState = createMelodyState();
  let openingMotif: Motif | null = null;
  const measures: Measure[] = [];
  const degrees: number[] = [];
  const lhPatterns: LhPatternId[] = [];
  const phraseEnds: number[] = [];
  const phraseRoleList: PhraseRole[] = [];
  const phraseCadenceList: CadenceType[] = [];
  const rhVoicing: { previous: number[] | null } = { previous: null };
  let previousBass: number | null = null;

  plans.forEach((plan, phraseIndex) => {
    const bassScore = bassContinuity(plan, meter, previousBass);
    const candidateCount = level.level >= 7 ? 4 : 3;
    let best: PhraseCandidate | null = null;

    for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
      const state = cloneMelodyState(melodyState);
      const candidateRng = mulberry32(
        mixSeed(options.seed, phraseIndex, candidateIndex, plan.harmony.length),
      );
      const melody = generatePhraseMelody({
        rhythms: plan.rhythms,
        harmony: plan.harmony,
        key,
        meter,
        level,
        role: plan.role,
        cadence: plan.cadence,
        state,
        rng: candidateRng,
        motif: plan.role === "final" ? openingMotif : null,
      });
      const score = scoreCandidate(
        melody,
        plan,
        melodyState,
        openingMotif,
        key,
        meter,
        level,
        bassScore,
      );
      if (best === null || score > best.score) {
        best = { melody, state, score };
      }
    }

    if (best === null) {
      throw new Error("No melody candidates were generated");
    }

    if (plan.role === "opening") {
      openingMotif = extractMotif(best.melody[0], plan.rhythms[0], key, level);
    }
    melodyState = best.state;

    plan.harmony.forEach((harmony, offset) => {
      const cadence =
        offset === plan.harmony.length - 1
          ? plan.cadence === "perfectAuthentic"
            ? "final"
            : "mid"
          : null;
      const accompaniment = generateAccompanimentMeasure(
        plan.pattern,
        harmony,
        meter,
        previousBass,
      );
      previousBass = accompaniment.bass;
      measures.push({
        rh: harmonizeMelody(best.melody[offset], harmony, level, style, cadence, rng, rhVoicing),
        lh: accompaniment.notes,
        harmony,
      });
      degrees.push(harmony[0].chord.degree);
      lhPatterns.push(plan.pattern);
    });
    phraseEnds.push(measures.length - 1);
    phraseRoleList.push(plan.role);
    phraseCadenceList.push(plan.cadence);
  });

  if (
    level.level >= RH_HARMONY_MIN_LEVEL &&
    !measures.some((measure) => measure.rh.some((note) => note.pitches.length > 1))
  ) {
    ensureSomeRightHandHarmony(measures);
  }

  applyTies(measures, meter);

  return {
    seed: options.seed,
    level: level.level,
    style,
    key,
    meter,
    measures,
    degrees,
    phraseEnds,
    phraseRoles: phraseRoleList,
    phraseCadences: phraseCadenceList,
    lhPatterns,
  };
}
