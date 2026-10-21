(function () {
  'use strict';

  const T = window.MusicTheory;
  const R = window.RhythmEngine;
  const RNG = window.RNG;

  const PRESETS = {
    1: {
      level: 1,
      name: 'Primo passo',
      shortName: 'Fondamenta',
      description: 'Note naturali, valori lunghi e una sola mano. Un punto di partenza tranquillo per familiarizzare con il pentagramma.',
      focus: ['Solo mano destra', 'Note naturali', '4/4'],
      staff: 'treble',
      rhLow: 'C4', rhHigh: 'G5', lhLow: 'C2', lhHigh: 'C4',
      maxLedger: 1,
      meters: ['4/4'],
      durations: ['whole', 'half', 'quarter'],
      allowDots: false,
      restAmount: 0.06,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'small',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 60,
      tempoMax: 76,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 0,
      allowMinor: false,
      style: 'folk',
      minorFlavor: 'natural',
      harmonicComplexity: 'monophonic',
      cadence: 'none',
      phraseLength: 2,
      phraseRepetition: 0.6,
      sequence: 0
    },
    2: {
      level: 2,
      name: 'Passo sicuro',
      shortName: 'Crome e salti',
      description: 'Entrano le crome, i metri semplici e qualche salto melodico. La lettura comincia a scorrere.',
      focus: ['Mano destra', 'Crome', '2/4 · 3/4 · 4/4'],
      staff: 'treble',
      rhLow: 'C4', rhHigh: 'A5', lhLow: 'C2', lhHigh: 'C4',
      maxLedger: 2,
      meters: ['2/4', '3/4', '4/4'],
      durations: ['half', 'quarter', 'eighth'],
      allowDots: false,
      restAmount: 0.1,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 66,
      tempoMax: 84,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 1,
      allowMinor: false,
      style: 'folk',
      minorFlavor: 'natural',
      harmonicComplexity: 'monophonic',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.55,
      sequence: 0.2
    },
    3: {
      level: 3,
      name: 'Due mani',
      shortName: 'Grande pentagramma',
      description: 'Il grande pentagramma: mano destra e mano sinistra insieme, con punti, pause e metri composti semplici.',
      focus: ['Grande pentagramma', 'Note puntate', '3/8 · 2/2'],
      staff: 'grand',
      rhLow: 'C4', rhHigh: 'C6', lhLow: 'C2', lhHigh: 'C4',
      maxLedger: 2,
      meters: ['2/4', '3/4', '4/4', '2/2', '3/8'],
      durations: ['whole', 'half', 'quarter', 'eighth'],
      allowDots: true,
      restAmount: 0.12,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 60,
      tempoMax: 80,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 2,
      allowMinor: false,
      style: 'classical',
      minorFlavor: 'natural',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.6,
      sequence: 0.25
    },
    4: {
      level: 4,
      name: 'Dettagli',
      shortName: 'Semicrome',
      description: 'Più dettagli ritmici e tonalità con alterazioni fino a quattro diesis o bemolli. La mano sinistra diventa indipendente.',
      focus: ['Grande pentagramma', 'Semicrome', 'Fino a 4 alterazioni'],
      staff: 'grand',
      rhLow: 'B3', rhHigh: 'D6', lhLow: 'G2', lhHigh: 'E4',
      maxLedger: 2,
      meters: ['2/4', '3/4', '4/4', '2/2'],
      durations: ['whole', 'half', 'quarter', 'eighth', 'sixteenth'],
      allowDots: true,
      restAmount: 0.15,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 66,
      tempoMax: 92,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 4,
      allowMinor: false,
      style: 'classical',
      minorFlavor: 'natural',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.55,
      sequence: 0.3
    },
    5: {
      level: 5,
      name: 'Espressione',
      shortName: 'Legature e accordi',
      description: 'Legature, sincopi, tonalità minori e primi accordi in blocco. La musica comincia a respirare.',
      focus: ['Legature e sincopi', 'Tonalità minori', 'Accordi'],
      staff: 'grand',
      rhLow: 'A3', rhHigh: 'E6', lhLow: 'F2', lhHigh: 'F4',
      maxLedger: 3,
      meters: ['2/4', '3/4', '4/4'],
      durations: ['half', 'quarter', 'eighth', 'sixteenth'],
      allowDots: true,
      restAmount: 0.18,
      allowTies: true,
      allowSyncopation: true,
      allowTuplets: false,
      allowChromatic: true,
      leap: 'medium',
      chords: 'block',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 60,
      tempoMax: 88,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 4,
      allowMinor: true,
      style: 'romantic',
      minorFlavor: 'mixed',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.5,
      sequence: 0.35
    },
    6: {
      level: 6,
      name: 'Onde composte',
      shortName: 'Metri composti',
      description: 'Il respiro del 6/8 e del 9/8, con accordi, legature e sincopi. Il ritmo cambia colore.',
      focus: ['6/8 · 9/8', 'Accordi', 'Legature'],
      staff: 'grand',
      rhLow: 'A3', rhHigh: 'E6', lhLow: 'F2', lhHigh: 'F4',
      maxLedger: 3,
      meters: ['6/8', '9/8', '3/4'],
      durations: ['half', 'quarter', 'eighth', 'sixteenth'],
      allowDots: true,
      restAmount: 0.18,
      allowTies: true,
      allowSyncopation: true,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'block',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 72,
      tempoMax: 100,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 5,
      allowMinor: true,
      style: 'folk',
      minorFlavor: 'natural',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.6,
      sequence: 0.3
    },
    7: {
      level: 7,
      name: 'Terzine',
      shortName: 'Tuplet e 5/4',
      description: 'Terzine, 5/4, 12/8 e passaggi più densi. Serve costanza per tenere il polso.',
      focus: ['Terzine', '5/4 · 12/8', 'Sincopi'],
      staff: 'grand',
      rhLow: 'A3', rhHigh: 'E6', lhLow: 'F2', lhHigh: 'F4',
      maxLedger: 3,
      meters: ['5/4', '12/8', '6/8', '4/4'],
      durations: ['half', 'quarter', 'eighth', 'sixteenth'],
      allowDots: true,
      restAmount: 0.18,
      allowTies: true,
      allowSyncopation: true,
      allowTuplets: true,
      allowChromatic: false,
      leap: 'wide',
      chords: 'block',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 72,
      tempoMax: 104,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 6,
      allowMinor: true,
      style: 'baroque',
      minorFlavor: 'mixed',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.5,
      sequence: 0.4
    },
    8: {
      level: 8,
      name: 'Prima vista',
      shortName: 'Tutto insieme',
      description: 'Tutti i metri, le biscrome, due voci, accordi e alterazioni. Il livello per chi vuole leggere davvero a prima vista.',
      focus: ['Tutti i metri', 'Due voci', 'Biscrome'],
      staff: 'grand',
      rhLow: 'G3', rhHigh: 'G6', lhLow: 'E2', lhHigh: 'G4',
      maxLedger: 4,
      meters: ['2/4', '3/4', '4/4', '2/2', '3/8', '6/8', '9/8', '12/8', '5/4', '5/8', '7/8'],
      durations: ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'],
      allowDots: true,
      restAmount: 0.2,
      allowTies: true,
      allowSyncopation: true,
      allowTuplets: true,
      allowChromatic: true,
      leap: 'wide',
      chords: 'block',
      chordHand: 'right',
      voices: 2,
      measures: 4,
      tempoMin: 60,
      tempoMax: 108,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 7,
      allowMinor: true,
      style: 'romantic',
      minorFlavor: 'mixed',
      harmonicComplexity: 'sevenths',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.5,
      sequence: 0.4
    },
    9: {
      level: 9,
      name: 'Canto e risposta',
      shortName: 'Frasi e motivi',
      description: 'Frasi di quattro misure che si rispondono: il motivo ritorna, si trasporta e si chiude con una vera cadenza. La memoria musicale guida la lettura.',
      focus: ['Frasi di 4 misure', 'Motivi ripetuti', 'Domanda e risposta'],
      staff: 'grand',
      rhLow: 'B3', rhHigh: 'D6', lhLow: 'G2', lhHigh: 'E4',
      maxLedger: 2,
      meters: ['2/4', '3/4', '4/4'],
      durations: ['half', 'quarter', 'eighth'],
      allowDots: true,
      restAmount: 0.14,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'small',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 8,
      tempoMin: 60,
      tempoMax: 84,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 2,
      allowMinor: false,
      style: 'classical',
      minorFlavor: 'natural',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 4,
      phraseRepetition: 0.8,
      sequence: 0.6
    },
    10: {
      level: 10,
      name: 'Settime e cadenze',
      shortName: 'Armonia ricca',
      description: 'Accordi di settima, cadenze preparate e armonia che cambia a metà misura. L’orecchio anticipa ciò che le dita leggono.',
      focus: ['Accordi di settima', 'Cadenze', 'Armonia in movimento'],
      staff: 'grand',
      rhLow: 'A3', rhHigh: 'E6', lhLow: 'F2', lhHigh: 'F4',
      maxLedger: 3,
      meters: ['3/4', '4/4', '2/2'],
      durations: ['half', 'quarter', 'eighth'],
      allowDots: true,
      restAmount: 0.16,
      allowTies: true,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 8,
      tempoMin: 66,
      tempoMax: 96,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 4,
      allowMinor: true,
      style: 'baroque',
      minorFlavor: 'harmonic',
      harmonicComplexity: 'sevenths',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.5,
      sequence: 0.45
    },
    11: {
      level: 11,
      name: 'Misure irregolari',
      shortName: '7/8 e 5/8',
      description: 'Metri asimmetrici con raggruppamenti espliciti: 7/8 come 2+2+3, 5/8 come 2+3. Il polso cambia a ogni misura.',
      focus: ['7/8 · 5/8', 'Raggruppamenti 2+2+3', '5/4'],
      staff: 'grand',
      rhLow: 'B3', rhHigh: 'D6', lhLow: 'G2', lhHigh: 'E4',
      maxLedger: 2,
      meters: ['7/8', '5/8', '5/4'],
      durations: ['half', 'quarter', 'eighth'],
      allowDots: true,
      restAmount: 0.14,
      allowTies: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowChromatic: false,
      leap: 'medium',
      chords: 'none',
      chordHand: 'right',
      voices: 1,
      measures: 4,
      tempoMin: 66,
      tempoMax: 92,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 3,
      allowMinor: true,
      style: 'folk',
      minorFlavor: 'natural',
      harmonicComplexity: 'triads',
      cadence: 'tonal',
      phraseLength: 2,
      phraseRepetition: 0.6,
      sequence: 0.3
    },
    12: {
      level: 12,
      name: 'Concerto',
      shortName: 'Tutto, davvero',
      description: 'Il banco di prova completo: tutti i metri, due voci, settime, cromatismi risolti, frasi lunghe e cadenze. Come leggere un brano vero.',
      focus: ['Tutti i metri', 'Settime e cromatismi', 'Frasi di 4 misure'],
      staff: 'grand',
      rhLow: 'G3', rhHigh: 'G6', lhLow: 'E2', lhHigh: 'G4',
      maxLedger: 4,
      meters: ['2/4', '3/4', '4/4', '2/2', '3/8', '6/8', '9/8', '12/8', '5/4', '5/8', '7/8'],
      durations: ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'],
      allowDots: true,
      restAmount: 0.2,
      allowTies: true,
      allowSyncopation: true,
      allowTuplets: true,
      allowChromatic: true,
      leap: 'wide',
      chords: 'block',
      chordHand: 'right',
      voices: 2,
      measures: 8,
      tempoMin: 60,
      tempoMax: 112,
      keyMode: 'random',
      fixedKey: 'C',
      maxAccidentals: 7,
      allowMinor: true,
      style: 'romantic',
      minorFlavor: 'mixed',
      harmonicComplexity: 'advanced',
      cadence: 'tonal',
      phraseLength: 4,
      phraseRepetition: 0.55,
      sequence: 0.5
    }
  };

  const DEFAULT_CONFIG = Object.assign({}, PRESETS[1], { preset: 1, seed: null });
  const LEVEL_NAMES = {};
  Object.keys(PRESETS).forEach((key) => { LEVEL_NAMES[key] = PRESETS[key].name; });

  const VALID_STAFFS = ['treble', 'bass', 'grand'];
  const VALID_CHORDS = ['none', 'block'];
  const VALID_LEAPS = ['small', 'medium', 'wide'];
  const VALID_CHORD_HANDS = ['right', 'left', 'both'];
  const VALID_STYLES = ['classical', 'hymn', 'folk', 'baroque', 'romantic'];
  const VALID_COMPLEXITY = ['monophonic', 'triads', 'sevenths', 'advanced'];
  const VALID_CADENCES = ['tonal', 'open', 'none'];
  const VALID_MINOR_FLAVORS = ['natural', 'harmonic', 'melodic', 'mixed'];

  const STYLE_PROFILES = {
    classical: { splitChance: 0.32, bassDurations: ['whole', 'half', 'quarter'], leapBonus: 0, restScale: 1, chromaChance: 0.05, motifBank: [[1, 1, -1], [1, 2, -1], [-1, 1, 1], [1, -1, 2, -1], [-1, -2, 1]] },
    hymn: { splitChance: 0, bassDurations: ['whole', 'half'], leapBonus: -1, restScale: 0.8, chromaChance: 0.04, motifBank: [[1, 1, 1], [-1, 1, 1], [1, -1], [-1, 2, -1]] },
    folk: { splitChance: 0.24, bassDurations: ['half', 'quarter'], leapBonus: 0, restScale: 1, chromaChance: 0.05, motifBank: [[1, 1, -1, -1], [1, 2, -1], [2, 1, -2], [-1, -1, 2, 1]] },
    baroque: { splitChance: 0.5, bassDurations: ['quarter', 'eighth'], leapBonus: 0, restScale: 0.9, chromaChance: 0.07, motifBank: [[1, 2, -1, -2], [1, 1, 2, -1], [2, -1, 1, -2], [1, 1, 1, 1]] },
    romantic: { splitChance: 0.38, bassDurations: ['whole', 'half', 'quarter'], leapBonus: 1, restScale: 1.1, chromaChance: 0.07, motifBank: [[2, -1, 2, -3], [1, 2, 2, -1], [-2, 1, 2, 1], [2, 2, -1, -2]] }
  };

  const PROGRESSION_BANKS = {
    major: {
      classical: [[0, 3, 4, 0], [0, 2, 4, 0], [0, 5, 3, 4, 0], [0, 3, 4, 5, 0], [0, 5, 4, 0]],
      hymn: [[0, 3, 4, 0], [0, 4, 0, 0], [0, 3, 0, 4, 0], [0, 5, 4, 0]],
      folk: [[0, 3, 4, 0], [0, 4, 0, 0], [0, 5, 3, 4, 0], [0, 3, 0, 4]],
      baroque: [[0, 3, 4, 0], [0, 4, 5, 3, 4, 0], [0, 5, 1, 4, 0], [0, 3, 6, 2, 5, 0]],
      romantic: [[0, 2, 5, 3, 4, 0], [0, 5, 3, 2, 4, 0], [0, 3, 5, 4, 0], [0, 5, 1, 4, 0]]
    },
    minor: {
      classical: [[0, 3, 4, 0], [0, 5, 4, 0], [0, 2, 4, 0], [0, 3, 6, 4, 0]],
      hymn: [[0, 3, 4, 0], [0, 5, 3, 4, 0], [0, 4, 0, 0]],
      folk: [[0, 5, 6, 0], [0, 3, 6, 0], [0, 6, 5, 4, 0]],
      baroque: [[0, 3, 4, 0], [0, 5, 1, 4, 0], [0, 3, 6, 2, 4, 0], [0, 6, 2, 4, 0]],
      romantic: [[0, 5, 2, 4, 0], [0, 3, 5, 4, 0], [0, 2, 5, 4, 0]]
    }
  };

  function clonePreset(level) {
    const preset = PRESETS[level] || PRESETS[1];
    return Object.assign({}, preset, { preset: Number(level) || 1, seed: null });
  }

  function defaultConfig() {
    return clonePreset(1);
  }

  function parseSeed(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 0xffffffff) return null;
    return Math.floor(number) >>> 0;
  }

  function randomSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] >>> 0;
    }
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }

  function rangeToMidi(low, high) {
    const lowPitch = T.parseNoteName(low);
    const highPitch = T.parseNoteName(high);
    if (!lowPitch || !highPitch) return null;
    return [T.midiFromPitch(lowPitch), T.midiFromPitch(highPitch)];
  }

  function normalizeConfig(input) {
    const source = Object.assign({}, DEFAULT_CONFIG, input || {});
    const config = Object.assign({}, source);
    config.preset = Number(config.preset) || 0;
    config.staff = VALID_STAFFS.includes(config.staff) ? config.staff : 'grand';
    config.meters = Array.isArray(config.meters) && config.meters.length ? config.meters.filter((meter) => T.METERS[meter]) : ['4/4'];
    if (!config.meters.length) config.meters = ['4/4'];
    config.durations = Array.isArray(config.durations) && config.durations.length ? config.durations.filter((base) => T.BASE_DURATIONS[base]) : ['quarter'];
    if (!config.durations.length) config.durations = ['quarter'];
    config.chords = VALID_CHORDS.includes(config.chords) ? config.chords : 'none';
    config.chordHand = VALID_CHORD_HANDS.includes(config.chordHand) ? config.chordHand : 'right';
    config.leap = VALID_LEAPS.includes(config.leap) ? config.leap : 'medium';
    config.style = VALID_STYLES.includes(config.style) ? config.style : 'classical';
    config.minorFlavor = VALID_MINOR_FLAVORS.includes(config.minorFlavor) ? config.minorFlavor : 'natural';
    config.harmonicComplexity = VALID_COMPLEXITY.includes(config.harmonicComplexity) ? config.harmonicComplexity : 'triads';
    config.cadence = VALID_CADENCES.includes(config.cadence) ? config.cadence : 'tonal';
    config.allowDots = !!config.allowDots;
    config.allowTies = !!config.allowTies;
    config.allowSyncopation = !!config.allowSyncopation;
    config.allowTuplets = !!config.allowTuplets;
    config.allowChromatic = !!config.allowChromatic;
    config.allowMinor = !!config.allowMinor;
    config.keyMode = config.keyMode === 'fixed' ? 'fixed' : 'random';
    config.maxLedger = T.clamp(Math.round(Number(config.maxLedger) || 0), 0, 4);
    config.maxAccidentals = T.clamp(Math.round(Number(config.maxAccidentals) || 0), 0, 7);
    config.measures = [2, 4, 6, 8].includes(Number(config.measures)) ? Number(config.measures) : 4;
    config.tempoMin = T.clamp(Math.round(Number(config.tempoMin) || 60), 30, 180);
    config.tempoMax = T.clamp(Math.round(Number(config.tempoMax) || 84), 30, 180);
    if (config.tempoMin > config.tempoMax) {
      const temp = config.tempoMin;
      config.tempoMin = config.tempoMax;
      config.tempoMax = temp;
    }
    config.restAmount = T.clamp(Number(config.restAmount) || 0, 0, 0.35);
    config.voices = Number(config.voices) === 2 ? 2 : 1;
    config.phraseLength = Number(config.phraseLength) === 4 ? 4 : 2;
    config.phraseRepetition = T.clamp(Number(config.phraseRepetition) || 0, 0, 1);
    config.sequence = T.clamp(Number(config.sequence) || 0, 0, 1);
    config.seed = parseSeed(config.seed);
    config.rhLow = config.rhLow || 'C4';
    config.rhHigh = config.rhHigh || 'C6';
    config.lhLow = config.lhLow || 'C2';
    config.lhHigh = config.lhHigh || 'C4';
    config.fixedKey = config.fixedKey || 'C';
    return config;
  }

  function meterFillable(config, meterName) {
    const meter = T.meterInfo(meterName);
    if (!meter) return false;
    const options = R.tokenOptions(config);
    const reachable = new Uint8Array(meter.measureTicks + 1);
    reachable[0] = 1;
    for (let tick = 0; tick <= meter.measureTicks; tick++) {
      if (!reachable[tick]) continue;
      options.forEach((option) => {
        const next = tick + option.ticks;
        if (next <= meter.measureTicks) reachable[next] = 1;
      });
    }
    return reachable[meter.measureTicks] === 1;
  }

  function validateConfig(input) {
    const config = normalizeConfig(input);
    const errors = [];
    if (!VALID_STAFFS.includes(config.staff)) errors.push('Tipo di pentagramma non valido.');
    if (!config.meters.length) errors.push('Scegli almeno un metro.');
    if (!config.durations.length) errors.push('Scegli almeno un valore ritmico.');
    const activeRanges = [];
    if (config.staff !== 'bass') activeRanges.push(['Mano destra', config.rhLow, config.rhHigh]);
    if (config.staff !== 'treble') activeRanges.push(['Mano sinistra', config.lhLow, config.lhHigh]);
    activeRanges.forEach(([label, low, high]) => {
      const midi = rangeToMidi(low, high);
      if (!midi) {
        errors.push(label + ': estensione non valida.');
        return;
      }
      if (midi[0] < 21 || midi[1] > 108) errors.push(label + ': estensione fuori dal pianoforte.');
      if (midi[0] >= midi[1]) errors.push(label + ': la nota grave deve essere più bassa della acuta.');
    });
    if (config.meters.length && !config.meters.some((meter) => meterFillable(config, meter))) {
      errors.push('Le durate scelte non possono riempire nessuno dei metri selezionati.');
    }
    if (config.keyMode === 'fixed') {
      const key = T.getKeyById(config.fixedKey);
      if (!key || (!config.allowMinor && key.mode === 'minor')) {
        errors.push('La tonalità fissa scelta non è disponibile.');
      }
    }
    if (config.seed !== null && (typeof config.seed !== 'number' || config.seed < 0)) {
      errors.push('Il seme deve essere un numero intero non negativo.');
    }
    return { valid: errors.length === 0, errors, config };
  }

  function pickKey(config, rng) {
    if (config.keyMode === 'fixed') {
      const fixed = T.getKeyById(config.fixedKey);
      if (fixed && (config.allowMinor || fixed.mode === 'major')) return fixed;
    }
    const keys = T.getKeysForOptions(config.maxAccidentals, config.allowMinor);
    return keys.length ? rng.pick(keys) : T.MAJOR_KEYS[0];
  }

  function melodyScaleFor(key, config) {
    if (!key || key.mode !== 'minor') return null;
    if (config.minorFlavor === 'melodic') return T.scaleForFlavor(key, 'minor-melodic');
    if (config.minorFlavor === 'harmonic') return T.scaleForFlavor(key, 'minor-harmonic');
    return null;
  }

  function wantsSeventh(config, rng, degree) {
    if (config.harmonicComplexity !== 'sevenths' && config.harmonicComplexity !== 'advanced') return false;
    if (degree === 0) return config.harmonicComplexity === 'advanced' && rng.chance(0.2);
    if (degree === 4) return rng.chance(0.85);
    return rng.chance(0.55);
  }

  function planPhrases(config, measuresCount) {
    const length = config.phraseLength;
    const phrases = [];
    let start = 0;
    while (start < measuresCount) {
      let len = Math.min(length, measuresCount - start);
      if (measuresCount - (start + len) === 1 && len >= 4) len += 1;
      phrases.push({ index: phrases.length, startMeasure: start, endMeasure: start + len - 1, closed: false, type: 'open' });
      start += len;
    }
    const last = phrases[phrases.length - 1];
    if (config.cadence === 'tonal') {
      last.closed = true;
      last.type = 'closed';
    } else if (config.cadence === 'open') {
      last.type = 'open';
    } else {
      last.type = 'free';
    }
    return phrases;
  }

  function planHarmony(key, config, meter, measuresCount, phrases, rng) {
    const mode = key.mode === 'minor' ? 'minor' : 'major';
    const bankSet = PROGRESSION_BANKS[mode][config.style] || PROGRESSION_BANKS[mode].classical;
    let bank = rng.pick(bankSet).slice();
    if (bank[0] !== 0) bank.unshift(0);

    const styleProfile = STYLE_PROFILES[config.style] || STYLE_PROFILES.classical;
    const canSplit = meter.measureTicks >= 960 && T.beatPositions(meter.name).includes(meter.measureTicks / 2);
    let slotsPerMeasure = 1;
    if (canSplit && measuresCount >= 4) {
      const pulse = styleProfile.splitChance + (config.harmonicComplexity === 'advanced' ? 0.12 : 0);
      if (rng.chance(pulse)) slotsPerMeasure = 2;
    }

    if (config.style === 'hymn') {
      const doubled = [];
      bank.forEach((degree) => { doubled.push(degree); doubled.push(degree); });
      bank = doubled;
    }

    const unitCount = measuresCount * slotsPerMeasure;
    const units = [];
    for (let index = 0; index < unitCount; index++) {
      const measure = Math.floor(index / slotsPerMeasure);
      const slot = index % slotsPerMeasure;
      const degree = bank[index % bank.length];
      units.push({
        measure,
        offset: slot === 0 ? 0 : meter.measureTicks / 2,
        degree,
        seventh: wantsSeventh(config, rng, degree),
        flavor: null
      });
    }

    const minorFlavorFor = function (degree) {
      if (key.mode !== 'minor') return null;
      if (degree === 4) return 'minor-harmonic';
      if (config.minorFlavor === 'harmonic' && (degree === 1 || degree === 6)) return 'minor-harmonic';
      return null;
    };

    if (config.harmonicComplexity === 'monophonic') {
      units.forEach((unit) => { unit.seventh = false; });
    }

    const lastUnit = units[units.length - 1];
    const prevUnit = units.length > 1 ? units[units.length - 2] : null;
    if (config.cadence === 'tonal') {
      lastUnit.degree = 0;
      lastUnit.seventh = false;
      if (prevUnit) {
        prevUnit.degree = 4;
        prevUnit.seventh = wantsSeventh(config, rng, 4);
      }
    } else if (config.cadence === 'open') {
      lastUnit.degree = 4;
      lastUnit.seventh = wantsSeventh(config, rng, 4);
    }

    const lastPhrase = phrases[phrases.length - 1];
    phrases.forEach((phrase) => {
      if (phrase === lastPhrase) return;
      let phraseLast = null;
      units.forEach((unit) => {
        if (unit.measure <= phrase.endMeasure) phraseLast = unit;
      });
      if (!phraseLast) return;
      if (phraseLast.degree === 0) return;
      const roll = rng();
      if (roll < 0.72) phraseLast.degree = 4;
      else if ((config.style === 'folk' || config.style === 'hymn') && roll < 0.92) phraseLast.degree = 3;
    });

    units.forEach((unit) => { unit.flavor = minorFlavorFor(unit.degree); });
    return units;
  }

  function chordObjectFor(key, unit) {
    if (!unit.chordObj) {
      unit.chordObj = T.chordForDegree(key, unit.degree, { seventh: !!unit.seventh, flavor: unit.flavor || undefined });
    }
    return unit.chordObj;
  }

  function chordAtLocal(units, measureIndex, localTick, key) {
    let found = null;
    units.forEach((unit) => {
      if (unit.measure !== measureIndex) return;
      if (unit.offset <= localTick && (!found || unit.offset > found.offset)) found = unit;
    });
    if (!found) {
      units.forEach((unit) => {
        if (unit.measure === measureIndex && !found) found = unit;
      });
    }
    return found ? chordObjectFor(key, found) : null;
  }

  function motifBankFor(config, rng) {
    const profile = STYLE_PROFILES[config.style] || STYLE_PROFILES.classical;
    return rng.pick(profile.motifBank).slice();
  }

  function randomMotifStep(rng) {
    return rng.pick([-2, -1, 1, 1, 2]);
  }

  function leapCapFor(config) {
    const profile = STYLE_PROFILES[config.style] || STYLE_PROFILES.classical;
    const base = config.leap === 'small' ? 3 : config.leap === 'medium' ? 5 : 7;
    return T.clamp(base + profile.leapBonus, 2, 8);
  }

  function buildMelodyCells(config, meter, rng, phrases) {
    const baseOpts = {
      durations: config.durations.slice(),
      allowDots: config.allowDots,
      allowTies: config.allowTies,
      allowTuplets: config.allowTuplets,
      allowSyncopation: config.allowSyncopation,
      restAmount: config.restAmount,
      keepFirst: true,
      keepLast: true,
      attempts: 18
    };
    const cells = [];
    phrases.forEach((phrase, phraseIndex) => {
      const length = phrase.endMeasure - phrase.startMeasure + 1;
      const wantsTuplet = config.allowTuplets && rng.chance(0.55);
      let motifCell = R.buildCell(config, meter, rng, baseOpts).tokens;
      if (wantsTuplet) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const built = R.buildCell(config, meter, rng, Object.assign({}, baseOpts, { forceTuplet: true }));
          motifCell = built.tokens;
          if (built.tupletInserted) break;
        }
      }
      const phraseCells = [motifCell];
      for (let offset = 1; offset < length; offset++) {
        const roll = rng();
        let tokens;
        if (roll < config.phraseRepetition * 0.45) {
          tokens = motifCell.map((token) => Object.assign({}, token));
        } else if (roll < config.phraseRepetition * 0.45 + 0.5) {
          tokens = R.varyCell(motifCell, config, meter, rng, { allowRests: config.restAmount > 0 });
        } else {
          tokens = R.buildCell(config, meter, rng, baseOpts).tokens;
        }
        phraseCells.push(tokens);
      }
      if (phrase.closed && phraseIndex === phrases.length - 1) {
        phraseCells[phraseCells.length - 1] = R.forceCadenceEnding(phraseCells[phraseCells.length - 1], config, meter, rng);
      }
      phraseCells.forEach((tokens) => cells.push(tokens));
    });
    if (!cells.length) cells.push(R.fillMeasure(config, meter, rng, baseOpts));
    cells.forEach((tokens) => {
      if (tokens.length && tokens.every((token) => token.rest)) {
        tokens[0] = Object.assign({}, tokens[0], { rest: false });
      }
    });
    const finalCell = cells[cells.length - 1];
    const finalToken = finalCell[finalCell.length - 1];
    if (finalToken && finalToken.rest) {
      finalCell[finalCell.length - 1] = Object.assign({}, finalToken, { rest: false });
    }
    return cells;
  }

  function buildBassCells(config, meter, rng, measuresCount) {
    const profile = STYLE_PROFILES[config.style] || STYLE_PROFILES.classical;
    const cells = [];
    for (let m = 0; m < measuresCount; m++) {
      cells.push(R.buildBassRhythm(config, meter, rng, {
        durations: profile.bassDurations,
        allowTies: config.allowTies,
        restAmount: Math.max(0, config.restAmount * 0.6 * profile.restScale)
      }));
    }
    return cells;
  }

  function buildInnerCells(config, meter, rng, measuresCount) {
    const cells = [];
    for (let m = 0; m < measuresCount; m++) {
      cells.push(R.buildInnerRhythm(config, meter, rng, {
        durations: ['half', 'quarter', 'eighth'],
        restAmount: 0.18
      }));
    }
    return cells;
  }

  function buildMelodyNoteMap(cells, phrases) {
    const map = cells.map(() => []);
    phrases.forEach((phrase) => {
      const refs = [];
      for (let m = phrase.startMeasure; m <= phrase.endMeasure; m++) {
        cells[m].forEach((token, tokenIndex) => {
          if (!token.rest) refs.push({ m, tokenIndex });
        });
      }
      refs.forEach((ref, index) => {
        map[ref.m][ref.tokenIndex] = {
          phraseIndex: phrase.index,
          noteIndex: index,
          noteCount: refs.length,
          isFirst: index === 0,
          isLast: index === refs.length - 1,
          isPenultimate: index === refs.length - 2
        };
      });
    });
    return map;
  }

  function diOf(pitch) {
    return T.diatonicIndex(pitch);
  }

  function chromaticAlteration(pitch, direction) {
    const accidental = T.normalizeAccidental((pitch.accidental || 0) + direction);
    const altered = { letter: pitch.letter, accidental, octave: pitch.octave };
    if (T.midiFromPitch(altered) !== pitch.midi + direction) return null;
    if (Math.abs(accidental) > 2) return null;
    return {
      letter: pitch.letter,
      accidental,
      octave: pitch.octave,
      pc: ((pitch.pc + direction) + 12) % 12,
      midi: pitch.midi + direction
    };
  }

  function chooseChordVoicing(pool, chord, targetMidi, maxNotes) {
    const notes = [];
    const targets = [targetMidi - 5, targetMidi + 1, targetMidi + 5, targetMidi + 8];
    chord.pcs.forEach((pc, index) => {
      if (notes.length >= maxNotes) return;
      const candidates = pool.filter((pitch) => pitch.pc === pc);
      if (!candidates.length) return;
      const target = targets[index] || targetMidi;
      let best = candidates[0];
      let bestDistance = Math.abs(best.midi - target);
      candidates.forEach((pitch) => {
        const distance = Math.abs(pitch.midi - target);
        if (distance < bestDistance) {
          best = pitch;
          bestDistance = distance;
        }
      });
      if (!notes.some((note) => note.midi === best.midi)) notes.push(best);
    });
    notes.sort((a, b) => a.midi - b.midi);
    if (notes.length === 1 && maxNotes > 1) {
      const fifth = T.nearestPitch(pool, notes[0].midi + 7, [chord.fifthPc]);
      if (fifth && !notes.some((note) => note.midi === fifth.midi)) notes.push(fifth);
    }
    return notes.slice(0, maxNotes);
  }

  function melodyWeight(pitch, state, chord, info, pool) {
    const prev = state.previousPitch;
    const deltaDi = prev ? diOf(pitch) - diOf(prev) : 0;
    const ad = Math.abs(deltaDi);
    let score = 4;
    if (prev) {
      if (ad === 0) score -= 4.6;
      else if (ad === 1) score += 5.2;
      else if (ad === 2) score += 2.2;
      else if (ad === 3) score += info.leapCap <= 3 ? -1.6 : 0.2;
      else if (ad === 4) score -= info.leapCap >= 6 ? 2.2 : 3.2;
      else score -= 6.5;
      if (deltaDi !== 0) {
        const same = state.lastDeltaDi !== 0 && Math.sign(deltaDi) === Math.sign(state.lastDeltaDi);
        if (same) score += state.sameDirCount >= 2 ? -1.7 : 0.5;
        else if (state.lastDeltaDi !== 0) score += 1.0;
      }
      if (info.motifHint !== null && info.motifHint !== undefined && info.motifHint !== 0) {
        if (deltaDi === info.motifHint) score += 3.2;
        else if (Math.abs(deltaDi) === Math.abs(info.motifHint) && deltaDi !== 0) score += 0.2;
      } else if (info.motifHint === 0 && deltaDi === 0) {
        score += 2.4;
      }
    }
    const isChordTone = chord.pcs.includes(pitch.pc);
    if (info.strong) score += isChordTone ? 7.5 : -8;
    else score += isChordTone ? 2.2 : 0.9;
    if (info.previousChordPcs && isChordTone && info.previousChordPcs.includes(pitch.pc)) score += 0.9;
    if (info.desiredMid !== null && info.desiredMid !== undefined) {
      score -= Math.abs(pitch.midi - info.desiredMid) * 0.042;
    }
    const edge = Math.min(pitch.midi - pool.low, pool.high - pitch.midi);
    if (edge <= 2) score -= 4.2;
    else if (edge <= 4) score -= 1.1;
    if (info.penultimateTarget) {
      const d = Math.abs(diOf(pitch) - diOf(info.penultimateTarget));
      if (d === 1) score += 3.4;
      else if (d === 2) score += 0.4;
    }
    return Math.max(0.02, score);
  }

  function chooseFinalTarget(pool, key, chord, state, phraseType, rng) {
    const tones = pool.diatonic.filter((pitch) => chord.pcs.includes(pitch.pc));
    const source = tones.length ? tones : pool.diatonic;
    const center = pool.center;
    const span = pool.high - pool.low;
    const settle = center - span * (phraseType === 'closed' ? 0.12 : 0.05);
    const prev = state.previousPitch;
    const scalePcs = key.scale.map((tone) => tone.pc);
    const weightFn = function (pitch) {
      let score = 4 - Math.abs(pitch.midi - settle) * 0.06;
      if (pitch.pc === chord.rootPc) score += 1.4;
      if (phraseType === 'open' && (pitch.pc === scalePcs[1] || pitch.pc === scalePcs[4])) score += 2.2;
      if (prev) {
        const d = diOf(pitch) - diOf(prev);
        if (Math.abs(d) <= 2) score += 1.2;
        else score -= Math.abs(d) * 0.3;
      }
      return Math.max(0.05, score);
    };
    return rng.weighted(source, weightFn);
  }

  function createPhraseContext(phrase, pool, key, config, rng, state) {
    const span = pool.high - pool.low;
    const center = pool.center;
    let startDesired = center + rng.pick([-1, 1]) * span * 0.18;
    let hints = motifBankFor(config, rng);
    let transform = 'new';
    const seqRoll = state.phraseHints && rng.chance(config.sequence);
    if (seqRoll) {
      const step = rng.chance(0.6) ? 2 : -2;
      const target = (state.lastPhraseStartMidi || center) + step;
      startDesired = T.clamp(target, pool.low + 3, pool.high - 3);
      hints = state.phraseHints.slice();
      transform = 'sequence';
    } else if (state.phraseHints) {
      const roll = rng();
      const p = config.phraseRepetition;
      if (roll < p * 0.5) {
        hints = state.phraseHints.slice();
        transform = 'repeat';
      } else if (roll < p * 0.5 + 0.25) {
        hints = state.phraseHints.map((hint) => (rng.chance(0.35) ? randomMotifStep(rng) : hint));
        transform = 'vary';
      } else if (roll < p * 0.75 + 0.32 && rng.chance(0.55)) {
        hints = state.phraseHints.map((hint) => -hint);
        transform = 'invert';
      }
    }
    return {
      index: phrase.index,
      type: phrase.type,
      closed: phrase.closed,
      startDesired: T.clamp(startDesired, pool.low + 1, pool.high - 1),
      archDir: startDesired >= center ? -1 : 1,
      hints,
      hintIndex: 0,
      transform,
      finalTarget: null,
      noteCount: 0
    };
  }

  function chooseMelodyEvent(pool, state, token, info, config, key, rng) {
    const phrase = state.phrase;
    const prev = state.previousPitch;
    if (state.pendingResolution) {
      const pending = state.pendingResolution;
      state.pendingResolution = null;
      const candidates = pool.diatonic.filter((pitch) => pitch.pc === pending.pc);
      if (candidates.length) {
        return { pitches: [T.nearestPitch(candidates, pending.midi)], chromatic: false };
      }
    }
    const allowChord = config.chords === 'block' && info.chordHandAllowed;
    if (allowChord && info.strong && token.ticks >= 240 && rng.chance(0.62)) {
      const target = prev ? prev.midi : pool.center;
      const voices = chooseChordVoicing(pool.diatonic, info.chord, target, 3);
      if (voices.length >= 2) return { pitches: voices, chromatic: false };
    }
    if (info.isFinal) {
      if (!phrase.finalTarget) {
        phrase.finalTarget = chooseFinalTarget(pool, key, info.chord, state, phrase.type, rng);
      }
      return { pitches: [phrase.finalTarget], chromatic: false };
    }
    if (info.isPenultimate) {
      phrase.finalTarget = chooseFinalTarget(pool, key, info.chord, state, phrase.type, rng);
      info = Object.assign({}, info, { penultimateTarget: phrase.finalTarget });
    }
    let candidates = pool.diatonic.slice();
    if (info.strong) {
      const tones = candidates.filter((pitch) => info.chord.pcs.includes(pitch.pc));
      if (tones.length) candidates = tones;
    }
    if (prev && Math.abs(state.lastDeltaDi) >= 3) {
      const sign = Math.sign(state.lastDeltaDi);
      const filtered = candidates.filter((pitch) => {
        const d = diOf(pitch) - diOf(prev);
        if (d * sign < 0 && Math.abs(d) <= 2) return true;
        return info.chord.pcs.includes(pitch.pc) && Math.abs(d) <= 3;
      });
      if (filtered.length) candidates = filtered;
    }
    if (info.penultimateTarget) {
      const filtered = candidates.filter((pitch) => {
        const d = diOf(pitch) - diOf(info.penultimateTarget);
        return d !== 0 && Math.abs(d) <= 2;
      });
      if (filtered.length) candidates = filtered;
    }
    if (!candidates.length) candidates = pool.diatonic.slice();
    const pitch = rng.weighted(candidates, (item) => melodyWeight(item, state, info.chord, info, pool));
    const wantsChroma = config.allowChromatic
      && config.harmonicComplexity !== 'monophonic'
      && prev
      && !info.strong
      && !info.isFinal
      && info.next
      && !info.next.rest
      && !info.next.strong
      && !info.next.isFinal
      && !info.next.tieFromPrev;
    if (wantsChroma) {
      const delta = pitch.midi - prev.midi;
      const profile = STYLE_PROFILES[config.style] || STYLE_PROFILES.classical;
      const chance = profile.chromaChance + (config.harmonicComplexity === 'advanced' ? 0.02 : 0);
      if (Math.abs(delta) === 2 && rng.chance(chance)) {
        const altered = chromaticAlteration(prev, Math.sign(delta));
        if (altered) {
          state.pendingResolution = { pc: pitch.pc, midi: pitch.midi };
          return { pitches: [altered], chromatic: true };
        }
      }
    }
    return { pitches: [pitch], chromatic: false };
  }

  function chooseBassPitches(pool, state, chord, strong, config, rng, options) {
    const allowChord = config.chords === 'block' && (config.chordHand === 'left' || config.chordHand === 'both');
    const target = state.previousPitch ? state.previousPitch.midi : pool.low + (pool.high - pool.low) * 0.35;
    if (allowChord && strong && rng.chance(0.55)) {
      const voices = chooseChordVoicing(pool.diatonic, chord, target, 2);
      if (voices.length) return voices;
    }
    const pcs = strong || options.isLast ? chord.pcs : [chord.rootPc, chord.fifthPc];
    const candidates = pool.diatonic.filter((pitch) => pcs.includes(pitch.pc));
    if (!candidates.length) return [T.nearestPitch(pool.diatonic, target) || pool.diatonic[0]];
    const weightFn = function (pitch) {
      let score = 6;
      const distance = Math.abs(pitch.midi - target);
      if (distance === 0) score -= 2;
      if (distance <= 7) score += 2;
      if (pitch.pc === chord.rootPc) score += 3;
      if (strong && pitch.pc === chord.rootPc) score += 2;
      score -= distance * 0.06;
      return Math.max(0.1, score);
    };
    return [rng.weighted(candidates, weightFn)];
  }

  function chooseInnerPitches(pool, state, chord, config, rng, melodyPitch) {
    const target = state.previousPitch
      ? state.previousPitch.midi
      : pool.low + (pool.high - pool.low) * 0.55;
    const ceiling = melodyPitch ? melodyPitch.midi - 3 : target + 7;
    let candidates = pool.diatonic.filter((pitch) => chord.pcs.includes(pitch.pc) && pitch.midi <= ceiling && pitch.midi >= ceiling - 14);
    if (!candidates.length) {
      candidates = pool.diatonic.filter((pitch) => pitch.midi <= ceiling);
      candidates = candidates.slice(-6);
    }
    if (!candidates.length) return [T.nearestPitch(pool.diatonic, target) || pool.diatonic[0]];
    const weightFn = function (pitch) {
      let score = 5 - Math.abs(pitch.midi - target) * 0.05;
      if (melodyPitch && melodyPitch.midi - pitch.midi > 14) score -= 1.6;
      if (pitch.pc === chord.rootPc) score += 1;
      if (state.previousPitch && Math.abs(diOf(pitch) - diOf(state.previousPitch)) === 1) score += 1.4;
      return Math.max(0.1, score);
    };
    return [rng.weighted(candidates, weightFn)];
  }

  function generate(inputConfig, options) {
    const validation = validateConfig(inputConfig);
    if (!validation.valid) {
      const error = new Error(validation.errors[0]);
      error.validation = validation;
      throw error;
    }
    const config = validation.config;
    let seed = config.seed;
    if (options && options.seed !== undefined && options.seed !== null && options.seed !== '') {
      const parsed = parseSeed(options.seed);
      if (parsed !== null) seed = parsed;
    }
    if (seed === null) seed = randomSeed();
    const rng = RNG.create(seed);
    const key = pickKey(config, rng);
    const meterName = rng.pick(config.meters.filter((meter) => meterFillable(config, meter)));
    const meter = T.meterInfo(meterName);
    const tempoRaw = rng.int(config.tempoMin, config.tempoMax);
    const tempo = T.clamp(Math.round(tempoRaw / 2) * 2, config.tempoMin, config.tempoMax);
    const measuresCount = config.measures;
    const phrases = planPhrases(config, measuresCount);
    const units = planHarmony(key, config, meter, measuresCount, phrases, rng);

    const parts = [];
    const isGrand = config.staff === 'grand';
    const hasRight = config.staff !== 'bass';
    const hasLeft = config.staff !== 'treble';
    const melodyScale = melodyScaleFor(key, config);

    if (hasRight) {
      const range = rangeToMidi(config.rhLow, config.rhHigh);
      const pool = T.buildPitchPool(key, 'treble', range[0], range[1], config.maxLedger, config.allowChromatic, melodyScale);
      if (!pool.diatonic.length) throw new Error('L’estensione della mano destra non contiene note leggibili in questa tonalità.');
      parts.push({
        role: 'right',
        clef: 'treble',
        label: 'Mano destra',
        range,
        low: range[0],
        high: range[1],
        pool,
        voiceCount: config.voices === 2 ? 2 : 1,
        isMelody: true
      });
    }
    if (hasLeft) {
      const range = rangeToMidi(config.lhLow, config.lhHigh);
      const pool = T.buildPitchPool(key, 'bass', range[0], range[1], config.maxLedger, config.allowChromatic, melodyScale);
      if (!pool.diatonic.length) throw new Error('L’estensione della mano sinistra non contiene note leggibili in questa tonalità.');
      parts.push({
        role: 'left',
        clef: 'bass',
        label: 'Mano sinistra',
        range,
        low: range[0],
        high: range[1],
        pool,
        voiceCount: 1,
        isMelody: !hasRight
      });
    }
    if (!parts.length) throw new Error('Nessuna mano attiva: controlla il tipo di pentagramma.');

    const melodyPart = parts.find((part) => part.isMelody) || parts[0];
    const melodyCells = buildMelodyCells(config, meter, rng, phrases);
    const melodyNoteMap = buildMelodyNoteMap(melodyCells, phrases);

    parts.forEach((part) => {
      part.pool.center = (part.low + part.high) / 2;
      part.pool.low = part.low;
      part.pool.high = part.high;
      part.voiceTokens = [];
      if (part.isMelody) {
        part.voiceTokens.push(melodyCells);
        for (let voice = 1; voice < part.voiceCount; voice++) {
          part.voiceTokens.push(buildInnerCells(config, meter, rng, measuresCount));
        }
      } else {
        part.voiceTokens.push(buildBassCells(config, meter, rng, measuresCount));
        for (let voice = 1; voice < part.voiceCount; voice++) {
          part.voiceTokens.push(buildInnerCells(config, meter, rng, measuresCount));
        }
      }
      part.tokenMeasures = part.voiceTokens[0];
    });

    if (config.allowTies) {
      parts.forEach((part) => {
        part.voiceTokens.forEach((voiceMeasures) => {
          for (let m = 0; m < voiceMeasures.length - 1; m++) {
            const current = voiceMeasures[m];
            const next = voiceMeasures[m + 1];
            if (!current.length || !next.length) continue;
            const last = current[current.length - 1];
            const first = next[0];
            if (last.rest || first.rest || last.tuplet || first.tuplet) continue;
            if (last.tieToNext || first.tieFromPrev) continue;
            if (part.isMelody && m === measuresCount - 2) continue;
            const chance = part.isMelody ? 0.1 : part.role === 'left' ? 0.08 : 0.12;
            if (!rng.chance(chance)) continue;
            last.tieToNext = true;
            first.tieFromPrev = true;
          }
        });
      });
    }

    const phraseForMeasure = [];
    phrases.forEach((phrase) => {
      for (let m = phrase.startMeasure; m <= phrase.endMeasure; m++) phraseForMeasure[m] = phrase;
    });

    const measureObjects = [];
    for (let m = 0; m < measuresCount; m++) {
      const downbeatUnit = units.filter((unit) => unit.measure === m && unit.offset === 0)[0] || units.filter((unit) => unit.measure === m)[0];
      const downbeatChord = chordObjectFor(key, downbeatUnit);
      measureObjects.push({
        index: m,
        startTick: m * meter.measureTicks,
        ticks: meter.measureTicks,
        events: [],
        chord: downbeatChord,
        degree: downbeatUnit.degree,
        harmony: units.filter((unit) => unit.measure === m).map((unit) => {
          const chord = chordObjectFor(key, unit);
          return {
            offset: unit.offset,
            degree: unit.degree,
            roman: chord.roman,
            romanSeven: chord.romanSeven,
            quality: chord.quality,
            seventh: chord.seventhQuality,
            function: chord.function
          };
        })
      });
    }

    parts.forEach((part) => {
      part.states = part.voiceTokens.map(() => ({
        previousPitch: null,
        previousEvent: null,
        lastEvent: null,
        direction: 0,
        interval: 0,
        prevDi: null,
        lastDeltaDi: 0,
        sameDirCount: 0,
        pendingResolution: null,
        phrase: null,
        phraseHints: null,
        lastPhraseStartMidi: null,
        previousChordPcs: null
      }));
    });

    const leapCap = leapCapFor(config);
    const innerVoiceHandAllowed = config.chords === 'block' && (config.chordHand === 'right' || config.chordHand === 'both');

    for (let m = 0; m < measuresCount; m++) {
      const measure = measureObjects[m];
      const phrase = phraseForMeasure[m];
      parts.forEach((part) => {
        for (let voice = 0; voice < part.voiceTokens.length; voice++) {
          const tokens = part.voiceTokens[voice][m];
          const state = part.states[voice];
          tokens.forEach((token, index) => {
            const localTick = token.start;
            const chord = chordAtLocal(units, m, localTick, key);
            const isStrong = T.isOnGroupBoundary(localTick, meter.name) || localTick === 0;
            const isLastEvent = m === measuresCount - 1 && index === tokens.length - 1;
            let pitches = [];
            let chromatic = false;
            if (!token.rest) {
              const immediatePrevious = state.lastEvent;
              const canTie = token.tieFromPrev && immediatePrevious && !immediatePrevious.rest && immediatePrevious.pitches.length === 1;
              if (canTie) {
                pitches = [immediatePrevious.pitches[0]];
              } else if (!part.isMelody) {
                pitches = chooseBassPitches(part.pool, state, chord, isStrong, config, rng, { isLast: isLastEvent });
              } else if (part.isMelody && voice === 0) {
                const meta = melodyNoteMap[m][index] || null;
                if (meta && (!state.phrase || state.phrase.index !== meta.phraseIndex)) {
                  state.phrase = createPhraseContext(phrase, part.pool, key, config, rng, state);
                  state.phrase.hintIndex = 0;
                  state.phraseHints = state.phrase.hints.slice();
                }
                if (meta) {
                  state.phrase.hintIndex += meta.noteIndex === 0 ? 0 : 1;
                }
                const nextToken = tokens[index + 1] || null;
                const nextMeta = melodyNoteMap[m][index + 1] || null;
                const hint = meta && state.phrase
                  ? state.phrase.hints[state.phrase.hintIndex % state.phrase.hints.length]
                  : null;
                const desired = meta && state.phrase
                  ? state.phrase.startDesired + state.phrase.archDir * (part.pool.high - part.pool.low) * 0.16 * Math.sin(Math.PI * Math.pow(T.clamp(meta.noteIndex / Math.max(1, meta.noteCount - 1), 0, 1), 1.4))
                  : null;
                const info = {
                  strong: isStrong,
                  chord,
                  previousChordPcs: state.previousChordPcs,
                  motifHint: hint,
                  desiredMid: desired,
                  leapCap,
                  isFinal: !!(meta && meta.isLast),
                  isPenultimate: !!(meta && meta.isPenultimate),
                  penultimateTarget: null,
                  chordHandAllowed: innerVoiceHandAllowed,
                  next: nextToken ? {
                    rest: !!nextToken.rest,
                    strong: T.isOnGroupBoundary(nextToken.start, meter.name),
                    isFinal: !!(nextMeta && nextMeta.isLast),
                    tieFromPrev: !!nextToken.tieFromPrev
                  } : null
                };
                const chosen = chooseMelodyEvent(part.pool, state, token, info, config, key, rng);
                pitches = chosen.pitches;
                chromatic = chosen.chromatic;
              } else {
                pitches = chooseInnerPitches(part.pool, state, chord, config, rng, state.previousPitch);
              }
              if (!pitches.length) pitches = [T.nearestPitch(part.pool.diatonic, part.pool.center) || part.pool.diatonic[0]];
              pitches.sort((a, b) => a.midi - b.midi);
            }
            const event = {
              id: 'e' + part.role.charAt(0) + m + 'v' + voice + 'n' + index,
              part: part.role,
              staff: part.clef,
              voice,
              measureIndex: m,
              startTick: measure.startTick + token.start,
              localStart: token.start,
              duration: token.ticks,
              base: token.base,
              dots: token.dots || 0,
              tuplet: token.tuplet || null,
              tupletGroup: token.tupletGroup !== undefined ? token.tupletGroup : null,
              rest: !!token.rest,
              pitches,
              tieFromPrev: !!token.tieFromPrev,
              tieToNext: !!token.tieToNext,
              strong: isStrong,
              chromatic,
              chordDegree: measure.degree,
              chord
            };
            if (event.tieFromPrev && (!state.lastEvent || state.lastEvent.rest || state.lastEvent.pitches.length !== 1)) {
              event.tieFromPrev = false;
            }
            if (event.tieFromPrev && pitches.length === 1) {
              const previousPitch = state.lastEvent.pitches[0];
              if (previousPitch.midi !== pitches[0].midi) event.tieFromPrev = false;
            }
            if (event.tieFromPrev && part.isMelody && voice === 0 && isStrong && !chromatic && chord && pitches.length === 1 && !chord.pcs.includes(pitches[0].pc)) {
              event.tieFromPrev = false;
            }
            if (event.tieToNext && (event.rest || pitches.length !== 1)) event.tieToNext = false;
            if (event.chromatic && (event.tieFromPrev || event.tieToNext)) event.chromatic = false;
            measure.events.push(event);
            if (!token.rest) {
              const top = pitches[pitches.length - 1];
              if (state.previousPitch) {
                const interval = top.midi - state.previousPitch.midi;
                state.interval = interval;
                if (interval !== 0) state.direction = interval > 0 ? 1 : -1;
              }
              if (part.isMelody && voice === 0) {
                if (state.prevDi !== null) {
                  const deltaDi = diOf(top) - state.prevDi;
                  if (deltaDi !== 0 && state.lastDeltaDi !== 0 && Math.sign(deltaDi) === Math.sign(state.lastDeltaDi)) {
                    state.sameDirCount += 1;
                  } else {
                    state.sameDirCount = deltaDi === 0 ? 0 : 1;
                  }
                  state.lastDeltaDi = deltaDi;
                } else {
                  state.lastDeltaDi = 0;
                }
                state.prevDi = diOf(top);
                if (state.phrase) {
                  if (state.phrase.noteCount === 0) state.lastPhraseStartMidi = top.midi;
                  state.phrase.noteCount += 1;
                }
                state.previousChordPcs = chord ? chord.pcs : null;
              }
              state.previousPitch = top;
              state.previousEvent = event;
              state.lastEvent = event;
            } else {
              state.lastEvent = event;
            }
          });
        }
      });
    }

    repairMelody(measureObjects, parts, units, key, config);
    sanitizeTies(measureObjects);
    validateGenerated(measureObjects, parts, meter, measuresCount, key, units, config, phrases);

    const events = [];
    measureObjects.forEach((measure) => {
      measure.events.sort((a, b) => a.startTick - b.startTick || a.part.localeCompare(b.part) || a.voice - b.voice);
      measure.events.forEach((event) => events.push(event));
    });

    const exercise = {
      version: 2,
      seed,
      key: {
        id: key.id,
        mode: key.mode,
        tonic: key.tonic,
        accidentals: key.accidentals,
        type: key.type,
        nameIt: key.nameIt,
        nameEn: key.nameEn,
        scale: key.scale,
        scaleByLetter: key.scaleByLetter
      },
      meter: meterName,
      meterInfo: {
        numerator: meter.numerator,
        denominator: meter.denominator,
        measureTicks: meter.measureTicks,
        beatTicks: meter.beatTicks,
        compound: meter.compound,
        irregular: !!meter.irregular,
        groups: meter.groups.slice()
      },
      tempo,
      measures: measureObjects,
      parts: parts.map((part) => ({
        role: part.role,
        clef: part.clef,
        label: part.label,
        range: part.range.slice(),
        low: part.low,
        high: part.high,
        voiceCount: part.voiceCount
      })),
      phrases: phrases.map((phrase) => ({
        index: phrase.index,
        startMeasure: phrase.startMeasure,
        endMeasure: phrase.endMeasure,
        type: phrase.type,
        closed: phrase.closed
      })),
      progression: units.map((unit) => {
        const chord = chordObjectFor(key, unit);
        return {
          measure: unit.measure,
          offset: unit.offset,
          degree: unit.degree,
          roman: chord.roman,
          romanSeven: chord.romanSeven,
          quality: chord.quality,
          seventh: chord.seventhQuality,
          function: chord.function
        };
      }),
      style: config.style,
      cadence: config.cadence,
      events,
      totalTicks: meter.measureTicks * measuresCount,
      config,
      level: config.preset || 0,
      levelName: config.preset && PRESETS[config.preset] ? PRESETS[config.preset].name : 'Personalizzato',
      noteCount: events.reduce((sum, event) => sum + (event.rest ? 0 : event.pitches.length), 0),
      measureCount: measuresCount
    };
    exercise.summary = exercise.levelName + ' · ' + exercise.key.nameIt + ' · ' + exercise.meter;
    return exercise;
  }

  function repairMelody(measures, parts, units, key, config) {
    const melodyPart = parts.find((part) => part.isMelody);
    if (!melodyPart) return;
    const events = [];
    measures.forEach((measure) => {
      measure.events.forEach((event) => {
        if (event.part === melodyPart.role && event.voice === 0 && !event.rest) events.push(event);
      });
    });
    events.sort((a, b) => a.startTick - b.startTick);
    const applySnap = (event, snap) => {
      event.pitches = [snap];
      const index = events.indexOf(event);
      const next = index >= 0 && index + 1 < events.length ? events[index + 1] : null;
      if (event.tieToNext) {
        event.tieToNext = false;
        if (next && next.tieFromPrev) next.tieFromPrev = false;
      }
      for (let j = index + 1; j < events.length; j++) {
        if (events[j].tieFromPrev) continue;
        if (events[j].chromatic && Math.abs(events[j].pitches[0].midi - snap.midi) !== 1) {
          events[j].chromatic = false;
        }
        break;
      }
    };
    const snapStrong = (event) => {
      const chord = event.chord;
      if (!event.strong || !chord || event.chromatic) return false;
      const top = event.pitches[event.pitches.length - 1];
      if (chord.pcs.includes(top.pc)) return false;
      const snap = T.nearestPitch(melodyPart.pool.diatonic, top.midi, chord.pcs.slice());
      if (!snap || snap.midi === top.midi) return false;
      applySnap(event, snap);
      return true;
    };
    const snapLeap = (event, leapOrigin) => {
      const chord = event.chord;
      const top = event.pitches[event.pitches.length - 1];
      const d2 = diOf(top) - diOf(leapOrigin.top);
      const resolves = (d2 * Math.sign(leapOrigin.deltaDi) < 0 && Math.abs(d2) <= 2)
        || (chord && chord.pcs.includes(top.pc) && Math.abs(d2) <= 3);
      if (resolves) return false;
      const candidates = melodyPart.pool.diatonic.filter((pitch) => {
        if (event.strong && chord && !chord.pcs.includes(pitch.pc)) return false;
        const d = diOf(pitch) - diOf(leapOrigin.top);
        if (d * Math.sign(leapOrigin.deltaDi) < 0 && Math.abs(d) <= 2) return true;
        return chord && chord.pcs.includes(pitch.pc) && Math.abs(d) <= 3;
      });
      const snap = candidates.length ? T.nearestPitch(candidates, top.midi) : null;
      if (!snap || snap.midi === top.midi) return false;
      applySnap(event, snap);
      return true;
    };
    for (let pass = 0; pass < 6; pass++) {
      let changed = 0;
      let prevOnset = null;
      let leapOrigin = null;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.tieFromPrev) continue;
        if (snapStrong(event)) changed += 1;
        if (leapOrigin && !event.chromatic) {
          if (snapLeap(event, leapOrigin)) changed += 1;
          leapOrigin = null;
        }
        const resolvedTop = event.pitches[event.pitches.length - 1];
        if (prevOnset && Math.abs(diOf(resolvedTop) - diOf(prevOnset.top)) >= 3) {
          leapOrigin = { top: resolvedTop, deltaDi: diOf(resolvedTop) - diOf(prevOnset.top) };
        }
        prevOnset = { top: resolvedTop };
      }
      const finalEvent = events[events.length - 1];
      if (finalEvent && !finalEvent.tieFromPrev && finalEvent.chord) {
        const finalTop = finalEvent.pitches[finalEvent.pitches.length - 1];
        if (!finalEvent.chord.pcs.includes(finalTop.pc)) {
          const snap = T.nearestPitch(melodyPart.pool.diatonic, finalTop.midi, finalEvent.chord.pcs.slice());
          if (snap && snap.midi !== finalTop.midi) { finalEvent.pitches = [snap]; changed += 1; }
        }
      }
      if (!changed) break;
    }
  }

  function sanitizeTies(measures) {
    const byVoice = new Map();
    measures.forEach((measure) => {
      measure.events.forEach((event) => {
        const id = event.part + ':' + event.voice;
        if (!byVoice.has(id)) byVoice.set(id, []);
        byVoice.get(id).push(event);
      });
    });
    byVoice.forEach((events) => {
      events.sort((a, b) => a.startTick - b.startTick);
      events.forEach((event, index) => {
        const previous = index > 0 ? events[index - 1] : null;
        const next = index + 1 < events.length ? events[index + 1] : null;
        if (event.tieFromPrev) {
          const valid = previous
            && previous.tieToNext
            && !previous.rest
            && !event.rest
            && previous.pitches.length === 1
            && event.pitches.length === 1
            && previous.pitches[0].midi === event.pitches[0].midi;
          if (!valid) event.tieFromPrev = false;
        }
        if (event.tieToNext) {
          const valid = next
            && next.tieFromPrev
            && !next.rest
            && !event.rest
            && next.pitches.length === 1
            && event.pitches.length === 1
            && next.pitches[0].midi === event.pitches[0].midi;
          if (!valid) event.tieToNext = false;
        }
      });
    });
  }

  function validateGenerated(measures, parts, meter, measuresCount, key, units, config, phrases) {
    measures.forEach((measure) => {
      parts.forEach((part) => {
        for (let voice = 0; voice < part.voiceTokens.length; voice++) {
          const voices = measure.events.filter((event) => event.part === part.role && event.voice === voice);
          const total = voices.reduce((sum, event) => sum + event.duration, 0);
          if (total !== meter.measureTicks) {
            throw new Error('Errore interno: la misura ' + (measure.index + 1) + ' non è completa.');
          }
        }
      });
      const notes = measure.events.filter((event) => !event.rest && event.pitches.length);
      if (!notes.length) throw new Error('Errore interno: una misura è vuota.');
      notes.forEach((event) => {
        event.pitches.forEach((pitch) => {
          if (pitch.midi < 21 || pitch.midi > 108) throw new Error('Errore interno: nota fuori tastiera.');
          const display = T.displayAccidental(pitch, key);
          if (display !== 0 && display !== 'natural' && (display < -2 || display > 2)) {
            throw new Error('Errore interno: alterazione non rappresentabile.');
          }
        });
      });
    });

    const melodyPart = parts.find((part) => part.isMelody);
    if (melodyPart) {
      const events = [];
      measures.forEach((measure) => {
        measure.events.forEach((event) => {
          if (event.part === melodyPart.role && event.voice === 0 && !event.rest) events.push(event);
        });
      });
      events.sort((a, b) => a.startTick - b.startTick);
      let lastLeapOrigin = null;
      let prevOnsetTop = null;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.tieFromPrev) continue;
        const top = event.pitches[event.pitches.length - 1];
        if (event.strong && event.chord && !event.chromatic && !event.chord.pcs.includes(top.pc)) {
          throw new Error('Errore interno: nota forte fuori dall’armonia.');
        }
        if (event.chromatic) {
          const previous = prevOnsetTop;
          if (!previous || Math.abs(previous.midi - top.midi) !== 1) {
            throw new Error('Errore interno: cromatismo non risolto per grado congiunto.');
          }
        }
        if (lastLeapOrigin && !event.chromatic) {
          const deltaDi = diOf(top) - diOf(lastLeapOrigin.top);
          const leapDelta = lastLeapOrigin.deltaDi;
          const resolves = (deltaDi * Math.sign(leapDelta) < 0 && Math.abs(deltaDi) <= 2)
            || (event.chord && event.chord.pcs.includes(top.pc) && Math.abs(deltaDi) <= 3);
          if (!resolves) throw new Error('Errore interno: salto non risolto.');
          lastLeapOrigin = null;
        }
        if (prevOnsetTop) {
          const deltaDi = diOf(top) - diOf(prevOnsetTop);
          if (Math.abs(deltaDi) >= 3) {
            lastLeapOrigin = { top, deltaDi };
          }
        }
        prevOnsetTop = top;
      }
      const finalEvent = events[events.length - 1];
      if (finalEvent && !finalEvent.tieFromPrev && finalEvent.chord && !finalEvent.chord.pcs.includes(finalEvent.pitches[finalEvent.pitches.length - 1].pc)) {
        throw new Error('Errore interno: la nota finale non appartiene all’accordo.');
      }
    }

    if (config.cadence === 'tonal') {
      const lastUnit = units[units.length - 1];
      if (lastUnit.degree !== 0) throw new Error('Errore interno: cadenza tonale mancante.');
    }
  }

  function focusForConfig(config) {
    if (config.preset && PRESETS[config.preset]) return PRESETS[config.preset].focus.slice();
    const focus = [];
    focus.push(config.staff === 'treble' ? 'Mano destra' : config.staff === 'bass' ? 'Mano sinistra' : 'Grande pentagramma');
    focus.push(config.meters.join(' · '));
    focus.push(config.durations.map((base) => T.BASE_DURATIONS[base].label).join(' · '));
    if (config.allowTies) focus.push('Legature');
    if (config.allowTuplets) focus.push('Terzine');
    return focus.slice(0, 4);
  }

  function descriptionForConfig(config) {
    if (config.preset && PRESETS[config.preset]) return PRESETS[config.preset].description;
    return 'Impostazioni personalizzate: costruisci il tuo esercizio e rigeneralo quando vuoi.';
  }

  window.ExerciseGenerator = {
    PRESETS,
    DEFAULT_CONFIG,
    LEVEL_NAMES,
    clonePreset,
    defaultConfig,
    normalizeConfig,
    validateConfig,
    generate,
    randomSeed,
    parseSeed,
    rangeToMidi,
    meterFillable,
    focusForConfig,
    descriptionForConfig
  };
})();
