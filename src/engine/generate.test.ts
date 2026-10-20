import { describe, expect, it } from "vitest";
import { generateExercise } from "./generate";
import { chordAt } from "./harmony";
import { formatKeyLabel, KEYS, getKey, scalePcs, spellMidi, vexKey } from "./theory";
import { getLevel, LEVELS } from "./difficulty";
import { STYLE_DEFS } from "./style";
import type { ChordSpec, Exercise, Measure, NoteEvent } from "./types";

function pitched(notes: NoteEvent[]): NoteEvent[] {
  return notes.filter((note) => note.pitches.length > 0);
}

function checkVoice(measures: Measure[], meterTicks: number, voice: "rh" | "lh"): void {
  for (const measure of measures) {
    const notes = measure[voice];
    expect(notes.length).toBeGreaterThan(0);
    let cursor = 0;
    for (const note of notes) {
      expect(note.start).toBe(cursor);
      expect(note.duration).toBeGreaterThan(0);
      cursor += note.duration;
    }
    expect(cursor).toBe(meterTicks);
  }
}

function isStrongBeat(start: number, exercise: Exercise): boolean {
  if (exercise.meter.label === "4/4") return start % 960 === 0;
  return start % exercise.meter.ticks === 0;
}

function isSeventh(chord: ChordSpec): boolean {
  return chord.quality.includes("7");
}

