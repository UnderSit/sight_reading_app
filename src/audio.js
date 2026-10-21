(function () {
  'use strict';

  const T = window.MusicTheory;

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function buildTimeline(exercise) {
    const secondsPerTick = 60 / Math.max(30, exercise.tempo) / T.PPQ;
    const voices = new Map();
    exercise.events.forEach((event) => {
      const key = event.part + ':' + event.voice;
      if (!voices.has(key)) voices.set(key, []);
      voices.get(key).push(event);
    });
    const notes = [];
    voices.forEach((events) => {
      events.sort((a, b) => a.startTick - b.startTick || a.id.localeCompare(b.id));
      let previous = null;
      events.forEach((event) => {
        if (event.rest) {
          previous = null;
          return;
        }
        event.pitches.forEach((pitch, index) => {
          const canExtend = previous
            && index < previous.pitches.length
            && event.tieFromPrev
            && previous.pitches[index].midi === pitch.midi
            && previous.endTick === event.startTick;
          if (canExtend) {
            const note = previous.notes[index];
            note.durationTicks += event.duration;
            note.endTick = event.startTick + event.duration;
            note.eventIds.push(event.id);
          } else {
            if (!previous || index === 0) previous = { notes: [], pitches: [] };
            const note = {
              midi: pitch.midi,
              startTick: event.startTick,
              durationTicks: event.duration,
              endTick: event.startTick + event.duration,
              part: event.part,
              voice: event.voice,
              eventIds: [event.id],
              index
            };
            notes.push(note);
            previous.notes[index] = note;
            previous.pitches[index] = pitch;
          }
        });
        if (!previous) previous = { notes: [], pitches: [] };
        previous.endTick = event.startTick + event.duration;
        previous.pitches = event.pitches;
      });
    });
    notes.sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);
    const events = notes.map((note) => ({
      midi: note.midi,
      startTick: note.startTick,
      durationTicks: note.durationTicks,
      endTick: note.endTick,
      startSeconds: note.startTick * secondsPerTick,
      durationSeconds: note.durationTicks * secondsPerTick,
      part: note.part,
      voice: note.voice,
      eventIds: note.eventIds.slice()
    }));
    return {
      notes: events,
      secondsPerTick,
      totalTicks: exercise.totalTicks,
      durationSeconds: exercise.totalTicks * secondsPerTick
    };
  }

  class AudioEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.available = true;
      this.playing = false;
      this.timers = [];
      this.activeNodes = [];
      this.token = 0;
      this.volume = 0.72;
      this.lastError = null;
    }

    ensure() {
      if (this.context) {
        if (this.context.state === 'suspended') {
          this.context.resume().catch(() => {});
        }
        return true;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        this.available = false;
        return false;
      }
      try {
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 24;
        this.compressor.ratio.value = 6;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
        this.available = true;
        return true;
      } catch (error) {
        this.context = null;
        this.available = false;
        this.lastError = error;
        return false;
      }
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
      }
    }

    voice(midi, when, duration, velocity) {
      const context = this.context;
      const frequency = midiToFrequency(midi);
      const output = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(12000, 2600 + frequency * 4.5), when);
      filter.Q.value = 0.7;
      output.gain.setValueAtTime(0.0001, when);
      output.gain.linearRampToValueAtTime(Math.max(0.0002, velocity), when + 0.008);
      output.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity * 0.42), when + Math.max(0.05, duration * 0.35));
      output.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.28);
      output.connect(filter);
      filter.connect(this.master);
      const partials = [
        { ratio: 1, gain: 1, type: 'triangle', detune: 0 },
        { ratio: 2, gain: 0.34, type: 'sine', detune: 2 },
        { ratio: 3, gain: 0.13, type: 'sine', detune: -3 },
        { ratio: 4, gain: 0.05, type: 'sine', detune: 1 }
      ];
      partials.forEach((partial) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = partial.type;
        oscillator.frequency.setValueAtTime(frequency * partial.ratio, when);
        oscillator.detune.setValueAtTime(partial.detune, when);
        gain.gain.setValueAtTime(partial.gain * 0.5, when);
        oscillator.connect(gain);
        gain.connect(output);
        oscillator.start(when);
        oscillator.stop(when + duration + 0.34);
        this.activeNodes.push(oscillator);
      });
      this.activeNodes.push(output);
      if (this.activeNodes.length > 240) {
        this.activeNodes = this.activeNodes.slice(-120);
      }
    }

    playNote(midi, duration, velocity) {
      if (!this.ensure()) return false;
      const context = this.context;
      const when = context.currentTime + 0.012;
      this.voice(midi, when, Math.max(0.12, duration || 0.85), Math.max(0.05, Math.min(1, velocity || 0.7)));
      return true;
    }

    stopVoices() {
      const context = this.context;
      const now = context ? context.currentTime : 0;
      this.activeNodes.forEach((node) => {
        try {
          if (typeof node.stop === 'function') {
            node.stop(now + 0.08);
          } else if (node.gain) {
            node.gain.cancelScheduledValues(now);
            node.gain.setTargetAtTime(0.0001, now, 0.035);
          }
        } catch (error) {
          void error;
        }
      });
      this.activeNodes = [];
    }

    stop() {
      this.token += 1;
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers = [];
      this.stopVoices();
      this.playing = false;
    }

    schedule(exercise, handlers) {
      this.stop();
      const token = this.token;
      const timeline = buildTimeline(exercise);
      const callbacks = handlers || {};
      if (this.ensure()) {
        const when = this.context.currentTime + 0.08;
        timeline.notes.forEach((note) => {
          this.voice(note.midi, when + note.startSeconds, note.durationSeconds, 0.62);
        });
      }
      const startedAt = window.performance && window.performance.now ? window.performance.now() : Date.now();
      exercise.events.forEach((event) => {
        if (event.rest) return;
        const offset = event.startTick * timeline.secondsPerTick * 1000;
        const duration = event.duration * timeline.secondsPerTick * 1000;
        const onTimer = window.setTimeout(() => {
          if (token !== this.token) return;
          if (callbacks.onEvent) callbacks.onEvent(event.id, true);
        }, offset);
        const offTimer = window.setTimeout(() => {
          if (token !== this.token) return;
          if (callbacks.onEvent) callbacks.onEvent(event.id, false);
        }, offset + Math.max(90, duration));
        this.timers.push(onTimer, offTimer);
      });
      this.playing = true;
      if (callbacks.onStart) callbacks.onStart(timeline, startedAt);
      const endTimer = window.setTimeout(() => {
        if (token !== this.token) return;
        this.playing = false;
        if (callbacks.onEnd) callbacks.onEnd();
      }, (timeline.durationSeconds + 0.36) * 1000);
      this.timers.push(endTimer);
      return { token, timeline };
    }
  }

  AudioEngine.buildTimeline = buildTimeline;
  AudioEngine.midiToFrequency = midiToFrequency;
  window.AudioEngine = AudioEngine;
})();
