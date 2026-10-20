import type { ChordSpec, HarmonyEvent, LhPatternId, Meter, NoteEvent } from "./types";
import { METERS, PPQ } from "./types";
import { chordIntervals } from "./harmony";

const LH_LOW = 42;
const LH_HIGH = 60;

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

function toneAbove(bass: number, pc: number, fallback: number): number {
  for (let midi = bass + 1; midi <= LH_HIGH; midi += 1) {
    if (midi % 12 === pc) return midi;
  }
  return nearestMidiForPc(pc, fallback, LH_LOW, LH_HIGH);
}

function closeVoicing(bass: number, chord: ChordSpec): number[] {
  const remaining = new Set(chord.pcs.filter((pc) => pc !== bass % 12));
  const voicing = [bass];
  for (let midi = bass + 1; midi <= LH_HIGH && remaining.size > 0; midi += 1) {
    const pc = midi % 12;
    if (remaining.has(pc)) {
      voicing.push(midi);
      remaining.delete(pc);
    }
  }
  return voicing;
}

function chordTones(bass: number, chord: ChordSpec) {
  const intervals = chordIntervals(chord.quality);
  const rootPc = chord.rootPc;
  const thirdPc = (rootPc + intervals[1]) % 12;
  const fifthPc = (rootPc + intervals[2]) % 12;
  const root = nearestMidiForPc(rootPc, bass + 3, LH_LOW, LH_HIGH);
  const third = toneAbove(bass, thirdPc, root + 4);
  const fifth = toneAbove(bass, fifthPc, root + 7);
  return { root, third, fifth };
}

function at(start: number, duration: number, pitches: number[]): NoteEvent {
  return { start, duration, pitches };
}

export interface AccompanimentResult {
  notes: NoteEvent[];
  bass: number;
}

export function generateAccompaniment(
  pattern: LhPatternId,
  chord: ChordSpec,
  meter: Meter,
  previousBass: number | null,
): AccompanimentResult {
  const densePattern = pattern === "block" || pattern === "waltz" || pattern === "stride";
  const bassCeiling = densePattern ? 52 : 55;
  const targetBass = previousBass ?? 48;
  let bass = nearestMidiForPc(chord.bassPc, targetBass, LH_LOW, LH_HIGH);
  if (bass > bassCeiling && bass - 12 >= LH_LOW) bass -= 12;
  if (bass < LH_LOW) bass += 12;

  const voicing = closeVoicing(bass, chord);
  const { root, third, fifth } = chordTones(bass, chord);
  const upper = voicing.filter((pitch) => pitch !== bass).slice(0, 3);
  const triad = [bass, ...upper];
  const open = [bass, fifth === bass ? root : fifth].sort((a, b) => a - b);
  if (pattern === "waltz" && meter.label !== "3/4") pattern = "block";

  let notes: NoteEvent[];
  switch (pattern) {
    case "rootWhole":
      notes = [at(0, meter.ticks, [bass])];
      break;
    case "rootHalf":
      if (meter.label === "4/4") notes = [at(0, 960, [bass]), at(960, 960, [bass])];
      else if (meter.label === "3/4") notes = [at(0, 960, [bass]), at(960, 480, [bass])];
      else notes = [at(0, 480, [bass]), at(480, 480, [bass])];
      break;
    case "rootFifth":
      if (meter.label === "4/4") notes = [at(0, 960, [bass]), at(960, 960, [fifth])];
      else if (meter.label === "3/4") notes = [at(0, 960, [bass]), at(960, 480, [fifth])];
      else notes = [at(0, 480, [bass]), at(480, 480, [fifth])];
      break;
    case "block":
      if (meter.label === "4/4") notes = [at(0, 960, triad), at(960, 960, triad)];
      else if (meter.label === "3/4") notes = [at(0, 960, triad), at(960, 480, triad)];
      else notes = [at(0, 960, triad)];
      break;
    case "broken":
      if (meter.label === "4/4") {
        notes = [at(0, 480, [bass]), at(480, 480, [fifth]), at(960, 480, [third]), at(1440, 480, [fifth])];
      } else if (meter.label === "3/4") {
        notes = [at(0, 480, [bass]), at(480, 480, [fifth]), at(960, 480, [third])];
      } else {
        notes = [at(0, 480, [bass]), at(480, 480, [fifth])];
      }
      break;
    case "alberti": {
      const order =
        meter.label === "4/4"
          ? [bass, fifth, third, fifth, bass, fifth, third, fifth]
          : meter.label === "3/4"
            ? [bass, fifth, third, fifth, third, fifth]
            : [bass, fifth, third, fifth];
      notes = order.map((pitch, index) => at(index * 240, 240, [pitch]));
      break;
    }
    case "waltz":
      notes = [at(0, 480, [bass]), at(480, 480, upper), at(960, 480, upper)];
      break;
    case "arpeggio": {
      if (meter.label === "4/4") {
        const contour = [bass, third, fifth, third, bass, third, fifth, third];
        notes = contour.map((pitch, index) => at(index * 240, 240, [pitch]));
      } else if (meter.label === "3/4") {
        notes = [at(0, 480, [bass]), at(480, 480, [third]), at(960, 480, [fifth])];
      } else {
        const contour = [bass, third, fifth, third];
        notes = contour.map((pitch, index) => at(index * 240, 240, [pitch]));
      }
      break;
    }
    case "openFifths":
      if (meter.label === "4/4") notes = [at(0, 960, open), at(960, 960, open)];
      else if (meter.label === "3/4") notes = [at(0, 960, open), at(960, 480, open)];
      else notes = [at(0, meter.ticks, open)];
      break;
    case "stride":
      if (meter.label === "4/4") {
        notes = [at(0, 480, [bass]), at(480, 480, triad), at(960, 480, [bass]), at(1440, 480, triad)];
      } else if (meter.label === "3/4") {
        notes = [at(0, 480, [bass]), at(480, 480, triad), at(960, 480, triad)];
      } else {
        notes = [at(0, 480, [bass]), at(480, 480, triad)];
      }
      break;
  }

  return { notes, bass };
}

