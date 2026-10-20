import type { LevelDef } from "./difficulty";
import type { Meter, MeterLabel, MusicStyle } from "./types";
import { PPQ } from "./types";
import { getStyle } from "./style";
import { weightedPick, type Rng } from "./rng";

export interface RhythmicEvent {
  ticks: number;
  rest: boolean;
}

interface RhythmFigure {
  events: RhythmicEvent[];
  weight: number;
  minLevel: number;
  rest: boolean;
  syncopated: boolean;
  dotted: boolean;
  sixteenth: boolean;
}

function e(ticks: number, rest = false): RhythmicEvent {
  return { ticks, rest };
}

function figure(events: RhythmicEvent[], weight: number, minLevel = 1): RhythmFigure {
  return {
    events,
    weight,
    minLevel,
    rest: events.some((event) => event.rest),
    syncopated: events[0].rest || events.some((event) => event.rest && event.ticks < PPQ),
    dotted: events.some((event) => event.ticks === 360 || event.ticks === 720 || event.ticks === 1440),
    sixteenth: events.some((event) => event.ticks === 120),
  };
}

const FIGURES: Record<MeterLabel, RhythmFigure[]> = {
  "4/4": [
    figure([e(1920)], 1),
    figure([e(960), e(960)], 2),
    figure([e(960), e(480), e(480)], 2),
    figure([e(480), e(960), e(480)], 2),
    figure([e(480), e(480), e(960)], 2),
    figure([e(480), e(480), e(480), e(480)], 2.4),
    figure([e(1440), e(480)], 1.1, 2),
    figure([e(480), e(1440)], 1.1, 2),
    figure([e(720), e(240), e(480), e(480)], 1, 4),
    figure([e(480), e(720), e(240), e(480)], 1, 4),
    figure([e(480), e(480), e(720), e(240)], 1, 4),
    figure([e(720), e(240), e(720), e(240)], 0.9, 4),
    figure([e(960), e(240), e(240), e(480)], 1.2, 5),
    figure([e(480), e(240), e(240), e(960)], 1.2, 5),
    figure([e(240), e(240), e(480), e(480), e(480)], 1.2, 5),
    figure([e(480), e(480), e(240), e(240), e(480)], 1.1, 5),
    figure([e(480), e(240), e(240), e(480), e(480)], 1.1, 5),
    figure([e(360), e(120), e(480), e(480), e(480)], 0.9, 5),
    figure([e(480), e(360), e(120), e(480), e(480)], 0.9, 5),
    figure([e(480), e(480), e(360), e(120), e(480)], 0.9, 5),
    figure([e(120), e(120), e(120), e(120), e(480), e(480), e(480)], 0.7, 5),
    figure([e(480), e(120), e(120), e(120), e(120), e(480), e(480)], 0.7, 5),
    figure([e(480), e(480), e(120), e(120), e(120), e(120), e(480)], 0.7, 5),
    figure([e(480), e(960, true), e(480)], 0.5, 2),
    figure([e(960), e(480, true), e(480)], 0.45, 2),
    figure([e(480), e(480, true), e(480), e(480)], 0.5, 3),
    figure([e(240), e(240, true), e(240), e(240), e(480), e(480)], 0.45, 5),
    figure([e(480), e(480), e(480, true), e(480)], 0.4, 4),
    figure([e(960), e(480), e(480, true)], 0.35, 4),
  ],
  "3/4": [
    figure([e(1440)], 1.4),
    figure([e(960), e(480)], 2),
    figure([e(480), e(960)], 2),
    figure([e(480), e(480), e(480)], 2.4),
    figure([e(720), e(240), e(480)], 1, 4),
    figure([e(480), e(720), e(240)], 1, 4),
    figure([e(480), e(240), e(720)], 1, 4),
    figure([e(240), e(240), e(480), e(480)], 1.1, 5),
    figure([e(480), e(240), e(240), e(480)], 1.1, 5),
    figure([e(480), e(480), e(240), e(240)], 1.1, 5),
    figure([e(240), e(240), e(240), e(240), e(480)], 0.9, 5),
    figure([e(480), e(120), e(120), e(120), e(120), e(480)], 0.7, 5),
    figure([e(480), e(480, true), e(480)], 0.5, 2),
    figure([e(480), e(480), e(480, true)], 0.35, 4),
  ],
  "2/4": [
    figure([e(960)], 1.4),
    figure([e(480), e(480)], 2.4),
    figure([e(240), e(240), e(480)], 1, 4),
    figure([e(480), e(240), e(240)], 1, 4),
    figure([e(240), e(240), e(240), e(240)], 1, 5),
    figure([e(120), e(120), e(120), e(120), e(480)], 0.7, 5),
    figure([e(480), e(120), e(120), e(120), e(120)], 0.7, 5),
    figure([e(240), e(240, true), e(240), e(240)], 0.45, 4),
  ],
};

