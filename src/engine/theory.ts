import type { KeyLabelSystem, KeySpec, Mode, SpelledNote } from "./types";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

interface KeyDef {
  id: string;
  label: string;
  vf: string;
  tonicName: string;
  mode: Mode;
  preferFlats: boolean;
}

const KEY_DEFS: KeyDef[] = [
  { id: "C", label: "C major", vf: "C", tonicName: "C", mode: "major", preferFlats: false },
  { id: "G", label: "G major", vf: "G", tonicName: "G", mode: "major", preferFlats: false },
  { id: "D", label: "D major", vf: "D", tonicName: "D", mode: "major", preferFlats: false },
  { id: "A", label: "A major", vf: "A", tonicName: "A", mode: "major", preferFlats: false },
  { id: "E", label: "E major", vf: "E", tonicName: "E", mode: "major", preferFlats: false },
  { id: "B", label: "B major", vf: "B", tonicName: "B", mode: "major", preferFlats: false },
  { id: "F#", label: "F-sharp major", vf: "F#", tonicName: "F#", mode: "major", preferFlats: false },
  { id: "Db", label: "D-flat major", vf: "Db", tonicName: "Db", mode: "major", preferFlats: true },
  { id: "Ab", label: "A-flat major", vf: "Ab", tonicName: "Ab", mode: "major", preferFlats: true },
  { id: "Eb", label: "E-flat major", vf: "Eb", tonicName: "Eb", mode: "major", preferFlats: true },
  { id: "Bb", label: "B-flat major", vf: "Bb", tonicName: "Bb", mode: "major", preferFlats: true },
  { id: "F", label: "F major", vf: "F", tonicName: "F", mode: "major", preferFlats: true },
  { id: "Am", label: "A minor", vf: "Am", tonicName: "A", mode: "minor", preferFlats: false },
  { id: "Em", label: "E minor", vf: "Em", tonicName: "E", mode: "minor", preferFlats: false },
  { id: "Bm", label: "B minor", vf: "Bm", tonicName: "B", mode: "minor", preferFlats: false },
  { id: "F#m", label: "F-sharp minor", vf: "F#m", tonicName: "F#", mode: "minor", preferFlats: false },
  { id: "C#m", label: "C-sharp minor", vf: "C#m", tonicName: "C#", mode: "minor", preferFlats: false },
  { id: "Fm", label: "F minor", vf: "Fm", tonicName: "F", mode: "minor", preferFlats: true },
  { id: "Cm", label: "C minor", vf: "Cm", tonicName: "C", mode: "minor", preferFlats: true },
  { id: "Gm", label: "G minor", vf: "Gm", tonicName: "G", mode: "minor", preferFlats: true },
  { id: "Dm", label: "D minor", vf: "Dm", tonicName: "D", mode: "minor", preferFlats: true },
];

function parseAccidental(text: string): number {
  let accidental = 0;
  for (const character of text) {
    if (character === "#") accidental += 1;
    else if (character === "b") accidental -= 1;
  }
  return accidental;
}

export function accidentalToString(accidental: number): string {
  if (accidental === 0) return "";
  if (accidental > 0) return "#".repeat(accidental);
  return "b".repeat(-accidental);
}

function buildKey(def: KeyDef): KeySpec {
  const letter = def.tonicName[0];
  const letterIndex = LETTERS.indexOf(letter);
  const tonicAccidental = parseAccidental(def.tonicName.slice(1));
  const tonicPc = ((LETTER_PCS[letterIndex] + tonicAccidental) % 12 + 12) % 12;
  const steps = def.mode === "major" ? MAJOR_STEPS : MINOR_STEPS;
  const degrees: SpelledNote[] = steps.map((step, index) => {
    const degreeLetterIndex = (letterIndex + index) % 7;
    const targetPc = (tonicPc + step) % 12;
    let accidental = targetPc - LETTER_PCS[degreeLetterIndex];
    while (accidental > 6) accidental -= 12;
    while (accidental < -6) accidental += 12;
    return {
      letter: LETTERS[degreeLetterIndex],
      accidental,
      pc: targetPc,
      name: LETTERS[degreeLetterIndex] + accidentalToString(accidental),
    };
  });
  return {
    ...def,
    tonicPc,
    degrees,
  };
}

export const KEYS: KeySpec[] = KEY_DEFS.map(buildKey);

export function getKey(id: string): KeySpec {
  return KEYS.find((key) => key.id === id) ?? KEYS[0];
}

const SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];

export function isKeyLabelSystem(value: unknown): value is KeyLabelSystem {
  return value === "letters" || value === "solfege";
}

export function formatKeyLabel(key: KeySpec, system: KeyLabelSystem): string {
  if (system === "letters") return key.label;
  const letter = key.tonicName[0];
  const accidental = parseAccidental(key.tonicName.slice(1));
  const accidentalLabel =
    accidental > 0
      ? "-sharp".repeat(accidental)
      : accidental < 0
        ? "-flat".repeat(-accidental)
        : "";
  const tonic = SOLFEGE[LETTERS.indexOf(letter)] ?? letter;
  return `${tonic}${accidentalLabel} ${key.mode}`;
}

export function spellMidi(midi: number, key: KeySpec): SpelledNote {
  const pc = ((midi % 12) + 12) % 12;
  for (const degree of key.degrees) {
    if (degree.pc === pc) return degree;
  }
  if (key.mode === "minor") {
    const seventh = key.degrees[6];
    if (pc === (seventh.pc + 1) % 12) {
      const accidental = seventh.accidental + 1;
      return {
        letter: seventh.letter,
        accidental,
        pc,
        name: seventh.letter + accidentalToString(accidental),
      };
    }
  }
  const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const name = key.preferFlats ? flatNames[pc] : sharpNames[pc];
  return {
    letter: name[0],
    accidental: parseAccidental(name.slice(1)),
    pc,
    name,
  };
}

export function vexKey(midi: number, key: KeySpec): string {
  const spelled = spellMidi(midi, key);
  const octave = Math.floor(midi / 12) - 1;
  return `${spelled.letter.toLowerCase()}${accidentalToString(spelled.accidental)}/${octave}`;
}

export function scalePcs(key: KeySpec): number[] {
  return key.degrees.map((degree) => degree.pc);
}

export type ChordQuality = "maj" | "min" | "dim";

const MAJOR_QUALITIES: ChordQuality[] = ["maj", "min", "min", "maj", "maj", "min", "dim"];
const MINOR_QUALITIES: ChordQuality[] = ["min", "dim", "maj", "min", "maj", "maj", "maj"];

export function chordQuality(key: KeySpec, degreeIndex: number): ChordQuality {
  const table = key.mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  return table[degreeIndex] ?? "maj";
}

export function chordPcs(key: KeySpec, degreeIndex: number): number[] {
  const quality = chordQuality(key, degreeIndex);
  const root = key.degrees[degreeIndex].pc;
  const intervals = quality === "maj" ? [0, 4, 7] : quality === "min" ? [0, 3, 7] : [0, 3, 6];
  return intervals.map((interval) => (root + interval) % 12);
}
