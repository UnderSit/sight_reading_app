import { isKeyLabelSystem, KEYS } from "./engine/theory";
import { isMusicStyle } from "./engine/style";
import type { KeyLabelSystem, MeterLabel, MusicStyle } from "./engine/types";

export interface Settings {
  difficulty: number;
  measures: number;
  keyId: string;
  meter: MeterLabel | "auto";
  style: MusicStyle;
  keyLabel: KeyLabelSystem;
  tempo: number;
  metronome: boolean;
}

export const LENGTHS = [2, 4, 8, 12, 16];
export const TEMPO_RANGE = { min: 40, max: 160 };

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 3,
  measures: 8,
  keyId: "auto",
  meter: "auto",
  style: "mixed",
  keyLabel: "letters",
  tempo: 76,
  metronome: true,
};

const SETTINGS_KEY = "sightline.settings.v1";
const SEED_KEY = "sightline.seed.v1";

function isMeter(value: unknown): value is MeterLabel | "auto" {
  return value === "auto" || value === "4/4" || value === "3/4" || value === "2/4";
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const candidateKeyId = typeof parsed.keyId === "string" ? parsed.keyId : "";
    const keyId =
      candidateKeyId === "auto" || KEYS.some((key) => key.id === candidateKeyId)
        ? candidateKeyId
        : DEFAULT_SETTINGS.keyId;
    return {
      difficulty:
        typeof parsed.difficulty === "number" && parsed.difficulty >= 1 && parsed.difficulty <= 10
          ? Math.round(parsed.difficulty)
          : DEFAULT_SETTINGS.difficulty,
      measures:
        typeof parsed.measures === "number" && LENGTHS.includes(parsed.measures)
          ? parsed.measures
          : DEFAULT_SETTINGS.measures,
      keyId,
      meter: isMeter(parsed.meter) ? parsed.meter : DEFAULT_SETTINGS.meter,
      style: isMusicStyle(parsed.style) ? parsed.style : DEFAULT_SETTINGS.style,
      keyLabel: isKeyLabelSystem(parsed.keyLabel) ? parsed.keyLabel : DEFAULT_SETTINGS.keyLabel,
      tempo:
        typeof parsed.tempo === "number" && parsed.tempo >= TEMPO_RANGE.min && parsed.tempo <= TEMPO_RANGE.max
          ? Math.round(parsed.tempo)
          : DEFAULT_SETTINGS.tempo,
      metronome: typeof parsed.metronome === "boolean" ? parsed.metronome : DEFAULT_SETTINGS.metronome,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable in private windows; the app still works without it.
  }
}

export function loadSeed(): number | null {
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveSeed(seed: number): void {
  try {
    localStorage.setItem(SEED_KEY, String(seed));
  } catch {
    // Ignore storage failures.
  }
}