function assertExercise(exercise: Exercise): void {
  const level = getLevel(exercise.level);
  const key = exercise.key;
  const meter = exercise.meter;
  const scale = scalePcs(key);
  const raisedSeventh = key.mode === "minor" ? (key.tonicPc + 11) % 12 : null;
  const baseAllowed = new Set(scale);
  if (raisedSeventh !== null) baseAllowed.add(raisedSeventh);

  expect(exercise.measures.length).toBeGreaterThanOrEqual(2);
  expect(exercise.degrees).toHaveLength(exercise.measures.length);
  expect(STYLE_DEFS.some((style) => style.id === exercise.style)).toBe(true);
  expect(exercise.lhPatterns).toHaveLength(exercise.measures.length);
  for (const pattern of exercise.lhPatterns) {
    expect(level.lhPatterns).toContain(pattern);
    if (pattern === "waltz") expect(meter.label).toBe("3/4");
  }
  checkVoice(exercise.measures, meter.ticks, "rh");
  checkVoice(exercise.measures, meter.ticks, "lh");

  const firstRh = pitched(exercise.measures[0].rh)[0];
  expect(firstRh).toBeDefined();
  const firstChord = chordAt(exercise.measures[0].harmony, firstRh.start);
  expect(firstChord.pcs).toContain(Math.max(...firstRh.pitches) % 12);

  let previousPitch: number | null = null;
  let finalPitch: number | null = null;

  exercise.measures.forEach((measure, index) => {
    let cursor = 0;
    expect(measure.harmony.length).toBeGreaterThan(0);
    for (const event of measure.harmony) {
      expect(event.start).toBe(cursor);
      expect(event.duration).toBeGreaterThan(0);
      expect(event.chord.pcs.length).toBeGreaterThanOrEqual(3);
      cursor += event.duration;
    }
    expect(cursor).toBe(meter.ticks);

    const melodic = pitched(measure.rh);
    for (const note of measure.lh) {
      expect(note.pitches.length).toBeGreaterThan(0);
      const chord = chordAt(measure.harmony, note.start);
      for (const pitch of note.pitches) {
        expect(pitch).toBeGreaterThanOrEqual(42);
        expect(pitch).toBeLessThanOrEqual(60);
        expect(chord.pcs).toContain(pitch % 12);
      }
    }

    for (const note of melodic) {
      const chord = chordAt(measure.harmony, note.start);
      const allowed = new Set([...baseAllowed, ...chord.pcs]);
      expect(note.pitches.length).toBeGreaterThanOrEqual(1);
      expect(note.pitches.length).toBeLessThanOrEqual(3);
      const ordered = [...note.pitches].sort((a, b) => a - b);
      expect(new Set(ordered).size).toBe(ordered.length);
      for (let voice = 1; voice < ordered.length; voice += 1) {
        expect(ordered[voice] - ordered[voice - 1]).toBeGreaterThanOrEqual(3);
      }
      const pitch = Math.max(...note.pitches);
      expect(pitch).toBeGreaterThanOrEqual(60);
      expect(pitch).toBeLessThanOrEqual(60 + level.rhSpan);
      expect(allowed.has(pitch % 12)).toBe(true);
      if (isStrongBeat(note.start, exercise)) {
        expect(chord.pcs).toContain(pitch % 12);
      }
      for (const lower of ordered.slice(0, -1)) {
        expect(lower).toBeGreaterThanOrEqual(60);
        expect(chord.pcs).toContain(lower % 12);
      }

      if (previousPitch !== null) {
        const isFinalNote =
          index === exercise.measures.length - 1 && note === melodic[melodic.length - 1];
        if (!isFinalNote) {
          expect(Math.abs(pitch - previousPitch)).toBeLessThanOrEqual(level.maxLeap);
        }
      }
      previousPitch = pitch;
      finalPitch = pitch;
    }
  });

  const lastMeasure = exercise.measures[exercise.measures.length - 1];
  const lastCadenceNote = pitched(lastMeasure.rh).at(-1);
  expect(lastCadenceNote).toBeDefined();
  expect(lastCadenceNote!.duration).toBeGreaterThanOrEqual(960);
  const lastChord = lastMeasure.harmony[lastMeasure.harmony.length - 1].chord;
  expect(lastChord.degree).toBe(0);
  expect(lastChord.rootPc).toBe(key.tonicPc);
  expect(lastChord.inversion).toBe(0);
  expect(exercise.degrees.at(-1)).toBe(0);
  expect(finalPitch).not.toBeNull();
  expect(finalPitch! % 12).toBe(key.tonicPc);
  expect(exercise.meter.label).toBe(meter.label);
  expect(exercise.phraseEnds.at(-1)).toBe(exercise.measures.length - 1);
  expect(exercise.phraseRoles).toHaveLength(exercise.phraseEnds.length);
  expect(exercise.phraseCadences).toHaveLength(exercise.phraseEnds.length);

  exercise.phraseEnds.forEach((phraseEnd, phraseIndex) => {
    const measure = exercise.measures[phraseEnd];
    const cadenceNote = pitched(measure.rh).at(-1);
    expect(cadenceNote).toBeDefined();
    expect(cadenceNote!.duration).toBeGreaterThanOrEqual(960);
    const chord = chordAt(measure.harmony, cadenceNote!.start);
    expect(chord.pcs).toContain(Math.max(...cadenceNote!.pitches) % 12);
    const cadence = exercise.phraseCadences[phraseIndex];
    if (cadence === "half") {
      expect(chord.degree).toBe(4);
    } else {
      expect(exercise.measures[phraseEnd - 1].harmony[0].chord.degree).toBe(4);
      expect(chord.degree).toBe(cadence === "deceptive" ? 5 : 0);
    }
  });
}

