(function () {
  'use strict';

  const KEYS = {
    stats: 'primaVista.stats.v1',
    settings: 'primaVista.settings.v1',
    theme: 'primaVista.theme'
  };

  function emptyStats() {
    return {
      version: 1,
      totalExercises: 0,
      completed: 0,
      streak: 0,
      bestStreak: 0,
      quizAttempts: 0,
      quizCorrect: 0,
      recent: [],
      lastActive: null
    };
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function normalizeRecent(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 8).map((item) => {
      const source = item && typeof item === 'object' ? item : {};
      return {
        date: typeof source.date === 'string' ? source.date : '',
        level: finiteNumber(source.level),
        summary: typeof source.summary === 'string' ? source.summary.slice(0, 120) : '',
        completed: !!source.completed,
        quizAttempts: finiteNumber(source.quizAttempts),
        quizCorrect: finiteNumber(source.quizCorrect)
      };
    }).filter((item) => item.summary || item.date);
  }

  function normalizeStats(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const stats = emptyStats();
    stats.totalExercises = finiteNumber(source.totalExercises);
    stats.completed = finiteNumber(source.completed);
    stats.streak = finiteNumber(source.streak);
    stats.bestStreak = finiteNumber(source.bestStreak);
    stats.quizAttempts = finiteNumber(source.quizAttempts);
    stats.quizCorrect = Math.min(stats.quizAttempts, finiteNumber(source.quizCorrect));
    stats.recent = normalizeRecent(source.recent);
    stats.lastActive = typeof source.lastActive === 'string' ? source.lastActive : null;
    return stats;
  }

  class StorageManager {
    constructor(storage) {
      this.memory = new Map();
      this.storage = storage || null;
      if (!this.storage) {
        try {
          const probe = '__primaVistaProbe__';
          window.localStorage.setItem(probe, '1');
          window.localStorage.removeItem(probe);
          this.storage = window.localStorage;
        } catch (error) {
          this.storage = null;
        }
      }
      this.available = !!this.storage;
    }

    read(key) {
      try {
        if (this.storage) return this.storage.getItem(key);
        return this.memory.has(key) ? this.memory.get(key) : null;
      } catch (error) {
        return this.memory.has(key) ? this.memory.get(key) : null;
      }
    }

    write(key, value) {
      try {
        if (this.storage) {
          this.storage.setItem(key, value);
          return true;
        }
        this.memory.set(key, value);
        return true;
      } catch (error) {
        this.memory.set(key, value);
        return false;
      }
    }

    remove(key) {
      try {
        if (this.storage) this.storage.removeItem(key);
      } catch (error) {
        this.memory.delete(key);
        return;
      }
      this.memory.delete(key);
    }

    readJson(key) {
      const text = this.read(key);
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        return null;
      }
    }

    writeJson(key, value) {
      try {
        return this.write(key, JSON.stringify(value));
      } catch (error) {
        return false;
      }
    }

    loadStats() {
      return normalizeStats(this.readJson(KEYS.stats));
    }

    saveStats(stats) {
      const normalized = normalizeStats(stats);
      this.writeJson(KEYS.stats, normalized);
      return normalized;
    }

    loadSettings() {
      const settings = this.readJson(KEYS.settings);
      return settings && typeof settings === 'object' ? settings : null;
    }

    saveSettings(settings) {
      return this.writeJson(KEYS.settings, settings);
    }

    loadTheme() {
      const theme = this.read(KEYS.theme);
      return theme === 'dark' || theme === 'light' ? theme : 'light';
    }

    saveTheme(theme) {
      return this.write(KEYS.theme, theme === 'dark' ? 'dark' : 'light');
    }

    clearStats() {
      this.remove(KEYS.stats);
    }

    clearAll() {
      Object.keys(KEYS).forEach((name) => this.remove(KEYS[name]));
    }
  }

  StorageManager.emptyStats = emptyStats;
  StorageManager.KEYS = KEYS;
  window.StorageManager = StorageManager;
})();