function clone(events: RhythmicEvent[]): RhythmicEvent[] {
  return events.map((event) => ({ ...event }));
}

function figureWeight(item: RhythmFigure, level: LevelDef, style: MusicStyle): number {
  const styleDef = getStyle(style);
  let weight = item.weight * (0.6 + level.rhythm.density * 1.2);
  if (item.rest) weight *= (0.2 + level.rhythm.restRate * 2.8) * styleDef.restBias;
  if (item.syncopated) weight *= (0.3 + level.rhythm.syncopation * 3) * styleDef.syncopationBias;
  if (item.dotted) weight *= (0.45 + level.rhythm.dottedRate * 2) * styleDef.dottedBias;
  if (item.sixteenth) weight *= (0.8 + level.rhythm.density * 0.6) * styleDef.sixteenthBias;
  return Math.max(0.001, weight);
}

function candidates(level: LevelDef, meter: Meter): RhythmFigure[] {
  return FIGURES[meter.label].filter((item) => {
    if (item.minLevel > level.level) return false;
    if (item.rest && level.rhythm.restRate <= 0) return false;
    if (item.sixteenth && level.rhythm.subdivision > 120) return false;
    if (item.dotted && level.rhythm.dottedRate <= 0) return false;
    return true;
  });
}

function pickFigure(
  level: LevelDef,
  meter: Meter,
  style: MusicStyle,
  rng: Rng,
): RhythmicEvent[] {
  const pool = candidates(level, meter);
  const chosen = weightedPick(
    rng,
    pool.map((item) => ({ value: item, weight: figureWeight(item, level, style) })),
  );
  return clone(chosen.events);
}

function cadence(level: LevelDef, meter: Meter, final: boolean, rng: Rng): RhythmicEvent[] {
  if (meter.label === "4/4") {
    if (final) {
      const options = [{ value: [e(1920)], weight: 4 }];
      if (level.level >= 8) {
        options.push({ value: [e(960), e(960)], weight: 1 });
        options.push({ value: [e(480), e(480), e(960)], weight: 0.8 });
      }
      return clone(weightedPick(rng, options));
    }
    const options = [
      { value: [e(960), e(960)], weight: 3 },
      { value: [e(480), e(480), e(960)], weight: level.level >= 5 ? 2 : 0.5 },
    ];
    return clone(weightedPick(rng, options));
  }
  if (meter.label === "3/4") {
    const options = [{ value: [e(1440)], weight: 3 }];
    if (level.level >= 4) options.push({ value: [e(480), e(960)], weight: 1.2 });
    return clone(weightedPick(rng, options));
  }
  return [e(960)];
}

export function makePhraseRhythm(
  level: LevelDef,
  meter: Meter,
  style: MusicStyle,
  rng: Rng,
  phraseLength: number,
  isFinal: boolean,
  reuse?: [RhythmicEvent[], RhythmicEvent[]],
): RhythmicEvent[][] {
  if (phraseLength === 2) {
    const first = reuse?.[0] ? clone(reuse[0]) : pickFigure(level, meter, style, rng);
    return [first, cadence(level, meter, isFinal, rng)];
  }
  const first = reuse?.[0] ? clone(reuse[0]) : pickFigure(level, meter, style, rng);
  const second = reuse?.[1] ? clone(reuse[1]) : pickFigure(level, meter, style, rng);
  return [first, second, clone(first), cadence(level, meter, isFinal, rng)];
}

export function copyRhythm(events: RhythmicEvent[]): RhythmicEvent[] {
  return clone(events);
}