function generateBeatAccompaniment(
  pattern: LhPatternId,
  chord: ChordSpec,
  previousBass: number | null,
): AccompanimentResult {
  const densePattern = pattern === "block" || pattern === "waltz" || pattern === "stride";
  const bassCeiling = densePattern ? 52 : 55;
  const targetBass = previousBass ?? 48;
  let bass = nearestMidiForPc(chord.bassPc, targetBass, LH_LOW, LH_HIGH);
  if (bass > bassCeiling && bass - 12 >= LH_LOW) bass -= 12;
  if (bass < LH_LOW) bass += 12;

  const voicing = closeVoicing(bass, chord);
  const { root, third, fifth } = chordTones(bass, chord);
  const upper = voicing.filter((pitch) => pitch !== bass).slice(0, 3);
  const triad = [bass, ...upper];
  const open = [bass, fifth === bass ? root : fifth].sort((a, b) => a - b);

  let notes: NoteEvent[];
  switch (pattern) {
    case "rootWhole":
    case "rootHalf":
      notes = [at(0, PPQ, [bass])];
      break;
    case "rootFifth":
      notes = [at(0, PPQ / 2, [bass]), at(PPQ / 2, PPQ / 2, [fifth])];
      break;
    case "block":
      notes = [at(0, PPQ, triad)];
      break;
    case "broken":
      notes = [at(0, PPQ / 2, [bass]), at(PPQ / 2, PPQ / 2, [fifth])];
      break;
    case "alberti":
      notes = [at(0, PPQ / 2, [bass]), at(PPQ / 2, PPQ / 2, [fifth])];
      break;
    case "waltz":
      notes = [at(0, PPQ, triad)];
      break;
    case "arpeggio":
      notes = [at(0, PPQ / 2, [bass]), at(PPQ / 2, PPQ / 2, [third])];
      break;
    case "openFifths":
      notes = [at(0, PPQ, open)];
      break;
    case "stride":
      notes = [at(0, PPQ, [bass])];
      break;
  }

  return { notes, bass };
}

export function generateAccompanimentMeasure(
  pattern: LhPatternId,
  harmony: HarmonyEvent[],
  meter: Meter,
  previousBass: number | null,
): AccompanimentResult {
  let bass = previousBass ?? 48;
  const notes: NoteEvent[] = [];

  for (const event of harmony) {
    let segment: AccompanimentResult;
    if (event.duration === meter.ticks) {
      segment = generateAccompaniment(pattern, event.chord, meter, bass);
    } else if (event.duration === PPQ * 2) {
      segment = generateAccompaniment(pattern, event.chord, METERS["2/4"], bass);
    } else {
      segment = generateBeatAccompaniment(pattern, event.chord, bass);
    }
    notes.push(
      ...segment.notes.map((note) => ({
        ...note,
        start: note.start + event.start,
      })),
    );
    bass = segment.bass;
  }

  return { notes, bass };
}