describe("generateExercise", () => {
  it("produces valid exercises across every level, length, and several seeds", () => {
    for (const level of LEVELS) {
      for (const measures of [2, 4, 8, 12, 16]) {
        for (let seed = 1; seed <= 6; seed += 1) {
          const exercise = generateExercise({
            seed: seed * 1013 + level.level * 17 + measures,
            difficulty: level.level,
            measures,
            keyId: "auto",
            meter: "auto",
          });
          expect(exercise.measures).toHaveLength(measures);
          assertExercise(exercise);
        }
      }
    }
  });

  it("supports every musical style", () => {
    for (const style of STYLE_DEFS) {
      for (const difficulty of [3, 6, 10]) {
        for (const meter of ["4/4", "3/4", "2/4"] as const) {
          for (let seed = 1; seed <= 3; seed += 1) {
            const exercise = generateExercise({
              seed: seed * 7919 + difficulty * 31,
              difficulty,
              measures: 8,
              keyId: "auto",
              meter,
              style: style.id,
            });
            expect(exercise.style).toBe(style.id);
            assertExercise(exercise);
          }
        }
      }
    }
  });

  it("builds functional cadences at every phrase end", () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const exercise = generateExercise({
        seed,
        difficulty: 8,
        measures: 12,
        keyId: "auto",
        meter: "auto",
        style: "mixed",
      });
      exercise.phraseEnds.forEach((phraseEnd, phraseIndex) => {
        const chord = exercise.measures[phraseEnd].harmony[0].chord;
        const cadence = exercise.phraseCadences[phraseIndex];
        if (cadence === "half") {
          expect(chord.degree).toBe(4);
        } else if (cadence === "deceptive") {
          expect(chord.degree).toBe(5);
        } else {
          expect(chord.degree).toBe(0);
        }
      });
    }
  });

  it("builds a phrase cadence hierarchy across exercise lengths", () => {
    const cadences = new Map<number, string[]>();
    for (const measures of [2, 4, 8, 12, 16]) {
      const exercise = generateExercise({
        seed: 31415,
        difficulty: 8,
        measures,
        keyId: "C",
        meter: "4/4",
        style: "mixed",
      });
      cadences.set(measures, exercise.phraseCadences);
      expect(exercise.phraseRoles.at(-1)).toBe("final");
      const finalStart = exercise.phraseEnds.length > 1 ? exercise.phraseEnds.at(-2)! + 1 : 0;
      if (measures > 2) {
        expect(exercise.measures[0].harmony[0].chord.degree).toBe(0);
        expect(exercise.measures[finalStart].harmony[0].chord.degree).toBe(0);
      }
    }

    expect(cadences.get(2)).toEqual(["perfectAuthentic"]);
    expect(cadences.get(4)).toEqual(["perfectAuthentic"]);
    expect(cadences.get(8)).toEqual(["half", "perfectAuthentic"]);
    expect(cadences.get(12)).toEqual(["half", "deceptive", "perfectAuthentic"]);
    expect(cadences.get(16)).toEqual([
      "half",
      "imperfectAuthentic",
      "deceptive",
      "perfectAuthentic",
    ]);
  });

  it("expands harmonic vocabulary at the top levels", () => {
    let sevenths = 0;
    let inversions = 0;
    let secondary = 0;
    let borrowed = 0;

    for (const style of STYLE_DEFS) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const exercise = generateExercise({
          seed,
          difficulty: 10,
          measures: 16,
          keyId: "auto",
          meter: "4/4",
          style: style.id,
        });
        for (const measure of exercise.measures) {
          for (const event of measure.harmony) {
            if (isSeventh(event.chord)) sevenths += 1;
            if (event.chord.inversion > 0) inversions += 1;
            if (event.chord.secondaryOf !== null) secondary += 1;
            if (
              exercise.key.mode === "major" &&
              event.chord.degree === 3 &&
              (event.chord.quality === "min" || event.chord.quality === "min7")
            ) {
              borrowed += 1;
            }
          }
        }
      }
    }

    expect(sevenths).toBeGreaterThan(0);
    expect(inversions).toBeGreaterThan(0);
    expect(secondary).toBeGreaterThan(0);
    expect(borrowed).toBeGreaterThan(0);
  });

  it("includes some right-hand harmony from level 3 onward", () => {
    for (const difficulty of [3, 4, 6, 8, 10]) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const exercise = generateExercise({
          seed,
          difficulty,
          measures: 8,
          keyId: "auto",
          meter: "auto",
        });
        expect(
          exercise.measures.some((measure) => measure.rh.some((note) => note.pitches.length > 1)),
        ).toBe(true);
      }
    }
  });

  it("adds right-hand harmony as difficulty rises", () => {
    let harmonicNotes = 0;
    let totalNotes = 0;
    let maxVoices = 0;

    for (const style of STYLE_DEFS) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const exercise = generateExercise({
          seed,
          difficulty: 10,
          measures: 16,
          keyId: "auto",
          meter: "4/4",
          style: style.id,
        });
        for (const note of exercise.measures.flatMap((measure) => pitched(measure.rh))) {
          totalNotes += 1;
          maxVoices = Math.max(maxVoices, note.pitches.length);
          if (note.pitches.length > 1) harmonicNotes += 1;
        }
      }
    }

    expect(harmonicNotes).toBeGreaterThan(0);
    expect(harmonicNotes / totalNotes).toBeLessThan(0.5);
    expect(maxVoices).toBe(3);

    const beginner = generateExercise({
      seed: 31337,
      difficulty: 1,
      measures: 8,
      keyId: "C",
      meter: "4/4",
    });
    for (const note of beginner.measures.flatMap((measure) => pitched(measure.rh))) {
      expect(note.pitches).toHaveLength(1);
    }
  });

  it("varies the left-hand texture across phrases", () => {
    const counts = new Map<string, number>();
    let total = 0;

    for (let seed = 1; seed <= 80; seed += 1) {
      const exercise = generateExercise({
        seed,
        difficulty: 10,
        measures: 16,
        keyId: "auto",
        meter: "4/4",
        style: "mixed",
      });
      expect(new Set(exercise.lhPatterns).size).toBeGreaterThan(1);
      for (const pattern of exercise.lhPatterns) {
        counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
        total += 1;
      }
    }

    expect(total).toBe(80 * 16);
    expect((counts.get("alberti") ?? 0) / total).toBeLessThan(0.45);
    expect(counts.has("arpeggio")).toBe(true);
    expect(counts.has("stride")).toBe(true);
  });

  it("honours every explicit key and meter", () => {
    for (const key of KEYS) {
      for (const meter of ["4/4", "3/4", "2/4"] as const) {
        const exercise = generateExercise({
          seed: 424242,
          difficulty: 10,
          measures: 4,
          keyId: key.id,
          meter,
        });
        expect(exercise.key.id).toBe(key.id);
        expect(exercise.meter.label).toBe(meter);
        assertExercise(exercise);
      }
    }
  });

  it("is deterministic for the same seed and options", () => {
    const options = { seed: 987654, difficulty: 7, measures: 8, keyId: "auto", meter: "auto" } as const;
    expect(JSON.stringify(generateExercise(options))).toBe(JSON.stringify(generateExercise(options)));
  });

  it("changes with the seed", () => {
    const base = { difficulty: 6, measures: 8, keyId: "auto", meter: "auto" } as const;
    const a = generateExercise({ ...base, seed: 1 });
    const b = generateExercise({ ...base, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("uses five-finger style steps at level 1", () => {
    const exercise = generateExercise({
      seed: 31337,
      difficulty: 1,
      measures: 4,
      keyId: "C",
      meter: "4/4",
    });
    assertExercise(exercise);
    const notes = exercise.measures.flatMap((measure) => pitched(measure.rh));
    for (let index = 1; index < notes.length - 1; index += 1) {
      expect(
        Math.abs(
          Math.max(...notes[index].pitches) - Math.max(...notes[index - 1].pitches),
        ),
      ).toBeLessThanOrEqual(2);
    }
    expect(exercise.measures.flatMap((measure) => measure.rh).every((note) => note.pitches.length > 0)).toBe(true);
  });

  it("builds four-bar phrases with the third bar echoing the first", () => {
    const exercise = generateExercise({
      seed: 24680,
      difficulty: 4,
      measures: 12,
      keyId: "G",
      meter: "4/4",
    });
    expect(exercise.phraseEnds).toHaveLength(3);
    for (const end of exercise.phraseEnds.slice(0, -1)) {
      const start = end - 3;
      const first = exercise.measures[start].rh.map((note) => note.duration);
      const third = exercise.measures[start + 2].rh.map((note) => note.duration);
      expect(third).toEqual(first);
    }
  });

  it("recalls the opening rhythm in the final phrase", () => {
    for (const measures of [8, 12, 16]) {
      const exercise = generateExercise({
        seed: 86420,
        difficulty: 6,
        measures,
        keyId: "D",
        meter: "4/4",
      });
      const finalStart = exercise.phraseEnds.at(-1)! - 3;
      const opening = exercise.measures[0].rh.map((note) => note.duration);
      const finalOpening = exercise.measures[finalStart].rh.map((note) => note.duration);
      expect(finalOpening).toEqual(opening);
    }
  });

  it("recalls the opening pitch contour in the final phrase", () => {
    for (const difficulty of [4, 10]) {
      for (const seed of [97531, 4242]) {
        for (const measures of [8, 12, 16]) {
          const exercise = generateExercise({
            seed,
            difficulty,
            measures,
            keyId: "C",
            meter: "4/4",
            style: "mixed",
          });
          const opening = pitched(exercise.measures[0].rh).map((note) =>
            Math.max(...note.pitches),
          );
          const finalStart = exercise.phraseEnds.at(-1)! - 3;
          const finalOpening = pitched(exercise.measures[finalStart].rh).map((note) =>
            Math.max(...note.pitches),
          );
          const intervals = (pitches: number[]) =>
            pitches.slice(1).map((pitch, index) => pitch - pitches[index]);
          expect(intervals(finalOpening)).toEqual(intervals(opening));
        }
      }
    }
  });

  it("places cadence endings on a chord tone and keeps rhythm totals exact", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const exercise = generateExercise({
        seed,
        difficulty: 8,
        measures: 8,
        keyId: "auto",
        meter: "auto",
      });
      for (const phraseEnd of exercise.phraseEnds) {
        const measure = exercise.measures[phraseEnd];
        const last = pitched(measure.rh).at(-1)!;
        const chord = chordAt(measure.harmony, last.start);
        expect(chord.pcs).toContain(Math.max(...last.pitches) % 12);
        expect(last.duration).toBeGreaterThanOrEqual(960);
      }
      expect(exercise.measures.flatMap((m) => m.rh).reduce((s, n) => s + n.duration, 0)).toBe(
        exercise.meter.ticks * exercise.measures.length,
      );
    }
  });

  it("moves right-hand inner voices smoothly without parallel perfects", () => {
    const perfect = (interval: number) => {
      const simple = Math.abs(interval) % 12;
      return simple === 0 || simple === 7;
    };
    let movement = 0;
    let transitions = 0;
    let parallels = 0;
    let triads = 0;

    for (const difficulty of [8, 10]) {
      for (const style of ["mixed", "classical", "pop", "jazz"] as const) {
        for (let seed = 1; seed <= 20; seed += 1) {
          const exercise = generateExercise({
            seed,
            difficulty,
            measures: 16,
            keyId: "auto",
            meter: "auto",
            style,
          });
          const harmonized = exercise.measures
            .flatMap((measure) => measure.rh)
            .filter((note) => note.pitches.length > 1);
          triads += harmonized.filter((note) => note.pitches.length === 3).length;

          for (let index = 1; index < harmonized.length; index += 1) {
            const previous = [...harmonized[index - 1].pitches].sort((a, b) => a - b);
            const current = [...harmonized[index].pitches].sort((a, b) => a - b);
            if (previous.length !== current.length) continue;
            for (let voice = 0; voice < previous.length - 1; voice += 1) {
              movement += Math.abs(current[voice] - previous[voice]);
              transitions += 1;
            }
            for (let first = 0; first < previous.length; first += 1) {
              for (let second = first + 1; second < previous.length; second += 1) {
                const firstMotion = Math.sign(current[first] - previous[first]);
                const secondMotion = Math.sign(current[second] - previous[second]);
                if (firstMotion === 0 || firstMotion !== secondMotion) continue;
                if (
                  perfect(previous[first] - previous[second]) &&
                  perfect(current[first] - current[second])
                ) {
                  parallels += 1;
                }
              }
            }
          }
        }
      }
    }

    expect(triads).toBeGreaterThan(0);
    expect(transitions).toBeGreaterThan(0);
    expect(parallels).toBe(0);
    expect(movement / transitions).toBeLessThan(2);
  });
});

