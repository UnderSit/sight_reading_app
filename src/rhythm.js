(function () {
  'use strict';

  const T = window.MusicTheory;

  function tokenOptions(config, opts) {
    const durations = (opts && opts.durations) || config.durations || ['quarter'];
    const allowDots = opts && opts.allowDots !== undefined ? opts.allowDots : !!config.allowDots;
    const limit = opts && opts.maxTicks;
    const seen = new Set();
    const options = [];
    durations.forEach((base) => {
      if (!T.BASE_DURATIONS[base]) return;
      const maxDots = allowDots ? 1 : 0;
      for (let dots = 0; dots <= maxDots; dots++) {
        const token = T.makeToken(base, dots);
        if (!token.ticks) continue;
        if (limit && token.ticks > limit) continue;
        const id = token.base + ':' + token.dots;
        if (seen.has(id)) continue;
        seen.add(id);
        options.push(token);
      }
    });
    if (!options.length) {
      options.push(T.makeToken('quarter', 0));
    }
    return options;
  }

  function reachableMap(measureTicks, options) {
    const reachable = new Uint8Array(measureTicks + 1);
    reachable[0] = 1;
    for (let tick = 0; tick <= measureTicks; tick++) {
      if (!reachable[tick]) continue;
      options.forEach((option) => {
        const next = tick + option.ticks;
        if (next <= measureTicks) reachable[next] = 1;
      });
    }
    return reachable;
  }

  function canReach(amount, options, map) {
    return amount === 0 || (amount >= 0 && amount <= map.length - 1 && map[amount] === 1);
  }

  function isGroupBoundary(tick, meter) {
    const positions = T.beatPositions(meter.name);
    return positions.includes(tick);
  }

  function scoreFill(tokens, meter, rng) {
    let score = 0;
    const groups = T.beatPositions(meter.name);
    const tickCounts = new Set();
    tokens.forEach((token, index) => {
      tickCounts.add(token.ticks);
      if (groups.includes(token.start)) score += 2.5;
      if (token.start === 0) score += 1.5;
      if (token.start + token.ticks === meter.measureTicks) score += 1.2;
      if (token.ticks === meter.beatTicks) score += 2;
      if (token.ticks >= 960) score += 0.8;
      if (index > 0 && tokens[index - 1].ticks === token.ticks) score -= 0.35;
    });
    if (tokens.length === 1) score -= 6;
    else if (tokens.length === 2) score -= 1;
    if (tokens.length >= 3 && tokens.length <= 7) score += 2.5;
    if (tokens.length > 10) score -= 2.5;
    score += Math.min(3, tickCounts.size) * 1.1;
    score += rng() * 0.8;
    return score;
  }

  function areaCrossesGroup(token, meter) {
    const groups = T.beatPositions(meter.name);
    for (let i = 0; i < groups.length; i++) {
      const start = groups[i];
      const end = i + 1 < groups.length ? groups[i + 1] : meter.measureTicks;
      if (token.start < end && token.start + token.ticks > start && !(token.start >= start && token.start + token.ticks <= end)) {
        return true;
      }
    }
    return false;
  }

  function allowedBySyncopation(token, meter, allowSyncopation) {
    if (allowSyncopation) return true;
    if (token.ticks < 480) return true;
    return isGroupBoundary(token.start, meter);
  }

  function fillOnce(measureTicks, options, rng, meter, allowSyncopation) {
    const map = reachableMap(measureTicks, options);
    if (!map[measureTicks]) return null;
    let nodes = 0;
    const maxNodes = 4500;

    function search(position, tokens, depth) {
      nodes += 1;
      if (nodes > maxNodes) return null;
      if (position === measureTicks) return tokens.map((token) => Object.assign({}, token));
      if (depth >= 48) return null;
      const remaining = measureTicks - position;
      if (!canReach(remaining, options, map)) return null;
      const choices = rng.shuffle(options.filter((option) => option.ticks <= remaining));
      for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        const nextRemaining = remaining - choice.ticks;
        if (!canReach(nextRemaining, options, map)) continue;
        const token = Object.assign({}, choice, { start: position });
        if (!allowedBySyncopation(token, meter, allowSyncopation)) continue;
        tokens.push(token);
        const result = search(position + token.ticks, tokens, depth + 1);
        tokens.pop();
        if (result) return result;
      }
      return null;
    }

    return search(0, [], 0);
  }

  function fallbackFill(measureTicks, options, meter) {
    const sorted = options.slice().sort((a, b) => b.ticks - a.ticks);
    const map = reachableMap(measureTicks, options);
    if (!map[measureTicks]) return null;
    const tokens = [];
    let position = 0;
    while (position < measureTicks) {
      const remaining = measureTicks - position;
      let chosen = null;
      for (let i = 0; i < sorted.length; i++) {
        const option = sorted[i];
        if (option.ticks > remaining) continue;
        if (!canReach(remaining - option.ticks, options, map)) continue;
        chosen = option;
        break;
      }
      if (!chosen) return null;
      tokens.push(Object.assign({}, chosen, { start: position }));
      position += chosen.ticks;
    }
    return tokens;
  }

  function fillMeasure(config, meter, rng, opts) {
    const options = tokenOptions(config, opts);
    const allowSync = opts && opts.allowSyncopation !== undefined ? opts.allowSyncopation : !!config.allowSyncopation;
    let best = null;
    let bestScore = -Infinity;
    const attempts = opts && opts.attempts ? opts.attempts : 18;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const candidate = fillOnce(meter.measureTicks, options, rng, meter, allowSync);
      if (!candidate) continue;
      const score = scoreFill(candidate, meter, rng);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
      if (attempt > 5 && bestScore > 12) break;
    }
    if (!best) best = fallbackFill(meter.measureTicks, options, meter);
    if (!best) {
      const safe = tokenOptions({ durations: ['whole', 'half', 'quarter', 'eighth', 'sixteenth'] }, {});
      best = fallbackFill(meter.measureTicks, safe, meter);
    }
    return best || [];
  }

  function applyRests(tokens, config, rng, opts) {
    const chance = opts && opts.restAmount !== undefined ? opts.restAmount : (config.restAmount || 0);
    if (chance <= 0 || !tokens.length) return tokens;
    const keepFirst = !opts || opts.keepFirst !== false;
    const keepLast = !opts || opts.keepLast !== false;
    let rests = 0;
    const maxRests = opts && opts.maxRests !== undefined
      ? opts.maxRests
      : Math.max(1, Math.min(3, Math.floor(tokens.length / 4) + 1));
    for (let i = 0; i < tokens.length; i++) {
      if (rests >= maxRests) break;
      if (i === 0 && keepFirst) continue;
      if (i === tokens.length - 1 && keepLast) continue;
      if (i > 0 && tokens[i - 1].rest) continue;
      if (tokens[i].tuplet) continue;
      if (tokens[i].ticks < 120) continue;
      if (rng.chance(chance)) {
        tokens[i].rest = true;
        rests += 1;
      }
    }
    if (tokens.every((token) => token.rest)) {
      const index = tokens.length > 1 ? 1 : 0;
      tokens[index].rest = false;
    }
    return tokens;
  }

  function ticksToToken(ticks, options) {
    for (let i = 0; i < options.length; i++) {
      if (options[i].ticks === ticks) {
        return { base: options[i].base, dots: options[i].dots, ticks };
      }
    }
    return null;
  }

  function addTies(tokens, config, rng, meter, opts) {
    if (!((opts && opts.allowTies) || config.allowTies)) return tokens;
    if (tokens.length < 2) return tokens;
    const options = tokenOptions(config, opts);
    let added = 0;
    for (let i = 0; i < tokens.length - 1 && added < 1; i++) {
      const token = tokens[i];
      if (token.rest || token.tuplet) continue;
      if (token.ticks < 720) continue;
      if (token.ticks >= meter.measureTicks) continue;
      if (!rng.chance(0.22)) continue;
      const end = token.start + token.ticks;
      const boundaries = T.beatPositions(meter.name).filter((tick) => tick > token.start && tick < end);
      if (!boundaries.length) continue;
      const split = boundaries[Math.floor(boundaries.length / 2)];
      const first = ticksToToken(split - token.start, options);
      const second = ticksToToken(end - split, options);
      if (!first || !second) continue;
      token.base = first.base;
      token.dots = first.dots;
      token.ticks = first.ticks;
      token.tieToNext = true;
      const continuation = {
        base: second.base,
        dots: second.dots,
        ticks: second.ticks,
        start: split,
        tieFromPrev: true
      };
      tokens.splice(i + 1, 0, continuation);
      added += 1;
      i += 1;
    }
    return tokens;
  }

  function tripletBase(groupTicks, config, opts) {
    const durations = (opts && opts.durations) || config.durations || [];
    const map = { 240: 'sixteenth', 480: 'eighth', 960: 'quarter' };
    const base = map[groupTicks];
    return base && durations.includes(base) ? base : null;
  }

  function addTuplets(tokens, config, rng, meter, opts) {
    const allow = (opts && opts.allowTuplets) || config.allowTuplets;
    const force = opts && opts.forceTuplet;
    if (!allow && !force) return { tokens, inserted: false };
    const groups = T.beatPositions(meter.name);
    const candidates = [];
    groups.forEach((start, index) => {
      const end = index + 1 < groups.length ? groups[index + 1] : meter.measureTicks;
      const groupTicks = end - start;
      const base = tripletBase(groupTicks, config, opts);
      if (!base) return;
      const inside = tokens.filter((token) => token.start >= start && token.start < end);
      if (!inside.length) return;
      if (inside[0].start !== start) return;
      const last = inside[inside.length - 1];
      if (last.start + last.ticks !== end) return;
      const total = inside.reduce((sum, token) => sum + token.ticks, 0);
      if (total !== groupTicks) return;
      if (inside.some((token) => token.tieToNext || token.tieFromPrev)) return;
      candidates.push({ start, end, groupTicks, base, inside });
    });
    if (!candidates.length) return { tokens, inserted: false };
    if (!force && !rng.chance(0.5)) return { tokens, inserted: false };
    const picked = rng.pick(candidates);
    const firstIndex = tokens.indexOf(picked.inside[0]);
    const replacement = [];
    for (let i = 0; i < 3; i++) {
      const token = T.makeToken(picked.base, 0, { num: 3, den: 2 });
      token.start = picked.start + i * (picked.groupTicks / 3);
      token.tuplet = { num: 3, den: 2 };
      token.tupletGroup = picked.start;
      replacement.push(token);
    }
    tokens.splice(firstIndex, picked.inside.length, ...replacement);
    return { tokens, inserted: true };
  }

  function buildCell(config, meter, rng, opts) {
    const options = opts || {};
    let tokens = fillMeasure(config, meter, rng, options);
    tokens = applyRests(tokens, config, rng, options);
    const tieResult = addTies(tokens, config, rng, meter, options);
    tokens = Array.isArray(tieResult) ? tieResult : tokens;
    const tupletResult = addTuplets(tokens, config, rng, meter, options);
    tokens = tupletResult.tokens;
    if (options.forceTuplet && !tupletResult.inserted) {
      return { tokens, tupletInserted: false };
    }
    return { tokens, tupletInserted: tupletResult.inserted };
  }

  function validSingleToken(ticks, config) {
    if (ticks <= 0) return null;
    const options = tokenOptions(config, {});
    for (let i = 0; i < options.length; i++) {
      if (options[i].ticks === ticks) return { base: options[i].base, dots: options[i].dots };
    }
    return null;
  }

  function varyCell(cell, config, meter, rng, opts) {
    const options = opts || {};
    const tokens = cell.map((token) => Object.assign({}, token));
    const editable = [];
    tokens.forEach((token, index) => {
      if (token.tuplet) return;
      editable.push(index);
    });
    if (editable.length < 2) return tokens;
    let changes = 1 + (rng.chance(0.4) ? 1 : 0);
    let guard = 0;
    while (changes > 0 && guard < 24) {
      guard += 1;
      const index = rng.pick(editable);
      const token = tokens[index];
      if (!token) continue;
      const roll = rng();
      if (roll < 0.38) {
        const splitPoint = token.start + Math.floor(token.ticks / 2);
        const firstTicks = splitPoint - token.start;
        const secondTicks = token.start + token.ticks - splitPoint;
        const first = validSingleToken(firstTicks, config);
        const second = validSingleToken(secondTicks, config);
        if (first && second) {
          const restBoth = token.rest && options.allowRests !== false;
          const head = Object.assign({}, token, { base: first.base, dots: first.dots, ticks: firstTicks, rest: restBoth ? token.rest : false });
          const tail = {
            base: second.base,
            dots: second.dots,
            ticks: secondTicks,
            start: splitPoint,
            rest: restBoth ? (rng.chance(0.5) ? true : token.rest) : false
          };
          tokens.splice(index, 1, head, tail);
          changes -= 1;
          continue;
        }
      } else if (roll < 0.68 && tokens.length > 1) {
        const otherIndex = index > 0 ? index - 1 : index + 1;
        const other = tokens[otherIndex];
        if (other && !other.tuplet) {
          const firstTok = token.start <= other.start ? token : other;
          const secondTok = token.start <= other.start ? other : token;
          const contiguous = firstTok.start + firstTok.ticks === secondTok.start;
          const total = token.ticks + other.ticks;
          const merged = validSingleToken(total, config);
          if (merged && contiguous) {
            const combined = {
              base: merged.base,
              dots: merged.dots,
              ticks: total,
              start: firstTok.start,
              rest: token.rest && other.rest && options.allowRests !== false
            };
            const low = Math.min(index, otherIndex);
            tokens.splice(low, 2, combined);
            changes -= 1;
            continue;
          }
        }
      } else if (roll < 0.86) {
        if (options.allowRests === false) continue;
        token.rest = !token.rest;
        changes -= 1;
        continue;
      } else {
        const shorter = { whole: 'half', half: 'quarter', quarter: 'eighth', eighth: 'sixteenth', sixteenth: 'thirtysecond' };
        const base = shorter[token.base];
        if (base && !token.dots) {
          const firstTicks = T.BASE_DURATIONS[base].ticks;
          const secondTicks = token.ticks - firstTicks;
          const second = validSingleToken(secondTicks, config);
          if (firstTicks > 0 && second) {
            const head = Object.assign({}, token, { base, dots: 0, ticks: firstTicks });
            const tail = { base: second.base, dots: second.dots, ticks: secondTicks, start: token.start + firstTicks };
            tokens.splice(index, 1, head, tail);
            changes -= 1;
            continue;
          }
        }
      }
    }
    return tokens;
  }

  function forceCadenceEnding(cell, config, meter, rng) {
    const tokens = cell.map((token) => Object.assign({}, token));
    if (!tokens.length) return tokens;
    const target = Math.max(480, Math.min(960, meter.measureTicks));
    const last = tokens[tokens.length - 1];
    if (last.tuplet || last.ticks >= target) return tokens;
    if (last.rest) tokens[tokens.length - 1] = Object.assign({}, last, { rest: false });
    let start = tokens.length - 1;
    let total = tokens[start].ticks;
    while (start > 0 && total < target && !tokens[start - 1].tuplet) {
      start -= 1;
      total += tokens[start].ticks;
    }
    if (total < target) return tokens;
    const merged = validSingleToken(total, config);
    if (!merged) return tokens;
    if (!rng.chance(0.6)) return tokens;
    const replacement = {
      base: merged.base,
      dots: merged.dots,
      ticks: total,
      start: tokens[start].start
    };
    tokens.splice(start, tokens.length - start, replacement);
    return tokens;
  }

  function buildVoiceRhythm(config, meter, rng, opts) {
    const options = opts || {};
    let tokens = fillMeasure(config, meter, rng, options);
    tokens = applyRests(tokens, config, rng, options);
    tokens = addTies(tokens, config, rng, meter, options);
    const tupletResult = addTuplets(tokens, config, rng, meter, options);
    tokens = tupletResult.tokens;
    if (options.forceTuplet && !tupletResult.inserted) {
      return { tokens, tupletInserted: false };
    }
    return { tokens, tupletInserted: tupletResult.inserted };
  }

  function buildBassRhythm(config, meter, rng, opts) {
    const durations = (opts && opts.durations) || ['whole', 'half', 'quarter', 'eighth'];
    const bassOptions = {
      durations,
      allowDots: true,
      allowSyncopation: false,
      allowTuplets: false,
      allowTies: opts && opts.allowTies,
      restAmount: opts && opts.restAmount !== undefined ? opts.restAmount : Math.max(0, (config.restAmount || 0) * 0.6),
      keepFirst: true,
      keepLast: true,
      attempts: 16,
      maxRests: 1
    };
    let tokens = fillMeasure(config, meter, rng, bassOptions);
    tokens = applyRests(tokens, config, rng, bassOptions);
    tokens = addTies(tokens, config, rng, meter, bassOptions);
    return tokens;
  }

  function buildInnerRhythm(config, meter, rng, opts) {
    const durations = (opts && opts.durations) || ['half', 'quarter'];
    const innerOptions = {
      durations,
      allowDots: false,
      allowSyncopation: false,
      allowTuplets: false,
      allowTies: false,
      restAmount: opts && opts.restAmount !== undefined ? opts.restAmount : 0.18,
      keepFirst: false,
      keepLast: false,
      attempts: 12,
      maxRests: 2
    };
    let tokens = fillMeasure(config, meter, rng, innerOptions);
    tokens = applyRests(tokens, config, rng, innerOptions);
    return tokens;
  }

  window.RhythmEngine = {
    tokenOptions,
    fillMeasure,
    buildCell,
    varyCell,
    forceCadenceEnding,
    buildVoiceRhythm,
    buildBassRhythm,
    buildInnerRhythm,
    applyRests,
    addTies,
    addTuplets,
    ticksToToken,
    isGroupBoundary,
    scoreFill
  };
})();
