(function () {
  'use strict';

  const T = window.MusicTheory;

  class PianoKeyboard {
    constructor(container, options) {
      this.container = container;
      this.options = options || {};
      this.lowMidi = Number(this.options.lowMidi) || 36;
      this.highMidi = Number(this.options.highMidi) || 96;
      this.labels = this.options.labels !== false;
      this.keys = new Map();
      this.whiteKeys = [];
      this.pressed = new Set();
      this.flashTimers = new Map();
      this.build();
      this.setLabels(this.labels);
    }

    labelFor(midi) {
      const pitch = T.pitchFromMidi(midi, false);
      return T.formatPitchIt(pitch, true);
    }

    keyElement(midi) {
      return this.keys.get(midi) || null;
    }

    build() {
      this.container.innerHTML = '';
      const whiteWrap = document.createElement('div');
      whiteWrap.className = 'white-keys';
      const whites = [];
      for (let midi = this.lowMidi; midi <= this.highMidi; midi++) {
        const pc = ((midi % 12) + 12) % 12;
        if ([0, 2, 4, 5, 7, 9, 11].includes(pc)) whites.push(midi);
      }
      this.whiteKeys = whites;
      whites.forEach((midi) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'white-key';
        key.dataset.midi = String(midi);
        key.setAttribute('aria-label', this.labelFor(midi));
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = this.labelFor(midi);
        key.appendChild(label);
        this.bindKey(key, midi);
        whiteWrap.appendChild(key);
        this.keys.set(midi, key);
      });
      this.container.appendChild(whiteWrap);
      const count = whites.length;
      whites.forEach((midi, index) => {
        const pc = ((midi % 12) + 12) % 12;
        if (![0, 2, 5, 7, 9].includes(pc)) return;
        const blackMidi = midi + 1;
        if (blackMidi > this.highMidi) return;
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'black-key';
        key.dataset.midi = String(blackMidi);
        key.setAttribute('aria-label', this.labelFor(blackMidi));
        key.style.left = (((index + 1) / count) * 100) + '%';
        key.style.width = ((0.62 / count) * 100) + '%';
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = this.labelFor(blackMidi);
        key.appendChild(label);
        this.bindKey(key, blackMidi);
        this.container.appendChild(key);
        this.keys.set(blackMidi, key);
      });
      this.container.style.width = Math.max(660, count * 24) + 'px';
    }

    bindKey(key, midi) {
      key.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (key.setPointerCapture) {
          try {
            key.setPointerCapture(event.pointerId);
          } catch (error) {
            void error;
          }
        }
        this.pressed.add(midi);
        key.classList.add('is-active');
        if (this.options.onNoteOn) this.options.onNoteOn(midi);
      });
      const release = () => {
        if (!this.pressed.has(midi)) return;
        this.pressed.delete(midi);
        key.classList.remove('is-active');
        if (this.options.onNoteOff) this.options.onNoteOff(midi);
      };
      key.addEventListener('pointerup', release);
      key.addEventListener('pointercancel', release);
      key.addEventListener('lostpointercapture', release);
    }

    setLabels(show) {
      this.labels = !!show;
      this.container.classList.toggle('labels-hidden', !this.labels);
    }

    setActive(midi, active) {
      const key = this.keyElement(midi);
      if (key) key.classList.toggle('is-active', !!active);
    }

    setPlaying(midis) {
      const active = new Set(midis || []);
      this.keys.forEach((key, midi) => {
        key.classList.toggle('is-playing', active.has(midi));
      });
    }

    flash(midi, status) {
      const key = this.keyElement(midi);
      if (!key) return;
      const previous = this.flashTimers.get(midi);
      if (previous) window.clearTimeout(previous);
      key.classList.remove('is-correct', 'is-wrong');
      if (status === 'correct') key.classList.add('is-correct');
      else if (status === 'wrong') key.classList.add('is-wrong');
      else return;
      const timer = window.setTimeout(() => {
        key.classList.remove('is-correct', 'is-wrong');
        this.flashTimers.delete(midi);
      }, 520);
      this.flashTimers.set(midi, timer);
    }

    clearStates() {
      this.pressed.clear();
      this.keys.forEach((key) => {
        key.classList.remove('is-active', 'is-playing', 'is-correct', 'is-wrong');
      });
      this.flashTimers.forEach((timer) => window.clearTimeout(timer));
      this.flashTimers.clear();
    }

    rangeLabel() {
      return this.labelFor(this.lowMidi) + ' – ' + this.labelFor(this.highMidi);
    }
  }

  window.PianoKeyboard = PianoKeyboard;
})();