describe("harmonic rhythm and ties", () => {
  it("generates split harmonies and sustained ties", () => {
    let splitMeasures = 0;
    let ties = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const exercise = generateExercise({
        seed,
        difficulty: 10,
        measures: 16,
        keyId: "C",
        meter: "4/4",
        style: "jazz",
      });
      for (const measure of exercise.measures) {
        if (measure.harmony.length > 1) {
          splitMeasures += 1;
          let cursor = 0;
          for (const event of measure.harmony) {
            expect(event.start).toBe(cursor);
            cursor += event.duration;
          }
          expect(cursor).toBe(exercise.meter.ticks);
          expect(measure.harmony[0].chord.degree).not.toBe(
            measure.harmony[1].chord.degree,
          );
        }

        for (let index = 0; index < measure.rh.length - 1; index += 1) {
          const note = measure.rh[index];
          if (!note.tieStart) continue;
          ties += 1;
          const next = measure.rh[index + 1];
          expect(next.tieEnd).toBe(true);
          expect(next.pitches).toEqual(note.pitches);
        }
      }

      for (let index = 0; index < exercise.measures.length - 1; index += 1) {
        const note = exercise.measures[index].rh.at(-1);
        const next = exercise.measures[index + 1].rh[0];
        if (!note?.tieStart) continue;
        ties += 1;
        expect(next.tieEnd).toBe(true);
        expect(next.pitches).toEqual(note.pitches);
      }
    }
    expect(splitMeasures).toBeGreaterThan(0);
    expect(ties).toBeGreaterThan(0);
  });

  it("aligns split harmonies with the meter", () => {
    for (const [meter, changeTick] of [
      ["2/4", 480],
      ["3/4", 960],
    ] as const) {
      let splitMeasures = 0;
      for (let seed = 1; seed <= 30; seed += 1) {
        const exercise = generateExercise({
          seed,
          difficulty: 10,
          measures: 16,
          keyId: "C",
          meter,
          style: "jazz",
        });
        for (const measure of exercise.measures) {
          if (measure.harmony.length < 2) continue;
          splitMeasures += 1;
          expect(measure.harmony.map((event) => event.start)).toEqual([0, changeTick]);
          expect(measure.harmony.map((event) => event.duration)).toEqual([
            changeTick,
            exercise.meter.ticks - changeTick,
          ]);
        }
      }
      expect(splitMeasures).toBeGreaterThan(0);
    }
  });
});

