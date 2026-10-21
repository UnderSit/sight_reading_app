(function () {
  'use strict';

  function create(seed) {
    let state = (Number(seed) >>> 0) || 0x9e3779b9;
    const random = function () {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    random.int = function (min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    };
    random.pick = function (items) {
      return items[Math.floor(random() * items.length)];
    };
    random.chance = function (probability) {
      return random() < probability;
    };
    random.weighted = function (items, weightFn) {
      const weights = items.map((item, index) => Math.max(0, Number(weightFn(item, index)) || 0));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      if (total <= 0) return random.pick(items);
      let roll = random() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
      }
      return items[items.length - 1];
    };
    random.shuffle = function (items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    };
    random.state = function () { return state >>> 0; };
    return random;
  }

  window.RNG = { create };
})();
