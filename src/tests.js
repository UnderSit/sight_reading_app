(function () {
  'use strict';

  const T = window.MusicTheory;
  const RNG = window.RNG;
  const R = window.RhythmEngine;
  const G = window.ExerciseGenerator;
  const A = window.AudioEngine;
  const S = window.StorageManager;

  function fail(message) {
    throw new Error(message || 'Verifica fallita.');
  }

  function assert(condition, message) {
    if (!condition) fail(message);
  }

  function equal(actual, expected, message) {
    if (actual !== expected) {
      fail((message || 'Valore inatteso') + ': atteso ' + expected + ', ottenuto ' + actual + '.');
    }
  }

  function deepEqual(actual, expected, message) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) fail((message || 'Struttura diversa') + ': ' + left + ' ≠ ' + right + '.');
  }

  function checkExercise(exercise, expectedMeasures) {
    assert(exercise && typeof exercise === 'object', 'Esercizio mancante.');
    equal(exercise.version, 2, 'Versione esercizio');
    assert(Array.isArray(exercise.phrases) && exercise.phrases.length, 'Frasi mancanti.');
    assert(Array.isArray(exercise.progression) && exercise.progression.length, 'Progressione mancante.');
    assert(typeof exercise.style === 'string' && exercise.style.length, 'Stile mancante.');
    assert(typeof exercise.cadence === 'string' && exercise.cadence.length, 'Cadenza mancante.');
    equal(exercise.measures.length, expectedMeasures, 'Numero di misure');
    equal(exercise.measureCount, expectedMeasures, 'measureCount');
    equal(exercise.totalTicks, exercise.meterInfo.measureTicks * expectedMeasures, 'Durata totale');
    assert(exercise.events.length > 0, 'Nessun evento generato.');
    assert(exercise.noteCount > 0, 'Nessuna nota generata.');
    assert(exercise.summary.includes(exercise.key.nameIt), 'Riepilogo senza tonalità.');
    const ids = new Set();
    const noteCount = exercise.events.filter((event) => !event.rest).reduce((sum, event) => sum + event.pitches.length, 0);
    equal(exercise.noteCount, noteCount, 'Conteggio note');
    const voices = new Map();
    exercise.events.forEach((event) => {
      assert(event.id, 'Evento senza id.');
      assert(!ids.has(event.id), 'Id evento duplicato: ' + event.id + '.');
      ids.add(event.id);
      assert(event.duration > 0, 'Durata non positiva.');
      equal(event.duration, T.durationTicks(event), 'Durata evento ' + event.id);
      const measure = exercise.measures[event.measureIndex];
      assert(measure, 'Misura evento non valida.');
      const measureStart = event.measureIndex * exercise.meterInfo.measureTicks;
      assert(event.startTick >= measureStart, 'Evento prima della misura.');
      assert(event.startTick + event.duration <= measureStart + measure.ticks, 'Evento oltre la misura.');
      equal(event.localStart, event.startTick - measureStart, 'localStart incoerente.');
      if (event.rest) {
        equal(event.pitches.length, 0, 'Pausa con altezze');
      } else {
        assert(event.pitches.length > 0, 'Evento senza altezze.');
        let previousMidi = -1;
        event.pitches.forEach((pitch) => {
          assert(pitch.midi >= 21 && pitch.midi <= 108, 'Altezza fuori pianoforte.');
          assert(pitch.midi > previousMidi, 'Altezze non ordinate o duplicate.');
          previousMidi = pitch.midi;
        });
      }
      const key = event.part + ':' + event.voice;
      if (!voices.has(key)) voices.set(key, []);
      voices.get(key).push(event);
    });
    voices.forEach((events, key) => {
      events.sort((left, right) => left.startTick - right.startTick);
      for (let index = 1; index < events.length; index++) {
        equal(events[index].startTick, events[index - 1].startTick + events[index - 1].duration, 'Continuità voce ' + key);
      }
      events.forEach((event, index) => {
        const previous = index > 0 ? events[index - 1] : null;
        const next = index + 1 < events.length ? events[index + 1] : null;
        if (event.tieFromPrev) {
          assert(previous && previous.tieToNext, 'Legatura entrante senza uscente.');
          assert(previous && !previous.rest && previous.pitches[0].midi === event.pitches[0].midi, 'Legatura fra altezze diverse.');
        }
        if (event.tieToNext) {
          assert(next && next.tieFromPrev, 'Legatura uscente senza entrante.');
          assert(next && !next.rest && next.pitches[0].midi === event.pitches[0].midi, 'Legatura uscente incoerente.');
        }
      });
    });
    exercise.measures.forEach((measure) => {
      exercise.parts.forEach((part) => {
        for (let voice = 0; voice < part.voiceCount; voice++) {
          const total = measure.events
            .filter((event) => event.part === part.role && event.voice === voice)
            .reduce((sum, event) => sum + event.duration, 0);
          equal(total, exercise.meterInfo.measureTicks, 'Misura ' + (measure.index + 1) + ' voce ' + voice);
        }
      });
    });
  }

  function fakeStorage() {
    return {
      data: new Map(),
      getItem(key) { return this.data.has(key) ? this.data.get(key) : null; },
      setItem(key, value) { this.data.set(key, value); },
      removeItem(key) { this.data.delete(key); }
    };
  }

  function renderFixture(width) {
    const container = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: width });
    return {
      container,
      svg,
      dispose() {
        document.body.removeChild(container);
      }
    };
  }

  function tests() {
    return [
      {
        name: 'Teoria musicale',
        cases: [
          ['Altezze e nomi', () => {
            equal(T.midiFromPitch({ letter: 'C', accidental: 0, octave: 4 }), 60, 'Do4');
            equal(T.midiFromPitch({ letter: 'A', accidental: 0, octave: 4 }), 69, 'La4');
            equal(T.pitchFromMidi(60).letter, 'C', 'MIDI 60');
            equal(T.formatPitchIt({ letter: 'B', accidental: -1, octave: 3 }, true), 'Si♭3', 'Nome bemolle');
            deepEqual(T.parseNoteName('F#5'), { letter: 'F', accidental: 1, octave: 5 }, 'Analisi nota');
          }],
          ['Righi e tagli', () => {
            equal(T.staffStep({ letter: 'E', accidental: 0, octave: 4 }, 'treble'), 0, 'Mi4 violino');
            equal(T.staffStep({ letter: 'G', accidental: 0, octave: 2 }, 'bass'), 0, 'Sol2 basso');
            equal(T.ledgerSteps(0).length, 0, 'Nessun taglio');
            equal(T.ledgerSteps(-2).length, 1, 'Taglio sotto');
            equal(T.ledgerSteps(10).length, 1, 'Taglio sopra');
          }],
          ['Tonalità', () => {
            equal(T.keySignatureSteps('treble', T.getKeyById('C')).length, 0, 'Do');
            equal(T.keySignatureSteps('treble', T.getKeyById('G')).length, 1, 'Sol');
            deepEqual(T.keySignatureSteps('bass', T.getKeyById('F')), [2], 'Fa basso');
            equal(T.displayAccidental({ letter: 'F', accidental: 0, octave: 4 }, T.getKeyById('G')), 'natural', 'Naturale che annulla il diesis');
            equal(T.displayAccidental({ letter: 'F', accidental: 1, octave: 4 }, T.getKeyById('G')), 0, 'Diesis in armatura');
            equal(T.MAJOR_KEYS.length, 15, 'Maggiori');
            equal(T.MINOR_KEYS.length, 15, 'Minori');
          }],
          ['Metri e durate', () => {
            equal(T.METERS['5/4'].groups.reduce((sum, group) => sum + group, 0), 2400, '5/4');
            equal(T.METERS['12/8'].measureTicks, 2880, '12/8');
            equal(T.durationTicks({ base: 'half', dots: 1 }), 1440, 'Minima puntata');
            equal(T.durationTicks({ base: 'eighth', tuplet: { num: 3, den: 2 } }), 160, 'Terzina');
            equal(T.tokenNameShortIt({ base: 'quarter', dots: 1 }), 'semiminima puntata', 'Nome durata');
          }]
        ]
      },
      {
        name: 'Generatore casuale',
        cases: [
          ['Sequenze riproducibili', () => {
            const first = RNG.create(123456);
            const second = RNG.create(123456);
            const third = RNG.create(123457);
            const sequence = [first(), first(), first(), first()];
            const twin = [second(), second(), second(), second()];
            const other = [third(), third(), third(), third()];
            deepEqual(sequence, twin, 'Stesso seme');
            assert(sequence.some((value, index) => value !== other[index]), 'Semi diversi');
            sequence.forEach((value) => assert(value >= 0 && value < 1, 'Valore fuori intervallo.'));
          }],
          ['Interi e mescolamento', () => {
            const rng = RNG.create(8);
            for (let index = 0; index < 80; index++) {
              const value = rng.int(2, 7);
              assert(value >= 2 && value <= 7, 'Intero fuori intervallo.');
            }
            const source = [1, 2, 3, 4, 5, 6];
            deepEqual(rng.shuffle(source).slice().sort((left, right) => left - right), source, 'Elementi mescolati');
          }]
        ]
      },
      {
        name: 'Ritmo',
        cases: [
          ['Riempimento di tutti i metri', () => {
            Object.keys(T.METERS).forEach((meterName) => {
              const meter = T.METERS[meterName];
              const tokens = R.fillMeasure({ durations: ['eighth'], allowSyncopation: true }, meter, RNG.create(900 + meter.measureTicks), { attempts: 8 });
              assert(tokens.length > 0, 'Riempimento vuoto in ' + meterName + '.');
              let position = 0;
              tokens.forEach((token) => {
                equal(token.start, position, 'Posizione token ' + meterName);
                assert(token.ticks > 0, 'Token senza durata.');
                position += token.ticks;
              });
              equal(position, meter.measureTicks, 'Misura piena ' + meterName);
            });
          }],
          ['Pause e legature', () => {
            equal(R.applyRests([], { restAmount: 1 }, RNG.create(1), { restAmount: 1 }).length, 0, 'Lista vuota');
            const tokens = [
              { base: 'half', dots: 0, ticks: 960, start: 0 },
              { base: 'half', dots: 0, ticks: 960, start: 960 }
            ];
            R.addTies(tokens, { durations: ['quarter'], allowTies: true }, { chance: () => true }, T.METERS['4/4'], {});
            equal(tokens.length, 3, 'Divisione legatura');
            assert(tokens[0].tieToNext && tokens[1].tieFromPrev, 'Flag legatura');
            equal(tokens[0].ticks + tokens[1].ticks, 960, 'Durata legatura');
          }],
          ['Terzine', () => {
            const tokens = [
              { base: 'eighth', dots: 0, ticks: 240, start: 0 },
              { base: 'eighth', dots: 0, ticks: 240, start: 240 }
            ];
            const result = R.addTuplets(tokens, { durations: ['eighth'], allowTuplets: true }, { chance: () => true, pick: (items) => items[0] }, T.METERS['4/4'], { forceTuplet: true, durations: ['eighth'] });
            equal(result.inserted, true, 'Inserimento');
            equal(result.tokens.length, 3, 'Tre note');
            equal(result.tokens.reduce((sum, token) => sum + token.ticks, 0), 480, 'Durata');
          }]
        ]
      },
      {
        name: 'Generazione esercizi',
        cases: [
          ['Dodici livelli', () => {
            for (let level = 1; level <= 12; level++) {
              const config = G.clonePreset(level);
              config.seed = 1000 + level;
              const exercise = G.generate(config);
              checkExercise(exercise, config.measures);
              equal(exercise.level, level, 'Livello');
              equal(exercise.config.preset, level, 'Preset');
            }
          }],
          ['Tutti i metri', () => {
            Object.keys(T.METERS).forEach((meterName, index) => {
              const config = G.clonePreset(8);
              config.seed = 300 + index;
              config.meters = [meterName];
              config.measures = 2;
              config.keyMode = 'fixed';
              config.fixedKey = 'C';
              config.allowMinor = false;
              config.chords = 'none';
              const exercise = G.generate(config);
              checkExercise(exercise, 2);
              equal(exercise.meter, meterName, 'Metro');
            });
          }],
          ['Riproducibilità', () => {
            const config = G.clonePreset(6);
            config.seed = 314159;
            const first = G.generate(config);
            const second = G.generate(config);
            deepEqual(second.events, first.events, 'Stesso seme');
            const other = G.clonePreset(6);
            other.seed = 271828;
            assert(JSON.stringify(G.generate(other).events) !== JSON.stringify(first.events), 'Semi diversi');
          }],
          ['Stili e cadenze', () => {
            ['classical', 'hymn', 'folk', 'baroque', 'romantic'].forEach((style, index) => {
              const config = G.clonePreset(6);
              config.style = style;
              config.seed = 700 + index;
              config.cadence = 'tonal';
              config.keyMode = 'fixed';
              config.fixedKey = 'C';
              config.allowMinor = false;
              const exercise = G.generate(config);
              checkExercise(exercise, config.measures);
              equal(exercise.style, style, 'Stile ' + style);
              equal(exercise.cadence, 'tonal', 'Cadenza ' + style);
              equal(exercise.progression[0].degree, 0, 'Apertura su tonica (' + style + ')');
              const last = exercise.progression[exercise.progression.length - 1];
              equal(last.measure, exercise.measures.length - 1, 'Ultima unità nell\'ultima misura (' + style + ')');
              equal(last.degree, 0, 'Chiusura su tonica (' + style + ')');
            });
            const open = G.clonePreset(6);
            open.seed = 811;
            open.cadence = 'open';
            open.keyMode = 'fixed';
            open.fixedKey = 'C';
            open.allowMinor = false;
            const openExercise = G.generate(open);
            checkExercise(openExercise, open.measures);
            equal(openExercise.progression[openExercise.progression.length - 1].degree, 4, 'Cadenza sospesa su dominante');
          }],
          ['Frasi e ripetizione', () => {
            [0, 0.5, 0.9].forEach((repetition) => {
              const config = G.clonePreset(8);
              config.seed = 650 + Math.round(repetition * 10);
              config.measures = 8;
              config.phraseLength = 4;
              config.phraseRepetition = repetition;
              config.keyMode = 'fixed';
              config.fixedKey = 'D';
              const exercise = G.generate(config);
              checkExercise(exercise, 8);
              equal(exercise.phrases.length, 2, 'Numero frasi con ripetizione ' + repetition);
              exercise.phrases.forEach((phrase, index) => {
                equal(phrase.startMeasure, index * 4, 'Inizio frase ' + index);
                equal(phrase.endMeasure, index * 4 + 3, 'Fine frase ' + index);
              });
            });
          }],
          ['Metriche di qualità', () => {
            let chromaticUnexpected = 0;
            let chromaticTotal = 0;
            let tiesUnexpected = 0;
            let tiesTotal = 0;
            let steps = 0;
            let largeLeaps = 0;
            let intervals = 0;
            const pitches = new Set();
            for (let level = 1; level <= 12; level++) {
              for (let seed = 1; seed <= 3; seed++) {
                const config = G.clonePreset(level);
                config.seed = level * 1000 + seed;
                const exercise = G.generate(config);
                checkExercise(exercise, config.measures);
                const melody = exercise.events
                  .filter((event) => event.part === 'right' && event.voice === 0 && !event.rest)
                  .sort((left, right) => left.startTick - right.startTick);
                let previous = null;
                melody.forEach((event) => {
                  event.pitches.forEach((pitch) => pitches.add(pitch.midi));
                  if (event.chromatic) {
                    chromaticTotal += 1;
                    if (!config.allowChromatic) chromaticUnexpected += 1;
                  }
                  if (event.tieFromPrev) {
                    tiesTotal += 1;
                    if (!config.allowTies) tiesUnexpected += 1;
                  }
                  if (!previous) {
                    previous = event;
                    return;
                  }
                  if (event.tieFromPrev) return;
                  const delta = Math.abs(event.pitches[0].midi - previous.pitches[0].midi);
                  intervals += 1;
                  if (delta <= 2) steps += 1;
                  if (delta >= 8) largeLeaps += 1;
                  previous = event;
                });
                exercise.measures.forEach((measure, index) => {
                  const notes = measure.events.filter((event) => event.part === 'right' && event.voice === 0 && !event.rest);
                  assert(notes.length > 0, 'Misura ' + (index + 1) + ' senza note melodiche (livello ' + level + ').');
                });
              }
            }
            equal(chromaticUnexpected, 0, 'Cromatismo senza autorizzazione');
            assert(chromaticTotal > 0, 'Nessun cromatismo nei livelli avanzati.');
            equal(tiesUnexpected, 0, 'Legature senza autorizzazione');
            assert(tiesTotal > 0, 'Nessuna legatura nel percorso.');
            assert(intervals > 0, 'Intervalli mancanti.');
            assert(steps / intervals >= 0.25, 'Percorso troppo ricco di salti.');
            assert(largeLeaps / intervals <= 0.3, 'Salti ampi troppo frequenti.');
            assert(pitches.size >= 20, 'Varietà di altezze insufficiente.');
          }],
          ['Validazione', () => {
            const config = G.clonePreset(1);
            config.staff = 'treble';
            config.rhLow = 'G5';
            config.rhHigh = 'C4';
            const validation = G.validateConfig(config);
            equal(validation.valid, false, 'Estensione invertita');
            assert(validation.errors.length > 0, 'Errore non descritto');
            equal(G.parseSeed('4294967295'), 4294967295, 'Seme massimo');
            equal(G.parseSeed('-1'), null, 'Seme negativo');
            equal(G.parseSeed('abc'), null, 'Seme non numerico');
          }]
        ]
      },
      {
        name: 'Timeline audio',
        cases: [
          ['Legature', () => {
            const timeline = A.buildTimeline({
              tempo: 60,
              totalTicks: 960,
              events: [
                { id: 'a', part: 'r', voice: 0, startTick: 0, duration: 480, tieToNext: true, tieFromPrev: false, rest: false, pitches: [{ midi: 60 }] },
                { id: 'b', part: 'r', voice: 0, startTick: 480, duration: 480, tieToNext: false, tieFromPrev: true, rest: false, pitches: [{ midi: 60 }] }
              ]
            });
            equal(timeline.notes.length, 1, 'Una nota');
            equal(timeline.notes[0].durationTicks, 960, 'Durata');
            deepEqual(timeline.notes[0].eventIds, ['a', 'b'], 'Eventi');
            equal(timeline.notes[0].durationSeconds, 2, 'Secondi');
            equal(timeline.durationSeconds, 2, 'Durata totale');
          }],
          ['Pause e frequenze', () => {
            const timeline = A.buildTimeline({
              tempo: 120,
              totalTicks: 960,
              events: [
                { id: 'a', part: 'l', voice: 0, startTick: 0, duration: 240, rest: false, pitches: [{ midi: 48 }] },
                { id: 'r', part: 'l', voice: 0, startTick: 240, duration: 240, rest: true, pitches: [] },
                { id: 'b', part: 'l', voice: 0, startTick: 480, duration: 480, rest: false, pitches: [{ midi: 50 }] }
              ]
            });
            equal(timeline.notes.length, 2, 'Due note');
            equal(timeline.notes[1].startTick, 480, 'Ripresa');
            equal(timeline.notes[1].startSeconds, 0.5, 'Secondi');
            assert(Math.abs(A.midiToFrequency(69) - 440) < 0.0001, 'La 440');
          }]
        ]
      },
      {
        name: 'Archivio locale',
        cases: [
          ['Statistiche', () => {
            const storage = new S(fakeStorage());
            const stats = S.emptyStats();
            stats.totalExercises = 4;
            stats.quizAttempts = 3;
            stats.quizCorrect = 9;
            stats.recent = [{ date: '2026-01-01T10:00:00.000Z', summary: 'Do maggiore', level: 2, completed: true }];
            storage.saveStats(stats);
            const loaded = storage.loadStats();
            equal(loaded.totalExercises, 4, 'Totale');
            equal(loaded.quizCorrect, 3, 'Limite precisione');
            equal(loaded.recent.length, 1, 'Recenti');
            storage.clearStats();
            equal(storage.loadStats().totalExercises, 0, 'Azzeramento');
          }],
          ['Impostazioni e tema', () => {
            const storage = new S(fakeStorage());
            storage.saveSettings({ preset: 3, seed: 22 });
            deepEqual(storage.loadSettings(), { preset: 3, seed: 22 }, 'Impostazioni');
            equal(storage.loadTheme(), 'light', 'Tema predefinito');
            storage.saveTheme('dark');
            equal(storage.loadTheme(), 'dark', 'Tema salvato');
          }],
          ['Dati corrotti', () => {
            const corrupt = new S({ getItem: () => '{', setItem: () => {}, removeItem: () => {} });
            equal(corrupt.loadStats().quizAttempts, 0, 'JSON corrotto');
            const fallback = new S({ getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => {} });
            fallback.saveTheme('dark');
            equal(fallback.loadTheme(), 'dark', 'Fallback in memoria');
          }]
        ]
      },
      {
        name: 'Notazione SVG',
        cases: [
          ['Dodici livelli', () => {
            const fixture = renderFixture(900);
            try {
              for (let level = 1; level <= 12; level++) {
                const config = G.clonePreset(level);
                config.seed = 500 + level;
                const exercise = G.generate(config);
                const renderer = new window.ScoreRenderer(fixture.svg, fixture.container);
                renderer.render(exercise, { showNames: true });
                equal(fixture.svg.querySelectorAll('.note-group').length, exercise.events.length, 'Gruppi nota livello ' + level);
                assert(fixture.svg.querySelectorAll('.staff-line').length >= 5, 'Righe livello ' + level);
                assert(fixture.svg.querySelectorAll('.notehead').length > 0, 'Teste nota livello ' + level);
                assert(fixture.svg.querySelectorAll('.stem').length > 0, 'Gambi livello ' + level);
                assert(fixture.svg.querySelectorAll('.note-label').length > 0, 'Nomi nota livello ' + level);
                assert(fixture.svg.getAttribute('viewBox'), 'viewBox mancante');
                renderer.setShowNames(false);
                equal(fixture.svg.querySelectorAll('.note-label').length, 0, 'Nomi nascosti livello ' + level);
              }
            } finally {
              fixture.dispose();
            }
          }],
          ['Gruppi di note irregolari', () => {
            const fixture = renderFixture(900);
            try {
              ['5/8', '7/8'].forEach((meterName) => {
                const boundaries = T.beatPositions(meterName).filter((tick) => tick > 0);
                for (let seed = 1; seed <= 3; seed++) {
                  const config = G.clonePreset(8);
                  config.seed = seed * 37 + 5;
                  config.meters = [meterName];
                  config.measures = 4;
                  config.durations = ['eighth'];
                  config.allowDots = false;
                  config.allowTies = false;
                  config.allowTuplets = false;
                  config.allowSyncopation = false;
                  config.restAmount = 0;
                  config.chords = 'none';
                  config.staff = 'treble';
                  config.voices = 1;
                  config.keyMode = 'fixed';
                  config.fixedKey = 'C';
                  config.allowMinor = false;
                  const exercise = G.generate(config);
                  let expected = 0;
                  exercise.measures.forEach((measure) => {
                    let previous = null;
                    let currentKey = null;
                    let size = 0;
                    const flush = () => {
                      if (size >= 2) expected += 1;
                      size = 0;
                    };
                    measure.events
                      .filter((event) => event.part === 'right' && event.voice === 0 && !event.rest)
                      .sort((left, right) => left.localStart - right.localStart)
                      .forEach((event) => {
                        const key = String(boundaries.filter((tick) => tick <= event.localStart).length);
                        const contiguous = previous && previous.localStart + previous.duration === event.localStart;
                        if (key !== currentKey || !contiguous) {
                          flush();
                          currentKey = key;
                        }
                        size += 1;
                        previous = event;
                      });
                    flush();
                  });
                  const renderer = new window.ScoreRenderer(fixture.svg, fixture.container);
                  renderer.render(exercise, {});
                  equal(fixture.svg.querySelectorAll('.beam').length, expected, 'Gruppi ' + meterName + ' seed ' + seed);
                }
              });
            } finally {
              fixture.dispose();
            }
          }],
          ['Stati e misure strette', () => {
            const fixture = renderFixture(360);
            try {
              const config = G.clonePreset(8);
              config.seed = 77;
              const exercise = G.generate(config);
              const target = exercise.events.find((event) => !event.rest && event.pitches.length);
              const renderer = new window.ScoreRenderer(fixture.svg, fixture.container);
              renderer.render(exercise, {});
              assert(fixture.svg.querySelectorAll('.note-group').length > 0, 'Notazione');
              assert(Number(fixture.svg.getAttribute('viewBox').split(' ')[2]) >= 320, 'Larghezza minima');
              renderer.setQuizTarget(target.id, null);
              assert(fixture.svg.querySelector('.quiz-target-ring'), 'Anello quiz');
              renderer.setPlaying([target.id]);
              assert(fixture.svg.querySelector('.note-group.is-playing'), 'Evidenziazione ascolto');
              renderer.clearQuizTarget();
              renderer.clearPlaying();
              assert(!fixture.svg.querySelector('.quiz-target-ring'), 'Anello rimosso');
              assert(!fixture.svg.querySelector('.note-group.is-playing'), 'Ascolto rimosso');
            } finally {
              fixture.dispose();
            }
          }]
        ]
      }
    ];
  }

  function runSightReadingTests() {
    const suites = tests();
    let total = 0;
    let passed = 0;
    let failed = 0;
    const results = suites.map((suite) => {
      const testResults = suite.cases.map(([name, run]) => {
        total += 1;
        try {
          run();
          passed += 1;
          return { name, pass: true, detail: '' };
        } catch (error) {
          failed += 1;
          return { name, pass: false, detail: String(error && error.message ? error.message : error) };
        }
      });
      return { name: suite.name, tests: testResults };
    });
    return { total, passed, failed, suites: results };
  }

  window.runSightReadingTests = runSightReadingTests;
})();