describe("theory", () => {
  it("spells notes for the key signature", () => {
    expect(spellMidi(61, getKey("D")).name).toBe("C#");
    expect(spellMidi(70, getKey("F")).name).toBe("Bb");
    expect(spellMidi(68, getKey("Am")).name).toBe("G#");
    expect(spellMidi(63, getKey("Eb")).name).toBe("Eb");
    expect(spellMidi(65, getKey("F#")).name).toBe("E#");
  });

  it("maps midi notes to vexflow keys", () => {
    expect(vexKey(61, getKey("D"))).toBe("c#/4");
    expect(vexKey(70, getKey("F"))).toBe("bb/4");
    expect(vexKey(68, getKey("Am"))).toBe("g#/4");
    expect(vexKey(63, getKey("Eb"))).toBe("eb/4");
    expect(vexKey(65, getKey("F#"))).toBe("e#/4");
    expect(vexKey(60, getKey("C"))).toBe("c/4");
    expect(vexKey(72, getKey("C"))).toBe("c/5");
  });

  it("exposes every key used by the levels", () => {
    for (const level of LEVELS) {
      for (const id of level.keyIds) {
        expect(KEYS.some((key) => key.id === id)).toBe(true);
      }
    }
  });

  it("orders keys by the circle of fifths", () => {
    expect(KEYS.filter((key) => key.mode === "major").map((key) => key.id)).toEqual([
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "F#",
      "Db",
      "Ab",
      "Eb",
      "Bb",
      "F",
    ]);
    expect(KEYS.filter((key) => key.mode === "minor").map((key) => key.id)).toEqual([
      "Am",
      "Em",
      "Bm",
      "F#m",
      "C#m",
      "Fm",
      "Cm",
      "Gm",
      "Dm",
    ]);
  });

  it("formats key names in letters or solfège", () => {
    expect(formatKeyLabel(getKey("C"), "letters")).toBe("C major");
    expect(formatKeyLabel(getKey("C"), "solfege")).toBe("Do major");
    expect(formatKeyLabel(getKey("Bb"), "solfege")).toBe("Si-flat major");
    expect(formatKeyLabel(getKey("F#m"), "solfege")).toBe("Fa-sharp minor");
    expect(formatKeyLabel(getKey("Fm"), "solfege")).toBe("Fa minor");
  });
});
