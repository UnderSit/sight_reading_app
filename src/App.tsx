import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setMetronomeEnabled, startPlayback, stopPlayback } from "./audio/player";
import { Controls } from "./components/Controls";
import { ScoreView } from "./components/ScoreView";
import { getLevel } from "./engine/difficulty";
import { generateExercise } from "./engine/generate";
import { randomSeed } from "./engine/rng";
import { getStyle } from "./engine/style";
import { formatKeyLabel } from "./engine/theory";
import {
  loadSeed,
  loadSettings,
  saveSeed,
  saveSettings,
  type Settings,
} from "./settings";

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [seed, setSeed] = useState<number>(() => loadSeed() ?? randomSeed());
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [activeMeasure, setActiveMeasure] = useState<number | null>(null);
  const [startMeasure, setStartMeasure] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const playToken = useRef(0);
  const previousTempo = useRef(settings.tempo);

  const exercise = useMemo(
    () =>
      generateExercise({
        seed,
        difficulty: settings.difficulty,
        measures: settings.measures,
        keyId: settings.keyId,
        meter: settings.meter,
        style: settings.style,
      }),
    [seed, settings.difficulty, settings.measures, settings.keyId, settings.meter, settings.style],
  );

  const level = getLevel(settings.difficulty);
  const style = getStyle(exercise.style);
  const keyLabel = formatKeyLabel(exercise.key, settings.keyLabel);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveSeed(seed);
  }, [seed]);

  const handleStop = useCallback(() => {
    playToken.current += 1;
    stopPlayback();
    setPlaying(false);
    setCountIn(false);
    setActiveMeasure(null);
  }, []);

  const beginPlayback = useCallback(
    async (fromMeasure: number) => {
      setPlaybackError(null);
      const token = playToken.current + 1;
      playToken.current = token;
      setPlaying(true);
      setCountIn(true);
      setActiveMeasure(null);

      try {
        await startPlayback(
          exercise,
          settings.tempo,
          settings.metronome,
          {
            onCountIn: () => {
              if (playToken.current !== token) return;
              setCountIn(true);
              setActiveMeasure(null);
            },
            onMeasure: (index) => {
              if (playToken.current !== token) return;
              setCountIn(false);
              setActiveMeasure(index);
            },
            onEnded: () => {
              if (playToken.current !== token) return;
              playToken.current += 1;
              setPlaying(false);
              setCountIn(false);
              setActiveMeasure(null);
            },
          },
          { startMeasure: fromMeasure },
        );
        if (playToken.current !== token) {
          return;
        }
      } catch (cause) {
        if (playToken.current !== token) return;
        playToken.current += 1;
        setPlaying(false);
        setCountIn(false);
        setActiveMeasure(null);
        setPlaybackError(
          cause instanceof Error
            ? `Audio could not start: ${cause.message}`
            : "Audio could not start. Try a different browser or check your sound settings.",
        );
      }
    },
    [exercise, settings.metronome, settings.tempo],
  );

  const handlePlay = useCallback(async () => {
    if (playing) {
      handleStop();
      return;
    }

    await beginPlayback(startMeasure);
  }, [beginPlayback, handleStop, playing, startMeasure]);

  const handleSelectMeasure = useCallback(
    (index: number) => {
      setStartMeasure(index);
      if (playing) void beginPlayback(index);
    },
    [beginPlayback, playing],
  );

  const newExercise = useCallback(() => {
    handleStop();
    setPlaybackError(null);
    setSeed((previous) => {
      let next = randomSeed();
      while (next === previous) next = randomSeed();
      return next;
    });
  }, [handleStop]);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  };

  useEffect(() => {
    handleStop();
  }, [exercise, handleStop]);

  useEffect(() => {
    setStartMeasure(0);
  }, [exercise]);

  useEffect(() => {
    if (previousTempo.current === settings.tempo) return;
    previousTempo.current = settings.tempo;
    handleStop();
  }, [settings.tempo, handleStop]);

  useEffect(() => {
    setMetronomeEnabled(settings.metronome);
  }, [settings.metronome]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return;
        if (["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName)) return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        void handlePlay();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "g") {
        event.preventDefault();
        newExercise();
      } else if (key === "m") {
        event.preventDefault();
        updateSettings({ metronome: !settings.metronome });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const status = countIn
    ? "Count-in"
    : playing
      ? activeMeasure !== null
        ? `Bar ${activeMeasure + 1} of ${exercise.measures.length}`
        : "Starting…"
      : startMeasure > 0
        ? `Ready from bar ${startMeasure + 1}`
        : "Ready";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♪
          </span>
          <div>
            <h1>Sightline</h1>
            <p>Piano sight reading, off the page.</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="local-note">100% local · no sign-in</span>
          <button type="button" className="ghost-button" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="primary-button" onClick={newExercise}>
            New exercise <kbd>G</kbd>
          </button>
        </div>
      </header>

      <main className="layout">
        <Controls settings={settings} level={level} onChange={updateSettings} />

        <section className="content" aria-label="Score and playback">
          <div className="score-toolbar">
            <div className="transport">
              <button
                type="button"
                className={playing ? "play-button stop" : "play-button"}
                onClick={() => void handlePlay()}
                aria-label={
                  playing
                    ? "Stop playback"
                    : startMeasure > 0
                      ? `Play from bar ${startMeasure + 1}`
                      : "Play exercise"
                }
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="1.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5.5 18.5 12 8 18.5Z" />
                  </svg>
                )}
                {playing ? "Stop" : "Play"}
                <kbd>Space</kbd>
              </button>
              <div className="status" role="status" aria-live="polite">
                <span className={playing ? "status-dot live" : "status-dot"} />
                {status}
              </div>
            </div>

            <div className="toolbar-meta">
              <span>{keyLabel}</span>
              <span>{style.label}</span>
              <span>{exercise.meter.label}</span>
              <span>♩ = {settings.tempo}</span>
              <span>{settings.metronome ? "click on" : "click off"}</span>
            </div>
          </div>

          {playbackError && (
            <div className="error-banner" role="alert">
              {playbackError}
            </div>
          )}

          <article className="sheet">
            <header className="sheet-head">
              <div>
                <p className="eyebrow">
                  Level {exercise.level} · {level.name}
                </p>
                <h2>{keyLabel}</h2>
              </div>
              <div className="sheet-meta">
                <span>{style.label}</span>
                <span>{exercise.meter.label}</span>
                <span>{settings.measures} bars</span>
                <span>♩ = {settings.tempo}</span>
                <span className="seed" title="This seed recreates today's exercise">
                  seed {exercise.seed.toString(36).toUpperCase()}
                </span>
              </div>
            </header>

            <ScoreView
              exercise={exercise}
              activeMeasure={activeMeasure}
              startMeasure={startMeasure}
              onSelectMeasure={handleSelectMeasure}
            />

            <footer className="sheet-foot">
              <span>Sightline</span>
              <span>{settings.keyId === "auto" ? "key chosen by seed" : "fixed key"}</span>
            </footer>
          </article>

          <p className="shortcut-hint">
            <kbd>Space</kbd> play / stop · <kbd>G</kbd> new exercise · <kbd>M</kbd> metronome ·
            click a bar to start there
          </p>
        </section>
      </main>
    </div>
  );
}
