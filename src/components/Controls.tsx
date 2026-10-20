import type { LevelDef } from "../engine/difficulty";
import { STYLE_DEFS, getStyle } from "../engine/style";
import { formatKeyLabel, KEYS } from "../engine/theory";
import type { KeyLabelSystem, MeterLabel, MusicStyle } from "../engine/types";
import { LENGTHS, TEMPO_RANGE, type Settings } from "../settings";

interface ControlsProps {
  settings: Settings;
  level: LevelDef;
  onChange: (patch: Partial<Settings>) => void;
}

function tempoName(tempo: number): string {
  if (tempo < 60) return "Largo";
  if (tempo < 76) return "Adagio";
  if (tempo < 100) return "Andante";
  if (tempo < 120) return "Moderato";
  return "Allegro";
}

const MAJOR_KEYS = KEYS.filter((key) => key.mode === "major");
const MINOR_KEYS = KEYS.filter((key) => key.mode === "minor");

export function Controls({ settings, level, onChange }: ControlsProps) {
  const style = getStyle(settings.style);

  return (
    <aside className="sidebar" aria-label="Exercise settings">
      <section className="control-block">
        <div className="control-heading">
          <label htmlFor="difficulty">Difficulty</label>
          <span className="level-pill">Level {level.level}</span>
        </div>
        <input
          id="difficulty"
          className="slider"
          type="range"
          min={1}
          max={10}
          step={1}
          value={settings.difficulty}
          onChange={(event) => onChange({ difficulty: Number(event.target.value) })}
        />
        <div className="range-scale" aria-hidden="true">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
        <p className="level-name">{level.name}</p>
        <p className="level-blurb">{level.blurb}</p>
      </section>

      <section className="control-block">
        <label htmlFor="style">Style</label>
        <select
          id="style"
          className="select"
          value={settings.style}
          onChange={(event) => onChange({ style: event.target.value as MusicStyle })}
        >
          {STYLE_DEFS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="control-hint">{style.blurb}</p>
      </section>

      <section className="control-block">
        <label htmlFor="key">Key</label>
        <select
          id="key"
          className="select"
          value={settings.keyId}
          onChange={(event) => onChange({ keyId: event.target.value })}
        >
          <option value="auto">Auto — surprise me</option>
          <optgroup label="Major">
            {MAJOR_KEYS.map((key) => (
              <option key={key.id} value={key.id}>
                {formatKeyLabel(key, settings.keyLabel)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Minor">
            {MINOR_KEYS.map((key) => (
              <option key={key.id} value={key.id}>
                {formatKeyLabel(key, settings.keyLabel)}
              </option>
            ))}
          </optgroup>
        </select>
      </section>

      <section className="control-block">
        <label htmlFor="key-label">Key names</label>
        <select
          id="key-label"
          className="select"
          value={settings.keyLabel}
          onChange={(event) => onChange({ keyLabel: event.target.value as KeyLabelSystem })}
        >
          <option value="letters">Letters (C, D, E)</option>
          <option value="solfege">Solfège (Do, Re, Mi)</option>
        </select>
      </section>

      <section className="control-block">
        <label htmlFor="meter">Time signature</label>
        <select
          id="meter"
          className="select"
          value={settings.meter}
          onChange={(event) => onChange({ meter: event.target.value as MeterLabel | "auto" })}
        >
          <option value="auto">Auto</option>
          <option value="4/4">4/4</option>
          <option value="3/4">3/4</option>
          <option value="2/4">2/4</option>
        </select>
      </section>

      <section className="control-block">
        <span className="control-label">Length</span>
        <div className="segmented" role="group" aria-label="Exercise length in bars">
          {LENGTHS.map((length) => (
            <button
              key={length}
              type="button"
              className={settings.measures === length ? "segment active" : "segment"}
              aria-pressed={settings.measures === length}
              onClick={() => onChange({ measures: length })}
            >
              {length}
            </button>
          ))}
        </div>
        <p className="control-hint">bars</p>
      </section>

      <section className="control-block">
        <div className="control-heading">
          <label htmlFor="tempo">Tempo</label>
          <span className="tempo-value">♩ = {settings.tempo}</span>
        </div>
        <input
          id="tempo"
          className="slider"
          type="range"
          min={TEMPO_RANGE.min}
          max={TEMPO_RANGE.max}
          step={2}
          value={settings.tempo}
          onChange={(event) => onChange({ tempo: Number(event.target.value) })}
        />
        <p className="control-hint">{tempoName(settings.tempo)}</p>
      </section>

      <section className="control-block toggle-block">
        <div>
          <span className="control-label">Metronome</span>
          <p className="control-hint">Clicks on every beat while playing</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.metronome}
          aria-label="Metronome"
          className={settings.metronome ? "switch on" : "switch"}
          onClick={() => onChange({ metronome: !settings.metronome })}
        >
          <span className="switch-knob" />
        </button>
      </section>
    </aside>
  );
}
