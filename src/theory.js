(function () {
  'use strict';

  const PPQ = 480;
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const LETTER_NAMES_IT = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
  const ACCIDENTAL_NAMES_IT = { '-2': 'doppio bemolle', '-1': 'bemolle', '0': '', '1': 'diesis', '2': 'doppio diesis' };

  const BASE_DURATIONS = {
    whole: { ticks: 1920, label: 'semibreve', short: 'semibreve', flags: 0 },
    half: { ticks: 960, label: 'minima', short: 'minima', flags: 0 },
    quarter: { ticks: 480, label: 'semiminima', short: 'semiminima', flags: 0 },
    eighth: { ticks: 240, label: 'croma', short: 'croma', flags: 1 },
    sixteenth: { ticks: 120, label: 'semicroma', short: 'semicroma', flags: 2 },
    thirtysecond: { ticks: 60, label: 'biscroma', short: 'biscroma', flags: 3 }
  };

  const DURATION_ORDER = ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'];

  const METERS = {
    '2/4': { name: '2/4', numerator: 2, denominator: 4, measureTicks: 960, beatTicks: 480, groups: [480, 480], compound: false, irregular: false },
    '3/4': { name: '3/4', numerator: 3, denominator: 4, measureTicks: 1440, beatTicks: 480, groups: [480, 480, 480], compound: false, irregular: false },
    '4/4': { name: '4/4', numerator: 4, denominator: 4, measureTicks: 1920, beatTicks: 480, groups: [480, 480, 480, 480], compound: false, irregular: false },
    '2/2': { name: '2/2', numerator: 2, denominator: 2, measureTicks: 1920, beatTicks: 960, groups: [960, 960], compound: false, irregular: false },
    '3/8': { name: '3/8', numerator: 3, denominator: 8, measureTicks: 720, beatTicks: 240, groups: [720], compound: false, irregular: false },
    '6/8': { name: '6/8', numerator: 6, denominator: 8, measureTicks: 1440, beatTicks: 720, groups: [720, 720], compound: true, irregular: false },
    '9/8': { name: '9/8', numerator: 9, denominator: 8, measureTicks: 2160, beatTicks: 720, groups: [720, 720, 720], compound: true, irregular: false },
    '12/8': { name: '12/8', numerator: 12, denominator: 8, measureTicks: 2880, beatTicks: 720, groups: [720, 720, 720, 720], compound: true, irregular: false },
    '5/4': { name: '5/4', numerator: 5, denominator: 4, measureTicks: 2400, beatTicks: 480, groups: [1440, 960], compound: false, irregular: true },
    '5/8': { name: '5/8', numerator: 5, denominator: 8, measureTicks: 1200, beatTicks: 240, groups: [480, 720], compound: false, irregular: true },
    '7/8': { name: '7/8', numerator: 7, denominator: 8, measureTicks: 1680, beatTicks: 240, groups: [480, 480, 720], compound: false, irregular: true }
  };

  const MODE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    'minor-natural': [0, 2, 3, 5, 7, 8, 10],
    'minor-harmonic': [0, 2, 3, 5, 7, 8, 11],
    'minor-melodic': [0, 2, 3, 5, 7, 9, 11]
  };

  const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  const DEGREE_FUNCTIONS = {
    major: { 0: 'T', 1: 'S', 2: 'T', 3: 'S', 4: 'D', 5: 'T', 6: 'D' },
    minor: { 0: 'T', 1: 'S', 2: 'T', 3: 'S', 4: 'D', 5: 'S', 6: 'D' }
  };

  const CLEFS = {
    treble: { name: 'treble', label: 'Violino', glyph: 'treble', referenceLetter: 'E', referenceOctave: 4, originStep: 2 },
    bass: { name: 'bass', label: 'Basso', glyph: 'bass', referenceLetter: 'G', referenceOctave: 2, originStep: 6 }
  };

  const KEY_SIGNATURE_STEPS = {
    treble: { sharp: [8, 5, 9, 6, 3, 7, 4], flat: [4, 7, 3, 6, 2, 5, 1] },
    bass: { sharp: [6, 3, 7, 4, 1, 5, 2], flat: [2, 5, 1, 4, 0, 3, -1] }
  };

  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

  const MAJOR_TONICS = [
    ['C', 0, 0, 'natural'],
    ['G', 0, 1, 'sharp'],
    ['D', 0, 2, 'sharp'],
    ['A', 0, 3, 'sharp'],
    ['E', 0, 4, 'sharp'],
    ['B', 0, 5, 'sharp'],
    ['F', 1, 6, 'sharp'],
    ['C', 1, 7, 'sharp'],
    ['F', 0, 1, 'flat'],
    ['B', -1, 2, 'flat'],
    ['E', -1, 3, 'flat'],
    ['A', -1, 4, 'flat'],
    ['D', -1, 5, 'flat'],
    ['G', -1, 6, 'flat'],
    ['C', -1, 7, 'flat']
  ];

  const MINOR_TONICS = [
    ['A', 0, 0, 'natural'],
    ['E', 0, 1, 'sharp'],
    ['B', 0, 2, 'sharp'],
    ['F', 1, 3, 'sharp'],
    ['C', 1, 4, 'sharp'],
    ['G', 1, 5, 'sharp'],
    ['D', 1, 6, 'sharp'],
    ['A', 1, 7, 'sharp'],
    ['D', 0, 1, 'flat'],
    ['G', 0, 2, 'flat'],
    ['C', 0, 3, 'flat'],
    ['F', 0, 4, 'flat'],
    ['B', -1, 5, 'flat'],
    ['E', -1, 6, 'flat'],
    ['A', -1, 7, 'flat']
  ];

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function normalizeAccidental(value) {
    let acc = Number(value) || 0;
    while (acc > 6) acc -= 12;
    while (acc < -6) acc += 12;
    return clamp(acc, -2, 2);
  }

  function diatonicIndex(pitch) {
    return pitch.octave * 7 + LETTERS.indexOf(pitch.letter);
  }

  function midiFromPitch(pitch) {
    return (pitch.octave + 1) * 12 + LETTER_SEMITONE[pitch.letter] + pitch.accidental;
  }

  function pitchToMidi(pitch) { return midiFromPitch(pitch); }

  function pitchFromMidi(midi, preferFlat) {
    const names = preferFlat
      ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
      : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pc = ((midi % 12) + 12) % 12;
    const name = names[pc];
    const letter = name[0];
    const accidental = name.length > 1 ? (name[1] === '#' ? 1 : -1) : 0;
    return { letter, accidental, octave: Math.floor(midi / 12) - 1 };
  }

  function noteNameIt(pitch) {
    const base = LETTER_NAMES_IT[pitch.letter] || pitch.letter;
    const acc = pitch.accidental || 0;
    if (acc > 0) return base + '♯'.repeat(acc);
    if (acc < 0) return base + '♭'.repeat(-acc);
    return base;
  }

  function noteNameEn(pitch) {
    return pitch.letter + (pitch.accidental > 0 ? '#'.repeat(pitch.accidental) : '♭'.repeat(-pitch.accidental));
  }

  function formatPitchIt(pitch, includeOctave) {
    return noteNameIt(pitch) + (includeOctave === false ? '' : String(pitch.octave));
  }

  function formatPitchEn(pitch, includeOctave) {
    return noteNameEn(pitch) + (includeOctave === false ? '' : String(pitch.octave));
  }

  function accidentalSuffixIt(pitch) {
    const acc = pitch.accidental || 0;
    return ACCIDENTAL_NAMES_IT[String(acc)] || '';
  }

  function parseNoteName(text) {
    if (typeof text !== 'string') return null;
    const match = text.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)$/);
    if (!match) return null;
    let accidental = 0;
    if (match[2] === '#' || match[2] === '♯') accidental = 1;
    if (match[2] === 'b' || match[2] === '♭') accidental = -1;
    return { letter: match[1].toUpperCase(), accidental, octave: parseInt(match[3], 10) };
  }

  function makeKey(definition, mode) {
    const letter = definition[0];
    const accidental = definition[1];
    const count = definition[2];
    const type = definition[3];
    const tonic = { letter, accidental, octave: mode === 'minor' ? 3 : 4 };
    const id = letter + (accidental > 0 ? '#' : accidental < 0 ? 'b' : '') + (mode === 'minor' ? 'm' : '');
    const key = {
      id,
      mode,
      tonic,
      accidentals: count,
      type,
      nameIt: noteNameIt(tonic) + ' ' + (mode === 'major' ? 'maggiore' : 'minore'),
      nameEn: noteNameEn(tonic) + ' ' + mode
    };
    key.scale = buildScale(key);
    key.scaleByLetter = {};
    key.scale.forEach((pitch) => { key.scaleByLetter[pitch.letter] = pitch.accidental; });
    return key;
  }

  function buildScale(key, intervalsOverride) {
    const intervals = intervalsOverride || (key.mode === 'major' ? MODE_INTERVALS.major : MODE_INTERVALS['minor-natural']);
    const tonicLetterIndex = LETTERS.indexOf(key.tonic.letter);
    const tonicPc = (LETTER_SEMITONE[key.tonic.letter] + key.tonic.accidental + 120) % 12;
    const scale = [];
    for (let degree = 0; degree < 7; degree++) {
      const letter = LETTERS[(tonicLetterIndex + degree) % 7];
      const targetPc = (tonicPc + intervals[degree]) % 12;
      let accidental = ((targetPc - LETTER_SEMITONE[letter] + 12) % 12);
      if (accidental > 6) accidental -= 12;
      accidental = normalizeAccidental(accidental);
      scale.push({ letter, accidental, degree, pc: targetPc });
    }
    return scale;
  }

  function scaleForFlavor(key, flavor) {
    if (!key || key.mode === 'major') return key ? key.scale.map((tone) => Object.assign({}, tone)) : [];
    const id = MODE_INTERVALS[flavor] ? flavor : 'minor-natural';
    return buildScale(key, MODE_INTERVALS[id]);
  }

  const MAJOR_KEYS = MAJOR_TONICS.map((definition) => makeKey(definition, 'major'));
  const MINOR_KEYS = MINOR_TONICS.map((definition) => makeKey(definition, 'minor'));
  const ALL_KEYS = MAJOR_KEYS.concat(MINOR_KEYS);

  function getKeyById(id) {
    return ALL_KEYS.find((key) => key.id === id) || MAJOR_KEYS[0];
  }

  function getKeysForOptions(maxAccidentals, allowMinor) {
    return ALL_KEYS.filter((key) => key.accidentals <= maxAccidentals && (allowMinor || key.mode === 'major'));
  }

  function staffReferenceStep(clef, pitch) {
    const reference = CLEFS[clef];
    return (pitch.octave - reference.referenceOctave) * 7 + LETTERS.indexOf(pitch.letter) - LETTERS.indexOf(reference.referenceLetter);
  }

  function staffStep(pitch, clef) {
    return staffReferenceStep(clef, pitch);
  }

  function staffStepRange(clef, lowPitch, highPitch) {
    return { low: staffStep(lowPitch, clef), high: staffStep(highPitch, clef) };
  }

  function ledgerSteps(step) {
    const lines = [];
    if (step < 0) {
      for (let s = -2; s >= step; s -= 2) lines.push(s);
    } else if (step > 8) {
      for (let s = 10; s <= step; s += 2) lines.push(s);
    }
    return lines;
  }

  function ledgerCount(step) { return ledgerSteps(step).length; }

  function noteY(step, bottomLineY, space) {
    return bottomLineY - (step * space) / 2;
  }

  function durationTicks(token) {
    if (!token || !token.base) return null;
    const base = BASE_DURATIONS[token.base];
    if (!base) return null;
    const dots = token.dots || 0;
    if (dots < 0 || dots > 2) return null;
    let ticks = base.ticks * (2 - Math.pow(0.5, dots));
    if (token.tuplet) {
      if (!token.tuplet.num || !token.tuplet.den) return null;
      ticks *= token.tuplet.den / token.tuplet.num;
    }
    if (Math.abs(ticks - Math.round(ticks)) > 1e-7) return null;
    return Math.round(ticks);
  }

  function tokenFlags(token) {
    const base = BASE_DURATIONS[token.base];
    return base ? base.flags : 0;
  }

  function makeToken(base, dots, tuplet) {
    const token = { base, dots: dots || 0 };
    if (tuplet) token.tuplet = { num: tuplet.num, den: tuplet.den };
    token.ticks = durationTicks(token);
    return token;
  }

  function tokenNameIt(token) {
    if (!token) return '';
    const base = BASE_DURATIONS[token.base];
    let name = base ? base.label : token.base;
    const dots = token.dots || 0;
    if (dots === 1) name += ' puntata';
    else if (dots === 2) name += ' doppiamente puntata';
    if (token.tuplet) name = 'terzina di ' + (base ? base.label : token.base);
    return name;
  }

  function tokenNameShortIt(token) {
    if (!token) return '';
    const base = BASE_DURATIONS[token.base];
    let name = base ? base.label : token.base;
    if (token.dots === 1) name += ' puntata';
    else if (token.dots === 2) name += ' doppia puntatura';
    if (token.tuplet) name = 'terzina';
    return name;
  }

  function meterInfo(name) {
    return METERS[name] || null;
  }

  function beatPositions(meterName) {
    const meter = meterInfo(meterName);
    if (!meter) return [];
    const positions = [0];
    let position = 0;
    meter.groups.forEach((group) => {
      position += group;
      if (position < meter.measureTicks) positions.push(position);
    });
    return positions;
  }

  function isOnGroupBoundary(tick, meterName) {
    return beatPositions(meterName).includes(tick);
  }

  function keySignatureSteps(clef, key) {
    if (!key || key.accidentals === 0) return [];
    const type = key.type === 'flat' ? 'flat' : 'sharp';
    return KEY_SIGNATURE_STEPS[clef][type].slice(0, key.accidentals);
  }

  function displayAccidental(pitch, key) {
    const keyAcc = key && key.scaleByLetter ? (key.scaleByLetter[pitch.letter] || 0) : 0;
    const pitchAcc = pitch.accidental || 0;
    if (pitchAcc === 0 && keyAcc !== 0) return 'natural';
    const diff = pitchAcc - keyAcc;
    if (diff === 0) return 0;
    if (diff > 0) return diff >= 2 ? 2 : 1;
    return diff <= -2 ? -2 : -1;
  }

  function accidentalGlyph(display) {
    if (display === 'natural') return 'natural';
    if (display >= 2) return 'doubleSharp';
    if (display === 1) return 'sharp';
    if (display === -1) return 'flat';
    if (display <= -2) return 'doubleFlat';
    return 'natural';
  }

  function chordForDegree(key, degree, opts) {
    const options = opts || {};
    const index = ((degree % 7) + 7) % 7;
    const scale = key.mode === 'minor'
      ? scaleForFlavor(key, options.flavor || 'minor-natural')
      : key.scale;
    const root = scale[index];
    const third = scale[(index + 2) % 7];
    const fifth = scale[(index + 4) % 7];
    const seventhTone = scale[(index + 6) % 7];
    const thirdPc = third.pc;
    const fifthPc = fifth.pc;
    const thirdInterval = (thirdPc - root.pc + 12) % 12;
    const fifthInterval = (fifthPc - root.pc + 12) % 12;
    const seventhInterval = (seventhTone.pc - root.pc + 12) % 12;
    let quality = 'maj';
    if (thirdInterval === 3 && fifthInterval === 7) quality = 'min';
    else if (thirdInterval === 3 && fifthInterval === 6) quality = 'dim';
    else if (thirdInterval === 4 && fifthInterval === 8) quality = 'aug';
    const pcs = [];
    [root.pc, thirdPc, fifthPc].forEach((pc) => { if (!pcs.includes(pc)) pcs.push(pc); });
    let seventhQuality = null;
    let seventhPc = null;
    if (options.seventh) {
      seventhPc = seventhTone.pc;
      if (quality === 'maj' && seventhInterval === 11) seventhQuality = 'maj7';
      else if (quality === 'maj' && seventhInterval === 10) seventhQuality = '7';
      else if (quality === 'min' && seventhInterval === 10) seventhQuality = 'min7';
      else if (quality === 'dim' && seventhInterval === 10) seventhQuality = 'hdim7';
      else if (quality === 'dim' && seventhInterval === 9) seventhQuality = 'dim7';
      else seventhQuality = 'add7';
      if (!pcs.includes(seventhPc)) pcs.push(seventhPc);
    }
    const lower = quality === 'min' || quality === 'dim';
    let roman = lower ? ROMAN_NUMERALS[index].toLowerCase() : ROMAN_NUMERALS[index];
    if (quality === 'dim') roman += '°';
    if (quality === 'aug') roman += '+';
    let romanSeven = null;
    if (options.seventh) {
      if (seventhQuality === 'hdim7') romanSeven = ROMAN_NUMERALS[index].toLowerCase() + 'ø7';
      else if (seventhQuality === 'dim7') romanSeven = ROMAN_NUMERALS[index].toLowerCase() + '°7';
      else if (seventhQuality === 'maj7') romanSeven = roman + 'Δ7';
      else romanSeven = roman + '7';
    }
    const functionTable = DEGREE_FUNCTIONS[key.mode === 'minor' ? 'minor' : 'major'];
    return {
      degree: index,
      rootPc: root.pc,
      thirdPc,
      fifthPc,
      seventhPc,
      pcs,
      quality,
      seventhQuality,
      roman,
      romanSeven,
      function: functionTable[index] || 'T',
      rootLetter: root.letter,
      rootAccidental: root.accidental
    };
  }

  function buildPitchPool(key, clef, lowMidi, highMidi, maxLedger, includeChromatic, scaleOverride) {
    const diatonic = [];
    const chromatic = [];
    const seenDiatonic = new Set();
    const seenChromatic = new Set();
    const scale = scaleOverride && scaleOverride.length ? scaleOverride : key.scale;

    for (let octave = 0; octave <= 8; octave++) {
      for (let degree = 0; degree < scale.length; degree++) {
        const scaleTone = scale[degree];
        const pitch = { letter: scaleTone.letter, accidental: scaleTone.accidental, octave, degree, pc: scaleTone.pc };
        const midi = midiFromPitch(pitch);
        const step = staffStep(pitch, clef);
        if (midi < lowMidi || midi > highMidi) continue;
        if (ledgerCount(step) > maxLedger) continue;
        const id = pitch.letter + ':' + pitch.accidental + ':' + pitch.octave;
        if (seenDiatonic.has(id)) continue;
        seenDiatonic.add(id);
        pitch.midi = midi;
        diatonic.push(pitch);
      }
    }

    if (includeChromatic) {
      diatonic.forEach((basePitch) => {
        [-1, 1].forEach((delta) => {
          const accidental = basePitch.accidental + delta;
          if (accidental < -2 || accidental > 2) return;
          const pitch = {
            letter: basePitch.letter,
            accidental,
            octave: basePitch.octave,
            degree: basePitch.degree,
            pc: (basePitch.pc + delta + 12) % 12
          };
          const midi = midiFromPitch(pitch);
          const step = staffStep(pitch, clef);
          if (midi < lowMidi || midi > highMidi) return;
          if (ledgerCount(step) > maxLedger) return;
          const id = pitch.letter + ':' + pitch.accidental + ':' + pitch.octave;
          if (seenDiatonic.has(id) || seenChromatic.has(id)) return;
          seenChromatic.add(id);
          pitch.midi = midi;
          chromatic.push(pitch);
        });
      });
    }

    diatonic.sort((a, b) => a.midi - b.midi || a.letter.localeCompare(b.letter));
    chromatic.sort((a, b) => a.midi - b.midi || a.letter.localeCompare(b.letter));
    return { diatonic, chromatic, all: diatonic.concat(chromatic) };
  }

  function nearestPitch(pool, targetMidi, allowedPcs) {
    const filtered = allowedPcs && allowedPcs.length
      ? pool.filter((pitch) => allowedPcs.includes(pitch.pc))
      : pool;
    if (!filtered.length) return null;
    let best = filtered[0];
    let bestDistance = Math.abs(best.midi - targetMidi);
    for (let i = 1; i < filtered.length; i++) {
      const distance = Math.abs(filtered[i].midi - targetMidi);
      if (distance < bestDistance) {
        best = filtered[i];
        bestDistance = distance;
      }
    }
    return best;
  }

  function pitchesByPc(pool, pcs) {
    return pool.filter((pitch) => pcs.includes(pitch.pc));
  }

  function intervalNameIt(semitones) {
    const abs = Math.abs(semitones);
    const names = {
      0: 'unisono', 1: 'seconda minore', 2: 'seconda maggiore', 3: 'terza minore',
      4: 'terza maggiore', 5: 'quarta giusta', 6: 'tritono', 7: 'quinta giusta',
      8: 'sesta minore', 9: 'sesta maggiore', 10: 'settima minore', 11: 'settima maggiore',
      12: 'ottava'
    };
    return names[abs] || (abs + ' semitoni');
  }

  function keyText(key) {
    return key ? key.nameIt : '';
  }

  function timeSignatureGlyph(number) {
    return 'time' + String(number);
  }

  function durationLabelFromTicks(ticks) {
    const entries = Object.keys(BASE_DURATIONS).map((name) => ({ name, ticks: BASE_DURATIONS[name].ticks }));
    for (const entry of entries) {
      if (entry.ticks === ticks) return BASE_DURATIONS[entry.name].label;
    }
    return ticks + ' tick';
  }

  window.MusicTheory = {
    PPQ,
    LETTERS,
    LETTER_SEMITONE,
    LETTER_NAMES_IT,
    ACCIDENTAL_NAMES_IT,
    BASE_DURATIONS,
    DURATION_ORDER,
    METERS,
    MODE_INTERVALS,
    ROMAN_NUMERALS,
    CLEFS,
    KEY_SIGNATURE_STEPS,
    SHARP_ORDER,
    FLAT_ORDER,
    MAJOR_KEYS,
    MINOR_KEYS,
    ALL_KEYS,
    clamp,
    normalizeAccidental,
    diatonicIndex,
    midiFromPitch,
    pitchToMidi,
    pitchFromMidi,
    noteNameIt,
    noteNameEn,
    formatPitchIt,
    formatPitchEn,
    accidentalSuffixIt,
    parseNoteName,
    getKeyById,
    getKeysForOptions,
    staffStep,
    staffStepRange,
    ledgerSteps,
    ledgerCount,
    noteY,
    durationTicks,
    tokenFlags,
    makeToken,
    tokenNameIt,
    tokenNameShortIt,
    meterInfo,
    beatPositions,
    isOnGroupBoundary,
    keySignatureSteps,
    displayAccidental,
    accidentalGlyph,
    chordForDegree,
    scaleForFlavor,
    buildPitchPool,
    nearestPitch,
    pitchesByPc,
    intervalNameIt,
    keyText,
    timeSignatureGlyph,
    durationLabelFromTicks
  };
})();
