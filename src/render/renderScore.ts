import {
  Accidental,
  BarlineType,
  Beam,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
  type StaveNoteStruct,
} from "vexflow";
import type { Exercise, Measure, Meter } from "../engine/types";
import { vexKey } from "../engine/theory";

export interface MeasureBox {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScoreLayout {
  width: number;
  height: number;
  measures: MeasureBox[];
}

const MARGIN_X = 12;
const TREBLE_TO_BASS = 80;
const SYSTEM_GAP = 54;
const STAFF_HEIGHT = 40;

function durationFor(ticks: number): string {
  if (ticks === 1920) return "w";
  if (ticks === 1440) return "hd";
  if (ticks === 960) return "h";
  if (ticks === 720) return "qd";
  if (ticks === 480) return "q";
  if (ticks === 360) return "8d";
  if (ticks === 240) return "8";
  if (ticks === 120) return "16";
  return ticks >= 960 ? "h" : ticks >= 480 ? "q" : "8";
}

function buildNote(
  pitches: number[],
  ticks: number,
  clef: "treble" | "bass",
  keySpec: Exercise["key"],
): StaveNote {
  const struct: StaveNoteStruct = {
    keys: pitches.length > 0 ? pitches.map((pitch) => vexKey(pitch, keySpec)) : [clef === "treble" ? "b/4" : "d/3"],
    duration: durationFor(ticks),
    clef,
  };
  if (pitches.length === 0) {
    struct.type = "r";
  } else {
    struct.autoStem = true;
  }
  return new StaveNote(struct);
}

function buildVoice(
  measure: Measure,
  voice: "rh" | "lh",
  clef: "treble" | "bass",
  meter: Meter,
  keySpec: Exercise["key"],
): Voice {
  const notes = measure[voice].map((event) => buildNote(event.pitches, event.duration, clef, keySpec));
  const vexVoice = new Voice({ numBeats: meter.beats, beatValue: meter.unit }).addTickables(notes);
  Accidental.applyAccidentals([vexVoice], keySpec.vf);
  return vexVoice;
}

interface BuiltMeasure {
  treble: Stave;
  bass: Stave;
  trebleVoice: Voice;
  bassVoice: Voice;
  trebleNotes: StaveNote[];
  bassNotes: StaveNote[];
  beams: Beam[];
}

function buildMeasure(
  measure: Measure,
  x: number,
  trebleY: number,
  bassY: number,
  width: number,
  meter: Meter,
  keySpec: Exercise["key"],
  showSignature: boolean,
  finalBarline: boolean,
): BuiltMeasure {
  const treble = new Stave(x, trebleY, width);
  const bass = new Stave(x, bassY, width);

  if (showSignature) {
    treble.addClef("treble").addKeySignature(keySpec.vf).addTimeSignature(meter.label);
    bass.addClef("bass").addKeySignature(keySpec.vf).addTimeSignature(meter.label);
  }

  if (finalBarline) {
    treble.setEndBarType(BarlineType.END);
    bass.setEndBarType(BarlineType.END);
  }

  const trebleVoice = buildVoice(measure, "rh", "treble", meter, keySpec);
  const bassVoice = buildVoice(measure, "lh", "bass", meter, keySpec);
  const groups = [new Fraction(1, meter.unit)];
  const trebleNotes = trebleVoice.getTickables() as StaveNote[];
  const bassNotes = bassVoice.getTickables() as StaveNote[];
  const beams = [
    ...Beam.generateBeams(trebleNotes, { groups, beamRests: false }),
    ...Beam.generateBeams(bassNotes, { groups, beamRests: false }),
  ];

  trebleVoice.setStave(treble);
  bassVoice.setStave(bass);
  const formatter = new Formatter();
  formatter.joinVoices([trebleVoice]);
  formatter.joinVoices([bassVoice]);
  formatter.formatToStave([trebleVoice, bassVoice], treble, { alignRests: true });

  return { treble, bass, trebleVoice, bassVoice, trebleNotes, bassNotes, beams };
}

interface TiedNote {
  treble: StaveNote[];
  bass: StaveNote[];
}

function samePitches(first: number[], second: number[]): boolean {
  return (
    first.length === second.length &&
    first.every((pitch, index) => pitch === second[index])
  );
}

function drawTie(
  context: ReturnType<Renderer["getContext"]>,
  first: StaveNote | null,
  last: StaveNote | null,
  pitches: number,
): void {
  const indexes = Array.from({ length: pitches }, (_, index) => index);
  new StaveTie({
    firstNote: first,
    lastNote: last,
    firstIndexes: indexes,
    lastIndexes: indexes,
  })
    .setContext(context)
    .draw();
}

function drawTies(
  exercise: Exercise,
  tiedNotes: TiedNote[],
  systems: number[],
  context: ReturnType<Renderer["getContext"]>,
): void {
  for (let index = 0; index < exercise.measures.length; index += 1) {
    for (const voice of ["rh", "lh"] as const) {
      const events = exercise.measures[index][voice];
      const notes = tiedNotes[index][voice === "rh" ? "treble" : "bass"];
      for (let eventIndex = 0; eventIndex < events.length - 1; eventIndex += 1) {
        const first = events[eventIndex];
        const last = events[eventIndex + 1];
        if (
          first.tieStart &&
          last.tieEnd &&
          samePitches(first.pitches, last.pitches)
        ) {
          drawTie(context, notes[eventIndex], notes[eventIndex + 1], first.pitches.length);
        }
      }

      const nextMeasure = exercise.measures[index + 1];
      if (!nextMeasure) continue;
      const first = events[events.length - 1];
      const last = nextMeasure[voice][0];
      if (
        !first ||
        !last ||
        !first.tieStart ||
        !last.tieEnd ||
        !samePitches(first.pitches, last.pitches)
      ) {
        continue;
      }
      if (systems[index] === systems[index + 1]) {
        drawTie(context, notes[notes.length - 1], tiedNotes[index + 1][voice === "rh" ? "treble" : "bass"][0], first.pitches.length);
      } else {
        drawTie(context, notes[notes.length - 1], null, first.pitches.length);
        drawTie(
          context,
          null,
          tiedNotes[index + 1][voice === "rh" ? "treble" : "bass"][0],
          first.pitches.length,
        );
      }
    }
  }
}

export async function renderScore(host: HTMLDivElement, exercise: Exercise, availableWidth: number): Promise<ScoreLayout> {
  await document.fonts.ready;

  const width = Math.max(320, Math.floor(availableWidth));
  const usableWidth = width - MARGIN_X * 2;
  const maxPerSystem = usableWidth >= 840 ? 4 : usableWidth >= 600 ? 3 : usableWidth >= 420 ? 2 : 1;
  const systemCount = Math.max(1, Math.ceil(exercise.measures.length / maxPerSystem));
  const basePerSystem = Math.floor(exercise.measures.length / systemCount);
  const extraMeasures = exercise.measures.length % systemCount;
  const systemSizes = Array.from({ length: systemCount }, (_, index) =>
    basePerSystem + (index < extraMeasures ? 1 : 0),
  );
  const systemPitch = TREBLE_TO_BASS + STAFF_HEIGHT + SYSTEM_GAP;
  const height = 34 + (systemCount - 1) * systemPitch + TREBLE_TO_BASS + STAFF_HEIGHT + 72;

  host.innerHTML = "";
  const renderer = new Renderer(host, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFillStyle("#1b1a17");
  context.setStrokeStyle("#1b1a17");

  const boxes: MeasureBox[] = [];
  const tiedNotes: TiedNote[] = [];
  const systems: number[] = [];
  let measureIndex = 0;

  for (let system = 0; system < systemCount; system += 1) {
    const trebleY = 34 + system * systemPitch;
    const bassY = trebleY + TREBLE_TO_BASS;
    const count = systemSizes[system];
    const measureWidth = usableWidth / count;
    const staves: Stave[] = [];

    for (let slot = 0; slot < count; slot += 1) {
      const index = measureIndex;
      measureIndex += 1;
      const x = MARGIN_X + slot * measureWidth;
      const built = buildMeasure(
        exercise.measures[index],
        x,
        trebleY,
        bassY,
        measureWidth,
        exercise.meter,
        exercise.key,
        slot === 0,
        index === exercise.measures.length - 1,
      );

      built.treble.setContext(context).draw();
      built.bass.setContext(context).draw();
      built.trebleVoice.draw(context, built.treble);
      built.bassVoice.draw(context, built.bass);
      for (const beam of built.beams) beam.setContext(context).draw();

      tiedNotes.push({ treble: built.trebleNotes, bass: built.bassNotes });
      systems.push(system);
      staves.push(built.treble, built.bass);

      const top = built.treble.getTopLineTopY() - 16;
      const bottom = built.bass.getBottomLineBottomY() + 16;
      boxes.push({
        index,
        x: x + 3,
        y: top,
        width: measureWidth - 6,
        height: bottom - top,
      });
    }

    if (staves.length >= 2) {
      new StaveConnector(staves[0], staves[1]).setType("brace").setContext(context).draw();
      new StaveConnector(staves[0], staves[1]).setType("singleLeft").setContext(context).draw();
      new StaveConnector(staves[staves.length - 2], staves[staves.length - 1])
        .setType("singleRight")
        .setContext(context)
        .draw();
    }
  }

  drawTies(exercise, tiedNotes, systems, context);

  return { width, height, measures: boxes };
}
