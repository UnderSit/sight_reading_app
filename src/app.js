(function () {
  'use strict';

  const T = window.MusicTheory;
  const G = window.ExerciseGenerator;
  const R = window.RhythmEngine;

  const METER_ORDER = ['2/4', '3/4', '4/4', '2/2', '3/8', '6/8', '9/8', '12/8', '5/4', '5/8', '7/8'];
  const DURATION_ORDER = ['whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond'];
  const NATURAL_NOTES = [];

  for (let octave = 1; octave <= 7; octave++) {
    T.LETTERS.forEach((letter) => {
      NATURAL_NOTES.push({ letter, accidental: 0, octave });
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes + ':' + String(rest).padStart(2, '0');
  }

  function formatWhen(date) {
    if (!date) return '';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const now = new Date();
    const sameDay = value.getFullYear() === now.getFullYear()
      && value.getMonth() === now.getMonth()
      && value.getDate() === now.getDate();
    if (sameDay) return value.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return value.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  }

  class PrimaVista {
    constructor() {
      this.storage = new window.StorageManager();
      this.audio = new window.AudioEngine();
      this.settings = this.loadSettings();
      this.stats = this.storage.loadStats();
      this.exercise = null;
      this.mode = 'read';
      this.showNames = false;
      this.showNamesBeforeQuiz = false;
      this.keyboardLabels = true;
      this.completed = false;
      this.completedAt = null;
      this.analysisOpen = false;
      this.quiz = null;
      this.playback = null;
      this.playingIds = new Set();
      this.playingMidis = new Map();
      this.sessionQuizAttempts = 0;
      this.sessionQuizCorrect = 0;
      this.resizeTimer = null;
      this.lastScoreWidth = 0;
      this.theme = 'light';
      this.midiAccess = null;
      this.midiNoteOff = new Map();
      this.elements = {};
      this.cacheElements();
      this.renderer = new window.ScoreRenderer(this.elements.scoreSvg, this.elements.scoreContainer);
      this.keyboard = new window.PianoKeyboard(this.elements.keyboard, {
        lowMidi: 36,
        highMidi: 96,
        labels: this.keyboardLabels,
        onNoteOn: (midi) => this.handleNoteOn(midi),
        onNoteOff: (midi) => this.handleNoteOff(midi)
      });
      this.populateLevelSelect();
      this.populateSettingsOptions();
      this.bindEvents();
      this.applyTheme(this.storage.loadTheme(), false);
      this.updateStatsUi();
      this.updateLevelUi();
      this.newExercise();
    }

    cacheElements() {
      const ids = [
        'level-select', 'level-name', 'header-streak', 'header-total', 'header-accuracy',
        'theme-toggle', 'settings-open', 'exercise-eyebrow', 'exercise-title', 'exercise-sub',
        'meta-badges', 'mode-hint', 'play-button', 'play-label', 'restart-button', 'names-button',
        'analysis-button', 'complete-button', 'new-button', 'score-container', 'score-svg',
        'score-placeholder', 'score-error', 'score-error-text', 'score-error-retry',
        'quiz-panel', 'quiz-title', 'quiz-prompt', 'quiz-feedback', 'quiz-progress', 'quiz-skip',
        'quiz-exit', 'completion-note', 'completion-text', 'completion-new', 'answer-panel',
        'answer-content', 'answer-close', 'keyboard-range', 'keyboard-labels', 'midi-button',
        'keyboard-status', 'keyboard', 'keyboard-hint', 'level-card-title', 'level-card-sub',
        'level-description', 'level-focus', 'session-measures', 'session-notes', 'session-tempo',
        'session-duration', 'stat-total', 'stat-completed', 'stat-accuracy', 'stat-streak',
        'recent-list', 'recent-empty', 'storage-note', 'print-button', 'test-open', 'about-open',
        'reset-stats', 'settings-dialog', 'settings-form', 'settings-close', 'settings-cancel',
        'settings-reset', 'settings-error', 'settings-seed', 'settings-seed-clear',
        'settings-rh-low', 'settings-rh-high', 'settings-lh-low', 'settings-lh-high',
        'settings-max-ledger', 'settings-max-ledger-value', 'settings-meters',
        'settings-durations', 'settings-dots', 'settings-ties', 'settings-syncopation',
        'settings-tuplets', 'settings-rest', 'settings-rest-value', 'settings-tempo-min',
        'settings-tempo-max', 'settings-accidentals', 'settings-accidentals-value',
        'settings-fixed-key', 'settings-minor', 'settings-chromatic', 'settings-chord-hand',
        'settings-style', 'settings-minor-flavor', 'settings-phrase-repetition',
        'settings-phrase-repetition-value',
        'about-dialog', 'about-close', 'test-dialog', 'test-close', 'test-summary',
        'test-results', 'test-run', 'test-done', 'confirm-dialog', 'confirm-text',
        'confirm-cancel', 'confirm-ok', 'toast', 'brand-home'
      ];
      ids.forEach((id) => {
        const key = id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        this.elements[key] = byId(id);
      });
      this.elements.modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
    }

    loadSettings() {
      const saved = this.storage.loadSettings();
      if (!saved) return G.defaultConfig();
      const validation = G.validateConfig(saved);
      if (!validation.valid) return G.defaultConfig();
      const config = validation.config;
      if (!config.preset || !G.PRESETS[config.preset]) config.preset = 1;
      return config;
    }

    populateLevelSelect() {
      clearNode(this.elements.levelSelect);
      Object.keys(G.PRESETS).map(Number).sort((a, b) => a - b).forEach((level) => {
        const option = document.createElement('option');
        option.value = String(level);
        option.textContent = level + ' · ' + G.PRESETS[level].name;
        this.elements.levelSelect.appendChild(option);
      });
      this.elements.levelSelect.value = String(this.settings.preset || 1);
    }

    populateSettingsOptions() {
      [this.elements.settingsRhLow, this.elements.settingsRhHigh, this.elements.settingsLhLow, this.elements.settingsLhHigh].forEach((select) => {
        clearNode(select);
        NATURAL_NOTES.forEach((pitch) => {
          const option = document.createElement('option');
          option.value = pitch.letter + pitch.octave;
          option.textContent = T.formatPitchIt(pitch, true);
          select.appendChild(option);
        });
      });
      clearNode(this.elements.settingsFixedKey);
      const groups = [
        ['Maggiori', T.MAJOR_KEYS],
        ['Minori', T.MINOR_KEYS]
      ];
      groups.forEach(([label, keys]) => {
        const group = document.createElement('optgroup');
        group.label = label;
        keys.forEach((key) => {
          const option = document.createElement('option');
          option.value = key.id;
          option.textContent = key.nameIt;
          group.appendChild(option);
        });
        this.elements.settingsFixedKey.appendChild(group);
      });
      clearNode(this.elements.settingsMeters);
      METER_ORDER.forEach((meter) => {
        const label = document.createElement('label');
        label.className = 'chip';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.meter = meter;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + meter));
        this.elements.settingsMeters.appendChild(label);
      });
      clearNode(this.elements.settingsDurations);
      DURATION_ORDER.forEach((base) => {
        const label = document.createElement('label');
        label.className = 'chip';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.duration = base;
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + T.BASE_DURATIONS[base].label));
        this.elements.settingsDurations.appendChild(label);
      });
      this.elements.keyboardRange.textContent = this.keyboard.rangeLabel();
    }

    bindEvents() {
      this.elements.levelSelect.addEventListener('change', () => this.applyPreset(Number(this.elements.levelSelect.value)));
      this.elements.themeToggle.addEventListener('click', () => this.applyTheme(this.theme === 'dark' ? 'light' : 'dark', true));
      this.elements.settingsOpen.addEventListener('click', () => this.openSettings());
      this.elements.settingsClose.addEventListener('click', () => this.closeDialog(this.elements.settingsDialog));
      this.elements.settingsCancel.addEventListener('click', () => this.closeDialog(this.elements.settingsDialog));
      this.elements.settingsReset.addEventListener('click', () => {
        const preset = G.clonePreset(this.settings.preset || 1);
        this.fillSettingsForm(preset);
        this.elements.settingsError.textContent = '';
      });
      this.elements.settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.saveSettingsFromForm();
      });
      this.elements.settingsSeedClear.addEventListener('click', () => {
        this.elements.settingsSeed.value = '';
        this.elements.settingsSeed.focus();
      });
      const liveValues = [
        [this.elements.settingsMaxLedger, this.elements.settingsMaxLedgerValue, (value) => value],
        [this.elements.settingsRest, this.elements.settingsRestValue, (value) => value + '%'],
        [this.elements.settingsAccidentals, this.elements.settingsAccidentalsValue, (value) => value],
        [this.elements.settingsPhraseRepetition, this.elements.settingsPhraseRepetitionValue, (value) => value + '%']
      ];
      liveValues.forEach(([input, output, format]) => {
        const update = () => { output.textContent = format(input.value); };
        input.addEventListener('input', update);
      });
      Array.from(document.querySelectorAll('[data-select-all]')).forEach((button) => {
        button.addEventListener('click', () => {
          const container = byId(button.dataset.selectAll);
          if (!container) return;
          const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
          const allOn = boxes.length > 0 && boxes.every((box) => box.checked);
          boxes.forEach((box) => { box.checked = !allOn; });
        });
      });
      Array.from(document.querySelectorAll('input[name="settings-key-mode"]')).forEach((input) => {
        input.addEventListener('change', () => {
          this.elements.settingsFixedKey.disabled = !document.querySelector('input[name="settings-key-mode"][value="fixed"]').checked;
        });
      });
      this.elements.playButton.addEventListener('click', () => this.togglePlayback());
      this.elements.restartButton.addEventListener('click', () => this.restartPlayback());
      this.elements.namesButton.addEventListener('click', () => this.setShowNames(!this.showNames));
      this.elements.analysisButton.addEventListener('click', () => this.toggleAnalysis());
      this.elements.answerClose.addEventListener('click', () => this.setAnalysis(false));
      this.elements.completeButton.addEventListener('click', () => this.completeExercise());
      this.elements.newButton.addEventListener('click', () => this.newExercise());
      this.elements.completionNew.addEventListener('click', () => this.newExercise());
      this.elements.brandHome.addEventListener('click', (event) => {
        event.preventDefault();
        this.newExercise();
      });
      this.elements.scoreErrorRetry.addEventListener('click', () => this.newExercise());
      this.elements.modeButtons.forEach((button) => {
        button.addEventListener('click', () => this.setMode(button.dataset.mode));
      });
      this.elements.quizSkip.addEventListener('click', () => this.skipQuizNote());
      this.elements.quizExit.addEventListener('click', () => this.setMode('read'));
      this.elements.keyboardLabels.addEventListener('change', () => {
        this.keyboardLabels = this.elements.keyboardLabels.checked;
        if (this.mode !== 'quiz') this.keyboard.setLabels(this.keyboardLabels);
      });
      this.elements.midiButton.addEventListener('click', () => this.connectMidi());
      this.elements.printButton.addEventListener('click', () => window.print());
      this.elements.aboutOpen.addEventListener('click', () => this.openDialog(this.elements.aboutDialog));
      this.elements.aboutClose.addEventListener('click', () => this.closeDialog(this.elements.aboutDialog));
      this.elements.testOpen.addEventListener('click', () => this.openTests());
      this.elements.testClose.addEventListener('click', () => this.closeDialog(this.elements.testDialog));
      this.elements.testDone.addEventListener('click', () => this.closeDialog(this.elements.testDialog));
      this.elements.testRun.addEventListener('click', () => this.runTests());
      this.elements.resetStats.addEventListener('click', () => this.openDialog(this.elements.confirmDialog));
      this.elements.confirmCancel.addEventListener('click', () => this.closeDialog(this.elements.confirmDialog));
      this.elements.confirmOk.addEventListener('click', () => this.resetStatistics());
      [this.elements.settingsDialog, this.elements.aboutDialog, this.elements.testDialog, this.elements.confirmDialog].forEach((dialog) => {
        dialog.addEventListener('click', (event) => {
          if (event.target === dialog) this.closeDialog(dialog);
        });
      });
      document.addEventListener('keydown', (event) => this.handleShortcut(event));
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.queueResizeRender());
        this.resizeObserver.observe(this.elements.scoreContainer);
      } else {
        window.addEventListener('resize', () => this.queueResizeRender());
      }
    }

    handleShortcut(event) {
      if (event.defaultPrevented) return;
      if (event.target && event.target.closest && event.target.closest('input, select, textarea, button, a, dialog')) return;
      if (event.key === 'Escape') {
        if (this.mode === 'quiz') {
          event.preventDefault();
          this.setMode('read');
        }
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        this.togglePlayback();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        this.newExercise();
      } else if (key === 'r') {
        event.preventDefault();
        this.restartPlayback();
      } else if (key === 'a') {
        event.preventDefault();
        this.toggleAnalysis();
      } else if (event.key === '?') {
        event.preventDefault();
        this.openDialog(this.elements.aboutDialog);
      }
    }

    applyPreset(level) {
      if (!G.PRESETS[level]) return;
      this.settings = G.clonePreset(level);
      this.storage.saveSettings(this.settings);
      this.updateLevelUi();
      this.newExercise();
    }

    applyTheme(theme, persist) {
      this.theme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = this.theme;
      if (persist) this.storage.saveTheme(this.theme);
      this.elements.themeToggle.setAttribute('aria-label', this.theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro');
      this.elements.themeToggle.innerHTML = this.theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
    }

    updateLevelUi() {
      const preset = G.PRESETS[this.settings.preset] || G.PRESETS[1];
      if (this.elements.levelSelect.value !== String(this.settings.preset)) {
        this.elements.levelSelect.value = String(this.settings.preset || 1);
      }
      this.elements.levelName.textContent = preset.shortName;
      this.elements.levelCardTitle.textContent = preset.name;
      this.elements.levelCardSub.textContent = preset.shortName;
      this.elements.levelDescription.textContent = G.descriptionForConfig(this.settings);
      clearNode(this.elements.levelFocus);
      G.focusForConfig(this.settings).forEach((text) => {
        const chip = document.createElement('span');
        chip.className = 'focus-chip';
        chip.textContent = text;
        this.elements.levelFocus.appendChild(chip);
      });
    }

    newExercise() {
      this.stopPlayback();
      if (this.exercise && !this.completed) this.stats.streak = 0;
      let exercise;
      try {
        exercise = G.generate(this.settings);
      } catch (error) {
        this.showGenerationError(error);
        return;
      }
      this.exercise = exercise;
      this.completed = false;
      this.completedAt = null;
      this.sessionQuizAttempts = 0;
      this.sessionQuizCorrect = 0;
      this.analysisOpen = false;
      this.elements.analysisButton.setAttribute('aria-expanded', 'false');
      this.elements.analysisButton.classList.remove('is-on');
      this.elements.answerPanel.hidden = true;
      this.stats.totalExercises += 1;
      this.stats.lastActive = new Date().toISOString();
      this.storage.saveStats(this.stats);
      this.elements.scoreError.hidden = true;
      this.elements.scorePlaceholder.hidden = true;
      this.elements.scoreSvg.hidden = false;
      this.updateExerciseUi();
      this.renderScore();
      this.renderCompletion();
      this.updateStatsUi();
      this.updateToolbar();
      this.lastScoreWidth = this.elements.scoreContainer.clientWidth || 0;
      if (this.mode === 'quiz') {
        this.startQuiz();
      } else {
        this.clearQuiz();
      }
    }

    showGenerationError(error) {
      this.elements.scoreSvg.hidden = true;
      this.elements.scorePlaceholder.hidden = true;
      this.elements.scoreError.hidden = false;
      this.elements.scoreErrorText.textContent = 'Impossibile generare l’esercizio con queste impostazioni. ' + (error && error.message ? error.message : 'Controlla le scelte e riprova.');
      this.updateToolbar();
    }

    renderScore() {
      if (!this.exercise) return;
      try {
        this.renderer.render(this.exercise, { showNames: this.showNames });
      } catch (error) {
        this.showGenerationError(error);
      }
    }

    updateExerciseUi() {
      const exercise = this.exercise;
      if (!exercise) return;
      this.elements.exerciseEyebrow.textContent = exercise.level ? 'Esercizio · livello ' + exercise.level : 'Esercizio';
      this.elements.exerciseTitle.textContent = exercise.levelName;
      this.elements.exerciseSub.textContent = exercise.measureCount + ' misure · ' + exercise.key.nameIt + ' · ' + exercise.meter + ' · ♩ = ' + exercise.tempo;
      clearNode(this.elements.metaBadges);
      const badges = [
        exercise.key.nameIt,
        exercise.meter,
        '♩ = ' + exercise.tempo,
        exercise.measureCount + ' misure',
        exercise.noteCount + ' note',
        'seme ' + exercise.seed
      ];
      badges.forEach((text, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge' + (index === 0 ? ' badge-accent' : '');
        badge.textContent = text;
        this.elements.metaBadges.appendChild(badge);
      });
      this.elements.sessionMeasures.textContent = String(exercise.measureCount);
      this.elements.sessionNotes.textContent = String(exercise.noteCount);
      this.elements.sessionTempo.textContent = exercise.tempo + ' BPM';
      this.elements.sessionDuration.textContent = formatDuration(exercise.totalTicks / T.PPQ * 60 / exercise.tempo);
      this.elements.levelName.textContent = (G.PRESETS[exercise.level] || G.PRESETS[1]).shortName;
      this.updateLevelUi();
    }

    updateToolbar() {
      const quiz = this.mode === 'quiz';
      const hasExercise = !!this.exercise;
      this.elements.playButton.disabled = !hasExercise || quiz;
      this.elements.restartButton.disabled = !hasExercise || quiz;
      this.elements.namesButton.disabled = !hasExercise || quiz;
      this.elements.analysisButton.disabled = !hasExercise || quiz;
      this.elements.completeButton.disabled = !hasExercise || this.completed;
      this.elements.namesButton.classList.toggle('is-on', this.showNames && !quiz);
      this.elements.namesButton.setAttribute('aria-pressed', String(this.showNames && !quiz));
      this.elements.analysisButton.classList.toggle('is-on', this.analysisOpen && !quiz);
      this.elements.answerClose.hidden = !this.analysisOpen;
      this.elements.keyboardLabels.disabled = quiz;
    }

    setMode(mode) {
      if (mode !== 'read' && mode !== 'quiz') return;
      if (mode === this.mode) return;
      this.stopPlayback();
      this.mode = mode;
      this.elements.modeButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      });
      if (mode === 'quiz') {
        this.showNamesBeforeQuiz = this.showNames;
        this.showNames = false;
        if (this.renderer) this.renderer.setShowNames(false);
        this.keyboard.setLabels(false);
        this.elements.keyboardLabels.checked = false;
        this.elements.modeHint.textContent = 'Quiz: suona la nota cerchiata. Le risposte non sono mostrate sullo spartito.';
        this.setAnalysis(false);
        this.startQuiz();
      } else {
        this.clearQuiz();
        this.keyboard.setLabels(this.keyboardLabels);
        this.elements.keyboardLabels.checked = this.keyboardLabels;
        this.elements.modeHint.textContent = 'Leggi lo spartito, ascoltalo e suona sul pianoforte.';
        this.showNames = this.showNamesBeforeQuiz;
        this.setShowNames(this.showNames);
      }
      this.updateToolbar();
    }

    startQuiz() {
      if (!this.exercise) return;
      const events = this.exercise.events.filter((event) => !event.rest && event.pitches.length === 1 && !event.tieFromPrev);
      this.quiz = {
        events,
        index: 0,
        firstRecorded: false,
        firstCorrect: false,
        firstCorrectCount: 0,
        finished: false,
        locked: false,
        status: null
      };
      this.elements.quizPanel.hidden = false;
      this.elements.quizTitle.textContent = 'Quiz delle note';
      this.elements.quizSkip.textContent = 'Salta';
      if (!events.length) {
        this.elements.quizPrompt.textContent = 'Nessuna nota singola disponibile in questo esercizio.';
        this.elements.quizFeedback.textContent = '';
        this.elements.quizProgress.textContent = '0 / 0';
        this.quiz.finished = true;
        return;
      }
      this.showQuizTarget();
    }

    showQuizTarget() {
      if (!this.quiz || this.quiz.finished || !this.exercise) return;
      const event = this.quiz.events[this.quiz.index];
      if (!event) return;
      this.quiz.firstRecorded = false;
      this.quiz.firstCorrect = false;
      this.quiz.locked = false;
      this.quiz.status = null;
      this.renderer.setQuizTarget(event.id, null);
      this.elements.quizPrompt.textContent = 'Suona la nota cerchiata sul pianoforte.';
      this.elements.quizFeedback.textContent = '';
      this.elements.quizFeedback.className = 'quiz-feedback';
      this.elements.quizProgress.textContent = (this.quiz.index + 1) + ' / ' + this.quiz.events.length;
      this.elements.quizSkip.textContent = 'Salta';
      this.elements.quizSkip.disabled = false;
    }

    answerQuiz(midi) {
      if (!this.quiz || this.quiz.finished || this.quiz.locked) return;
      const event = this.quiz.events[this.quiz.index];
      if (!event) return;
      const expected = event.pitches[0].midi;
      const correct = midi === expected;
      if (!this.quiz.firstRecorded) {
        this.quiz.firstRecorded = true;
        this.quiz.firstCorrect = correct;
        this.stats.quizAttempts += 1;
        this.sessionQuizAttempts += 1;
        if (correct) {
          this.stats.quizCorrect += 1;
          this.sessionQuizCorrect += 1;
          this.quiz.firstCorrectCount += 1;
        }
        this.storage.saveStats(this.stats);
        this.updateStatsUi();
      }
      if (correct) {
        this.quiz.locked = true;
        this.elements.quizSkip.disabled = true;
        this.quiz.status = 'correct';
        this.elements.quizFeedback.textContent = (this.quiz.firstCorrect ? 'Giusto: ' : 'Ora sì: ') + T.formatPitchIt(event.pitches[0], true) + '.';
        this.elements.quizFeedback.className = 'quiz-feedback ok';
        this.renderer.setQuizTarget(event.id, 'correct');
        this.keyboard.flash(midi, 'correct');
        window.setTimeout(() => this.advanceQuiz(), 720);
      } else {
        this.quiz.status = 'wrong';
        this.elements.quizFeedback.textContent = 'Riprova: hai suonato ' + this.keyboard.labelFor(midi) + '.';
        this.elements.quizFeedback.className = 'quiz-feedback no';
        this.renderer.setQuizTarget(event.id, 'wrong');
        this.keyboard.flash(midi, 'wrong');
      }
    }

    skipQuizNote() {
      if (!this.quiz) return;
      if (this.quiz.finished) {
        this.startQuiz();
        return;
      }
      if (this.quiz.locked) return;
      const event = this.quiz.events[this.quiz.index];
      if (!event) return;
      this.quiz.locked = true;
      this.elements.quizSkip.disabled = true;
      if (!this.quiz.firstRecorded) {
        this.quiz.firstRecorded = true;
        this.stats.quizAttempts += 1;
        this.sessionQuizAttempts += 1;
        this.storage.saveStats(this.stats);
        this.updateStatsUi();
      }
      this.quiz.status = 'wrong';
      this.elements.quizFeedback.textContent = 'Era ' + T.formatPitchIt(event.pitches[0], true) + '.';
      this.elements.quizFeedback.className = 'quiz-feedback no';
      this.renderer.setQuizTarget(event.id, 'wrong');
      window.setTimeout(() => this.advanceQuiz(), 760);
    }

    advanceQuiz() {
      if (!this.quiz || this.quiz.finished) return;
      if (this.quiz.index + 1 >= this.quiz.events.length) {
        this.finishQuiz();
        return;
      }
      this.quiz.index += 1;
      this.showQuizTarget();
    }

    finishQuiz() {
      if (!this.quiz) return;
      this.quiz.finished = true;
      this.renderer.clearQuizTarget();
      this.elements.quizPrompt.textContent = 'Quiz completato.';
      const total = this.quiz.events.length;
      this.elements.quizFeedback.textContent = this.quiz.firstCorrectCount + ' su ' + total + ' riconosciute al primo tentativo.';
      this.elements.quizFeedback.className = 'quiz-feedback ok';
      this.elements.quizProgress.textContent = total + ' / ' + total;
      this.elements.quizSkip.textContent = 'Ricomincia';
      this.elements.quizSkip.disabled = false;
    }

    clearQuiz() {
      this.quiz = null;
      this.elements.quizPanel.hidden = true;
      this.elements.quizProgress.textContent = '';
      this.elements.quizFeedback.textContent = '';
      this.elements.quizSkip.disabled = false;
      if (this.renderer) this.renderer.clearQuizTarget();
    }

    handleNoteOn(midi) {
      this.audio.playNote(midi, 0.9);
      if (this.quiz && !this.quiz.finished) this.answerQuiz(midi);
    }

    handleNoteOff(midi) {
      void midi;
    }

    runMidiNoteOn(midi) {
      this.keyboard.setActive(midi, true);
      const timer = window.setTimeout(() => this.keyboard.setActive(midi, false), 260);
      this.midiNoteOff.set(midi, timer);
      this.handleNoteOn(midi);
    }

    connectMidi() {
      if (!navigator.requestMIDIAccess) {
        this.elements.midiButton.disabled = true;
        this.elements.keyboardStatus.textContent = 'MIDI non supportato';
        this.showToast('Questo browser non espone l’accesso MIDI.', true);
        return;
      }
      if (this.midiAccess) {
        this.elements.keyboardStatus.textContent = 'MIDI attivo';
        this.showToast('La tastiera MIDI è già collegata.');
        return;
      }
      navigator.requestMIDIAccess().then((access) => {
        this.midiAccess = access;
        const attach = () => {
          let count = 0;
          access.inputs.forEach((input) => {
            count += 1;
            input.onmidimessage = (message) => this.handleMidiMessage(message);
          });
          this.elements.keyboardStatus.textContent = count ? 'MIDI attivo' : 'MIDI in attesa';
          this.elements.midiButton.textContent = count ? 'MIDI collegato' : 'MIDI in attesa';
          this.elements.midiButton.classList.add('is-on');
          if (!count) this.showToast('MIDI autorizzato: collega una tastiera per iniziare.');
        };
        attach();
        access.onstatechange = attach;
      }).catch(() => {
        this.elements.keyboardStatus.textContent = 'MIDI negato';
        this.showToast('Accesso MIDI non autorizzato. Puoi usare il pianoforte sullo schermo.', true);
      });
    }

    handleMidiMessage(message) {
      const data = message.data;
      if (!data || data.length < 3) return;
      const command = data[0] & 0xf0;
      const note = data[1];
      const velocity = data[2];
      if (command === 0x90 && velocity > 0) this.runMidiNoteOn(note);
      if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        this.keyboard.setActive(note, false);
        const timer = this.midiNoteOff.get(note);
        if (timer) {
          window.clearTimeout(timer);
          this.midiNoteOff.delete(note);
        }
      }
    }

    togglePlayback() {
      if (this.mode === 'quiz' || !this.exercise) return;
      if (this.audio.playing) {
        this.stopPlayback();
        return;
      }
      this.playingIds.clear();
      this.playingMidis.clear();
      this.renderer.clearPlaying();
      this.keyboard.setPlaying([]);
      this.playback = this.audio.schedule(this.exercise, {
        onStart: () => this.updatePlaybackButton(),
        onEvent: (id, active) => this.highlightEvent(id, active),
        onEnd: () => {
          this.playingIds.clear();
          this.playingMidis.clear();
          this.renderer.clearPlaying();
          this.keyboard.setPlaying([]);
          this.playback = null;
          this.updatePlaybackButton();
        }
      });
      this.updatePlaybackButton();
      if (!this.audio.available) this.showToast('Audio non disponibile: ascolto solo visivo.');
    }

    restartPlayback() {
      if (this.mode === 'quiz' || !this.exercise) return;
      this.stopPlayback();
      this.togglePlayback();
    }

    stopPlayback() {
      this.audio.stop();
      this.playback = null;
      this.playingIds.clear();
      this.playingMidis.clear();
      if (this.renderer) this.renderer.clearPlaying();
      if (this.keyboard) this.keyboard.setPlaying([]);
      this.updatePlaybackButton();
    }

    highlightEvent(id, active) {
      const event = this.exercise ? this.exercise.events.find((item) => item.id === id) : null;
      if (!event || event.rest) return;
      if (active) this.playingIds.add(id);
      else this.playingIds.delete(id);
      event.pitches.forEach((pitch) => {
        const current = this.playingMidis.get(pitch.midi) || 0;
        if (active) this.playingMidis.set(pitch.midi, current + 1);
        else if (current <= 1) this.playingMidis.delete(pitch.midi);
        else this.playingMidis.set(pitch.midi, current - 1);
      });
      this.renderer.setPlaying(this.playingIds);
      this.keyboard.setPlaying(Array.from(this.playingMidis.keys()));
    }

    updatePlaybackButton() {
      const playing = this.audio.playing;
      this.elements.playLabel.textContent = playing ? 'Ferma' : 'Ascolta';
      this.elements.playButton.setAttribute('aria-pressed', String(playing));
    }

    setShowNames(show) {
      if (this.mode === 'quiz') return;
      const next = !!show;
      if (this.showNames === next && this.renderer && this.renderer.showNames === next) {
        this.updateToolbar();
        return;
      }
      this.showNames = next;
      if (this.renderer && this.exercise) this.renderer.setShowNames(this.showNames);
      this.updateToolbar();
    }

    toggleAnalysis() {
      if (this.mode === 'quiz') return;
      this.setAnalysis(!this.analysisOpen);
    }

    setAnalysis(open) {
      this.analysisOpen = !!open;
      this.elements.answerPanel.hidden = !this.analysisOpen;
      this.elements.analysisButton.setAttribute('aria-expanded', String(this.analysisOpen));
      this.elements.analysisButton.classList.toggle('is-on', this.analysisOpen && this.mode !== 'quiz');
      if (this.analysisOpen) this.renderAnalysis();
      this.updateToolbar();
    }

    renderAnalysis() {
      clearNode(this.elements.answerContent);
      if (!this.exercise) return;
      const structure = document.createElement('div');
      structure.className = 'answer-block';
      const structureTitle = document.createElement('h4');
      structureTitle.textContent = 'Struttura';
      structure.appendChild(structureTitle);
      const styleLabels = { classical: 'Classica', hymn: 'Inno', folk: 'Folk', baroque: 'Barocca', romantic: 'Romantica' };
      const cadenceLabels = { tonal: 'Tonale', open: 'Sospesa', none: 'Nessuna' };
      const profileLine = document.createElement('div');
      profileLine.className = 'answer-line';
      profileLine.textContent = 'Profilo: ' + (styleLabels[this.exercise.style] || this.exercise.style || '—')
        + ' · Cadenza: ' + (cadenceLabels[this.exercise.cadence] || this.exercise.cadence || '—')
        + ' · Frasi: ' + (this.exercise.phrases ? this.exercise.phrases.length : 0);
      structure.appendChild(profileLine);
      const progressionByMeasure = [];
      (this.exercise.progression || []).forEach((unit) => {
        if (!progressionByMeasure[unit.measure]) progressionByMeasure[unit.measure] = [];
        progressionByMeasure[unit.measure].push(unit.romanSeven || unit.roman);
      });
      const harmonyLine = document.createElement('div');
      harmonyLine.className = 'answer-line';
      harmonyLine.textContent = 'Armonia: ' + progressionByMeasure
        .map((romans, index) => romans ? 'M' + (index + 1) + ' ' + romans.join('/') : '')
        .filter(Boolean)
        .join(' · ');
      structure.appendChild(harmonyLine);
      this.elements.answerContent.appendChild(structure);
      this.exercise.measures.forEach((measure) => {
        const block = document.createElement('div');
        block.className = 'answer-block';
        const title = document.createElement('h4');
        title.textContent = 'Misura ' + (measure.index + 1) + (measure.chord && measure.chord.roman ? ' · ' + measure.chord.roman : '');
        block.appendChild(title);
        this.exercise.parts.forEach((part) => {
          for (let voice = 0; voice < part.voiceCount; voice++) {
            const events = measure.events.filter((event) => event.part === part.role && event.voice === voice);
            if (!events.length) continue;
            const line = document.createElement('div');
            line.className = 'answer-line';
            const label = document.createElement('strong');
            label.textContent = part.label + (part.voiceCount > 1 ? ' · voce ' + (voice + 1) : '') + ': ';
            line.appendChild(label);
            events.forEach((event, index) => {
              if (index > 0) line.appendChild(document.createTextNode(' · '));
              const token = document.createElement('span');
              token.className = 'answer-token';
              const name = document.createElement('strong');
              name.textContent = event.rest
                ? 'Pausa'
                : event.pitches.map((pitch) => T.formatPitchIt(pitch, true)).join('/');
              const duration = document.createElement('em');
              duration.textContent = ' ' + T.tokenNameShortIt(event);
              token.appendChild(name);
              token.appendChild(duration);
              if (event.tieToNext) {
                const tie = document.createElement('span');
                tie.className = 'answer-tie';
                tie.textContent = ' →';
                token.appendChild(tie);
              }
              line.appendChild(token);
            });
            block.appendChild(line);
          }
        });
        this.elements.answerContent.appendChild(block);
      });
    }

    completeExercise() {
      if (!this.exercise || this.completed) return;
      this.completed = true;
      this.completedAt = new Date();
      this.stats.completed += 1;
      this.stats.streak += 1;
      if (this.stats.streak > this.stats.bestStreak) this.stats.bestStreak = this.stats.streak;
      const recent = {
        date: this.completedAt.toISOString(),
        level: this.exercise.level,
        summary: this.exercise.summary,
        completed: true,
        quizAttempts: this.sessionQuizAttempts,
        quizCorrect: this.sessionQuizCorrect
      };
      this.stats.recent.unshift(recent);
      this.stats.recent = this.stats.recent.slice(0, 8);
      this.stats.lastActive = this.completedAt.toISOString();
      this.storage.saveStats(this.stats);
      this.renderCompletion();
      this.updateStatsUi();
      this.updateToolbar();
      this.showToast('Esercizio completato.');
    }

    renderCompletion() {
      this.elements.completionNote.hidden = !this.completed;
      if (this.completed && this.completedAt) {
        this.elements.completionText.textContent = 'Completato alle ' + this.completedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '.';
      }
      const label = this.elements.completeButton.querySelector('.btn-label');
      if (label) label.textContent = this.completed ? 'Completato' : 'Segna completato';
    }

    updateStatsUi() {
      const accuracy = this.stats.quizAttempts
        ? Math.round((this.stats.quizCorrect / this.stats.quizAttempts) * 100) + '%'
        : '—';
      this.elements.headerStreak.textContent = String(this.stats.streak);
      this.elements.headerTotal.textContent = String(this.stats.totalExercises);
      this.elements.headerAccuracy.textContent = accuracy;
      this.elements.statTotal.textContent = String(this.stats.totalExercises);
      this.elements.statCompleted.textContent = String(this.stats.completed);
      this.elements.statAccuracy.textContent = accuracy;
      this.elements.statStreak.textContent = String(this.stats.streak);
      this.elements.storageNote.textContent = this.storage.available ? 'Dati locali' : 'Sessione temporanea';
      clearNode(this.elements.recentList);
      if (!this.stats.recent.length) {
        this.elements.recentEmpty.hidden = false;
        return;
      }
      this.elements.recentEmpty.hidden = true;
      this.stats.recent.forEach((item) => {
        const row = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = item.summary || 'Esercizio completato';
        const time = document.createElement('time');
        time.textContent = formatWhen(item.date);
        row.appendChild(text);
        row.appendChild(time);
        this.elements.recentList.appendChild(row);
      });
    }

    resetStatistics() {
      this.storage.clearStats();
      this.stats = window.StorageManager.emptyStats();
      this.completed = false;
      this.completedAt = null;
      this.sessionQuizAttempts = 0;
      this.sessionQuizCorrect = 0;
      this.renderCompletion();
      this.updateStatsUi();
      this.updateToolbar();
      this.closeDialog(this.elements.confirmDialog);
      this.showToast('Statistiche azzerate.');
    }

    queueResizeRender() {
      const width = this.elements.scoreContainer.clientWidth || 0;
      if (Math.abs(width - this.lastScoreWidth) < 3) return;
      this.lastScoreWidth = width;
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        if (!this.exercise || this.playback || this.mode === 'quiz') return;
        this.renderer.render(this.exercise, { showNames: this.showNames });
      }, 140);
    }

    openSettings() {
      this.fillSettingsForm(this.settings);
      this.elements.settingsError.textContent = '';
      this.openDialog(this.elements.settingsDialog);
    }

    fillSettingsForm(config) {
      this.elements.settingsSeed.value = config.seed === null || config.seed === undefined ? '' : String(config.seed);
      const staff = document.querySelector('input[name="settings-staff"][value="' + config.staff + '"]');
      if (staff) staff.checked = true;
      this.elements.settingsRhLow.value = config.rhLow;
      this.elements.settingsRhHigh.value = config.rhHigh;
      this.elements.settingsLhLow.value = config.lhLow;
      this.elements.settingsLhHigh.value = config.lhHigh;
      this.elements.settingsMaxLedger.value = String(config.maxLedger);
      this.elements.settingsMaxLedgerValue.textContent = String(config.maxLedger);
      Array.from(this.elements.settingsMeters.querySelectorAll('input[data-meter]')).forEach((input) => {
        input.checked = config.meters.includes(input.dataset.meter);
      });
      Array.from(this.elements.settingsDurations.querySelectorAll('input[data-duration]')).forEach((input) => {
        input.checked = config.durations.includes(input.dataset.duration);
      });
      this.elements.settingsDots.checked = !!config.allowDots;
      this.elements.settingsTies.checked = !!config.allowTies;
      this.elements.settingsSyncopation.checked = !!config.allowSyncopation;
      this.elements.settingsTuplets.checked = !!config.allowTuplets;
      this.elements.settingsRest.value = String(Math.round((config.restAmount || 0) * 100));
      this.elements.settingsRestValue.textContent = Math.round((config.restAmount || 0) * 100) + '%';
      this.elements.settingsTempoMin.value = String(config.tempoMin);
      this.elements.settingsTempoMax.value = String(config.tempoMax);
      this.elements.settingsAccidentals.value = String(config.maxAccidentals);
      this.elements.settingsAccidentalsValue.textContent = String(config.maxAccidentals);
      this.elements.settingsMinor.checked = !!config.allowMinor;
      this.elements.settingsChromatic.checked = !!config.allowChromatic;
      const keyMode = document.querySelector('input[name="settings-key-mode"][value="' + config.keyMode + '"]');
      if (keyMode) keyMode.checked = true;
      this.elements.settingsFixedKey.value = config.fixedKey || 'C';
      this.elements.settingsFixedKey.disabled = config.keyMode !== 'fixed';
      const chordHand = this.elements.settingsChordHand;
      chordHand.value = config.chordHand || 'right';
      const setRadio = (name, value) => {
        const input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (input) input.checked = true;
      };
      setRadio('settings-voices', String(config.voices || 1));
      setRadio('settings-measures', String(config.measures || 4));
      setRadio('settings-chords', config.chords || 'none');
      setRadio('settings-leap', config.leap || 'medium');
      this.elements.settingsStyle.value = config.style || 'classical';
      this.elements.settingsMinorFlavor.value = config.minorFlavor || 'natural';
      setRadio('settings-complexity', config.harmonicComplexity || 'triads');
      setRadio('settings-cadence', config.cadence || 'tonal');
      setRadio('settings-phrase-length', Number(config.phraseLength) === 4 ? '4' : '2');
      const repetition = Math.round((config.phraseRepetition || 0) * 100);
      this.elements.settingsPhraseRepetition.value = String(repetition);
      this.elements.settingsPhraseRepetitionValue.textContent = repetition + '%';
    }

    saveSettingsFromForm() {
      this.elements.settingsError.textContent = '';
      const meters = Array.from(this.elements.settingsMeters.querySelectorAll('input[data-meter]:checked')).map((input) => input.dataset.meter);
      const durations = Array.from(this.elements.settingsDurations.querySelectorAll('input[data-duration]:checked')).map((input) => input.dataset.duration);
      if (!meters.length) {
        this.elements.settingsError.textContent = 'Scegli almeno un metro.';
        return;
      }
      if (!durations.length) {
        this.elements.settingsError.textContent = 'Scegli almeno un valore ritmico.';
        return;
      }
      const seedText = this.elements.settingsSeed.value.trim();
      const seed = seedText ? G.parseSeed(seedText) : null;
      if (seedText && seed === null) {
        this.elements.settingsError.textContent = 'Il seme deve essere un numero intero tra 0 e 4294967295.';
        return;
      }
      const keyMode = document.querySelector('input[name="settings-key-mode"]:checked');
      const staff = document.querySelector('input[name="settings-staff"]:checked');
      const voices = document.querySelector('input[name="settings-voices"]:checked');
      const measures = document.querySelector('input[name="settings-measures"]:checked');
      const chords = document.querySelector('input[name="settings-chords"]:checked');
      const leap = document.querySelector('input[name="settings-leap"]:checked');
      const complexity = document.querySelector('input[name="settings-complexity"]:checked');
      const cadence = document.querySelector('input[name="settings-cadence"]:checked');
      const phraseLength = document.querySelector('input[name="settings-phrase-length"]:checked');
      const config = Object.assign({}, this.settings, {
        preset: this.settings.preset || Number(this.elements.levelSelect.value) || 1,
        seed,
        staff: staff ? staff.value : this.settings.staff,
        rhLow: this.elements.settingsRhLow.value,
        rhHigh: this.elements.settingsRhHigh.value,
        lhLow: this.elements.settingsLhLow.value,
        lhHigh: this.elements.settingsLhHigh.value,
        maxLedger: Number(this.elements.settingsMaxLedger.value),
        meters,
        durations,
        allowDots: this.elements.settingsDots.checked,
        allowTies: this.elements.settingsTies.checked,
        allowSyncopation: this.elements.settingsSyncopation.checked,
        allowTuplets: this.elements.settingsTuplets.checked,
        restAmount: Number(this.elements.settingsRest.value) / 100,
        tempoMin: Number(this.elements.settingsTempoMin.value),
        tempoMax: Number(this.elements.settingsTempoMax.value),
        maxAccidentals: Number(this.elements.settingsAccidentals.value),
        allowMinor: this.elements.settingsMinor.checked,
        allowChromatic: this.elements.settingsChromatic.checked,
        keyMode: keyMode ? keyMode.value : this.settings.keyMode,
        fixedKey: this.elements.settingsFixedKey.value,
        chordHand: this.elements.settingsChordHand.value,
        chords: chords ? chords.value : this.settings.chords,
        leap: leap ? leap.value : this.settings.leap,
        voices: voices ? Number(voices.value) : this.settings.voices,
        measures: measures ? Number(measures.value) : this.settings.measures,
        style: this.elements.settingsStyle.value,
        minorFlavor: this.elements.settingsMinorFlavor.value,
        harmonicComplexity: complexity ? complexity.value : this.settings.harmonicComplexity,
        cadence: cadence ? cadence.value : this.settings.cadence,
        phraseLength: phraseLength ? Number(phraseLength.value) : this.settings.phraseLength,
        phraseRepetition: Number(this.elements.settingsPhraseRepetition.value) / 100
      });
      const validation = G.validateConfig(config);
      if (!validation.valid) {
        this.elements.settingsError.textContent = validation.errors[0];
        return;
      }
      this.settings = validation.config;
      this.storage.saveSettings(this.settings);
      this.updateLevelUi();
      this.closeDialog(this.elements.settingsDialog);
      this.newExercise();
      this.showToast('Impostazioni applicate.');
    }

    openDialog(dialog) {
      if (!dialog) return;
      if (dialog.showModal) {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    closeDialog(dialog) {
      if (!dialog) return;
      if (dialog.close) {
        if (dialog.open) dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    openTests() {
      this.openDialog(this.elements.testDialog);
      this.runTests();
    }

    runTests() {
      if (typeof window.runSightReadingTests !== 'function') {
        this.elements.testSummary.textContent = 'Harness dei test non disponibile.';
        return;
      }
      const result = window.runSightReadingTests();
      clearNode(this.elements.testSummary);
      const pill = document.createElement('span');
      pill.className = 'test-pill ' + (result.failed ? 'fail' : 'pass');
      pill.textContent = result.failed ? result.failed + ' test falliti' : 'Tutti i test superati';
      const counts = document.createElement('span');
      counts.className = 'test-pill pass';
      counts.textContent = result.passed + ' / ' + result.total;
      this.elements.testSummary.appendChild(pill);
      this.elements.testSummary.appendChild(counts);
      clearNode(this.elements.testResults);
      result.suites.forEach((suite) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'test-suite';
        const title = document.createElement('h4');
        title.textContent = suite.name;
        wrapper.appendChild(title);
        const list = document.createElement('ul');
        list.className = 'test-list';
        suite.tests.forEach((test) => {
          const item = document.createElement('li');
          item.className = 'test-item ' + (test.pass ? 'pass' : 'fail');
          const mark = document.createElement('span');
          mark.className = 'mark';
          mark.textContent = test.pass ? '✓' : '✕';
          item.appendChild(mark);
          const body = document.createElement('span');
          body.textContent = test.name;
          if (!test.pass && test.detail) {
            const detail = document.createElement('span');
            detail.className = 'detail';
            detail.textContent = test.detail;
            body.appendChild(detail);
          }
          item.appendChild(body);
          list.appendChild(item);
        });
        wrapper.appendChild(list);
        this.elements.testResults.appendChild(wrapper);
      });
    }

    showToast(message, error) {
      const toast = this.elements.toast;
      toast.textContent = message;
      toast.classList.toggle('is-error', !!error);
      toast.classList.add('is-visible');
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 2600);
    }
  }

  function boot() {
    const app = new PrimaVista();
    window.PrimaVista = { app };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
