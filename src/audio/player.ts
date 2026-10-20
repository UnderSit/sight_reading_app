import * as Tone from "tone";
import type { Exercise, Measure } from "../engine/types";
import { PPQ } from "../engine/types";

export interface PlaybackCallbacks {
  onCountIn: () => void;
  onMeasure: (index: number) => void;
  onEnded: () => void;
}

export interface PlaybackOptions {
  startMeasure?: number;
}

interface ActivePlayback {
  synth: Tone.PolySynth<Tone.Synth>;
  countClick: Tone.Synth;
  metroClick: Tone.Synth;
  metroGain: Tone.Gain;
}

let active: ActivePlayback | null = null;
let startGeneration = 0;

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

interface SoundNote {
  start: number;
  duration: number;
  end: number;
  pitches: number[];
}

function samePitches(first: number[], second: number[]): boolean {
  return (
    first.length === second.length &&
    first.every((pitch, index) => pitch === second[index])
  );
}

function collectVoice(
  measures: Measure[],
  fromMeasure: number,
  voice: "rh" | "lh",
  meterTicks: number,
): SoundNote[] {
  const notes: SoundNote[] = [];
  let active: SoundNote | null = null;

  measures.slice(fromMeasure).forEach((measure, offset) => {
    const measureStart = offset * meterTicks;
    for (const note of measure[voice]) {
      if (note.pitches.length === 0) {
        active = null;
        continue;
      }
      const start = measureStart + note.start;
      const end = start + note.duration;
      if (
        note.tieEnd &&
        active !== null &&
        active.end === start &&
        samePitches(active.pitches, note.pitches)
      ) {
        active.duration = end - active.start;
        active.end = end;
        if (!note.tieStart) active = null;
        continue;
      }
      const sound: SoundNote = {
        start,
        duration: note.duration,
        end,
        pitches: note.pitches,
      };
      notes.push(sound);
      active = note.tieStart ? sound : null;
    }
  });

  return notes;
}

function createClick(): Tone.Synth {
  return new Tone.Synth({
    volume: -19,
    oscillator: { type: "square" },
    envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 },
  });
}

export function isPlaying(): boolean {
  return active !== null;
}

export function setMetronomeEnabled(enabled: boolean): void {
  if (!active) return;
  active.metroGain.gain.rampTo(enabled ? 1 : 0, 0.05);
}

export function stopPlayback(): void {
  startGeneration += 1;
  if (!active) return;
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  Tone.getDraw().cancel(0);
  active.synth.releaseAll();
  active.synth.dispose();
  active.countClick.dispose();
  active.metroClick.dispose();
  active.metroGain.dispose();
  active = null;
}

export async function startPlayback(
  exercise: Exercise,
  tempo: number,
  metronome: boolean,
  callbacks: PlaybackCallbacks,
  options: PlaybackOptions = {},
): Promise<void> {
  stopPlayback();
  const generation = ++startGeneration;
  await Tone.start();
  if (generation !== startGeneration) return;

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  Tone.getDraw().cancel(0);
  transport.position = 0;
  transport.bpm.value = tempo;

  const synth = new Tone.PolySynth(Tone.Synth, {
    volume: -11,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.22, sustain: 0.16, release: 0.5 },
  }).toDestination();

  const countClick = createClick().toDestination();
  const metroGain = new Tone.Gain(metronome ? 1 : 0).toDestination();
  const metroClick = createClick().connect(metroGain);

  active = { synth, countClick, metroClick, metroGain };

  const secondsPerTick = 60 / tempo / PPQ;
  const countInTicks = exercise.meter.ticks;
  const lastMeasure = Math.max(0, exercise.measures.length - 1);
  const startMeasure = Math.min(
    lastMeasure,
    Math.max(0, Math.floor(options.startMeasure ?? 0)),
  );

  transport.schedule((time) => {
    Tone.getDraw().schedule(() => callbacks.onCountIn(), time);
  }, 0);

  for (let beat = 0; beat < exercise.meter.beats; beat += 1) {
    const beatSeconds = beat * PPQ * secondsPerTick;
    transport.schedule((time) => {
      countClick.triggerAttackRelease(beat === 0 ? 1568 : 1047, 0.03, time, beat === 0 ? 0.7 : 0.4);
    }, beatSeconds);
  }

  exercise.measures.slice(startMeasure).forEach((_, offset) => {
    const index = startMeasure + offset;
    const measureStartTicks = countInTicks + offset * exercise.meter.ticks;
    const measureStartSeconds = measureStartTicks * secondsPerTick;

    transport.schedule((time) => {
      Tone.getDraw().schedule(() => callbacks.onMeasure(index), time);
    }, measureStartSeconds);

    if (metronome) {
      for (let beat = 0; beat < exercise.meter.beats; beat += 1) {
        const beatSeconds = (measureStartTicks + beat * PPQ) * secondsPerTick;
        transport.schedule((time) => {
          metroClick.triggerAttackRelease(beat === 0 ? 1568 : 1047, 0.03, time, beat === 0 ? 0.5 : 0.3);
        }, beatSeconds);
      }
    }

  });

  const scheduleVoice = (notes: SoundNote[], velocity: number) => {
    for (const note of notes) {
      const atSeconds = (countInTicks + note.start) * secondsPerTick;
      const duration = Math.max(0.06, note.duration * secondsPerTick - 0.03);
      const frequencies = note.pitches.map(midiToFrequency);
      transport.schedule((time) => {
        synth.triggerAttackRelease(frequencies, duration, time, velocity);
      }, atSeconds);
    }
  };

  scheduleVoice(
    collectVoice(exercise.measures, startMeasure, "rh", exercise.meter.ticks),
    0.75,
  );
  scheduleVoice(
    collectVoice(exercise.measures, startMeasure, "lh", exercise.meter.ticks),
    0.5,
  );

  const endSeconds =
    (countInTicks + (exercise.measures.length - startMeasure) * exercise.meter.ticks) *
    secondsPerTick;

  transport.schedule((time) => {
    Tone.getDraw().schedule(() => {
      stopPlayback();
      callbacks.onEnded();
    }, time + 0.04);
  }, endSeconds);

  transport.start("+0.06");
}
