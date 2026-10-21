(function () {
  'use strict';

  const T = window.MusicTheory;
  const G = window.MUSIC_GLYPHS;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
      });
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function glyphBox(name) {
    const glyph = G[name];
    return glyph ? glyph.bbox : [0, 0, 0, 0];
  }

  function glyphWidth(name, space) {
    const bbox = glyphBox(name);
    return ((bbox[2] - bbox[0]) / 250) * space;
  }

  function drawGlyph(parent, name, x, y, space, options) {
    const glyph = G[name];
    if (!glyph) return null;
    const opts = options || {};
    const k = (space / 250) * (opts.scale || 1);
    const node = svgEl('path', {
      d: glyph.d,
      class: opts.className || 'glyph',
      transform: 'translate(' + x + ' ' + y + ') scale(' + k + ' ' + (-k) + ')'
    }, parent);
    return node;
  }

  function drawGlyphCentered(parent, name, x, y, space, options) {
    const bbox = glyphBox(name);
    const k = (space / 250) * ((options && options.scale) || 1);
    const cx = (bbox[0] + bbox[2]) / 2;
    const cy = (bbox[1] + bbox[3]) / 2;
    return drawGlyph(parent, name, x - cx * k, y + cy * k, space, options);
  }

  function drawAccidental(parent, glyph, x, y, space) {
    if (glyph === 'flat' || glyph === 'doubleFlat') {
      return drawGlyph(parent, glyph, x, y, space, { className: 'accidental-glyph' });
    }
    return drawGlyphCentered(parent, glyph, x, y, space, { className: 'accidental-glyph' });
  }

  const TIME_DIGIT_SCALE = 0.86;
  const TIME_DIGIT_GAP = 0.08;
  const KEY_ACCIDENTAL_GAP = 1.08;

  function timeTextWidth(text, space) {
    const digits = String(text).split('');
    let width = 0;
    digits.forEach((digit, index) => {
      width += glyphWidth('time' + digit, space) * TIME_DIGIT_SCALE;
      if (index > 0) width += TIME_DIGIT_GAP * space;
    });
    return width;
  }

  function pathFromPoints(points) {
    if (!points.length) return '';
    return points.map((point, index) => (index === 0 ? 'M' : 'L') + point[0] + ' ' + point[1]).join(' ');
  }

  class ScoreRenderer {
    constructor(svg, container) {
      this.svg = svg;
      this.container = container;
      this.exercise = null;
      this.layout = null;
      this.eventGeoms = new Map();
      this.eventNodes = new Map();
      this.showNames = false;
      this.playingIds = new Set();
      this.quizRing = null;
      this.lastOptions = {};
      this.width = 0;
    }

    headerMetrics(space) {
      const exercise = this.exercise;
      const grand = exercise.parts.length > 1;
      const leftPad = 12;
      const braceWidth = grand ? 1.45 * space : 0;
      const staffStart = leftPad + braceWidth;
      const clefWidth = Math.max(glyphWidth('treble', space), glyphWidth('bass', space));
      const clefX = staffStart + 0.5 * space;
      const keySteps = T.keySignatureSteps('treble', exercise.key).length;
      const keyGlyph = exercise.key.type === 'flat' ? 'flat' : 'sharp';
      const keySpacing = KEY_ACCIDENTAL_GAP * space;
      const keyWidth = keySteps ? (keySteps - 1) * keySpacing + glyphWidth(keyGlyph, space) : 0;
      const keyX = clefX + clefWidth + 0.35 * space;
      const keyRight = keyX + keyWidth;
      const timeX = keyRight + (keySteps ? 0.65 * space : 0.5 * space);
      const timeWidth = Math.max(
        timeTextWidth(exercise.meterInfo.numerator, space),
        timeTextWidth(exercise.meterInfo.denominator, space)
      );
      return {
        leftPad,
        braceWidth,
        staffStart,
        clefWidth,
        clefX,
        keySteps,
        keyX,
        keySpacing,
        keyWidth,
        keyRight,
        timeX,
        timeWidth,
        firstEnd: timeX + timeWidth + 0.9 * space,
        laterEnd: keyRight + 0.75 * space
      };
    }

    measureWidthEstimate(measure, meter, space) {
      let maxEvents = 0;
      this.exercise.parts.forEach((part) => {
        for (let voice = 0; voice < part.voiceCount; voice++) {
          const count = measure.events.filter((event) => event.part === part.role && event.voice === voice).length;
          if (count > maxEvents) maxEvents = count;
        }
      });
      let width = 42 + maxEvents * 12.5;
      if (meter.compound) width += 8;
      if (maxEvents > 12) width += (maxEvents - 12) * 2.2;
      const estimated = Math.max(88, Math.min(440, width));
      return Math.max(estimated, this.measureMinimumWidth(measure, space));
    }

    computeLayout() {
      const exercise = this.exercise;
      const measured = this.container && this.container.clientWidth
        ? this.container.clientWidth - 16
        : 860;
      const width = Math.max(320, measured || 860);
      const space = width < 520 ? 8.1 : width < 760 ? 9.3 : 10.4;
      const grand = exercise.parts.length > 1;
      const rightPad = 14;
      const header = this.headerMetrics(space);
      const measureMins = exercise.measures.map((measure) => this.measureWidthEstimate(measure, exercise.meterInfo, space));
      const systems = [];
      let y = 14;
      let index = 0;

      while (index < exercise.measures.length) {
        const first = systems.length === 0;
        const contentStart = first ? header.firstEnd : header.laterEnd;
        const headerWidth = contentStart - header.leftPad;
        const available = Math.max(190, width - contentStart - rightPad);
        const picks = [];
        let sum = 0;
        while (index + picks.length < exercise.measures.length) {
          const minWidth = measureMins[index + picks.length];
          if (picks.length > 0 && sum + minWidth > available) break;
          picks.push({ index: index + picks.length, minWidth });
          sum += minWidth;
          if (sum >= available) break;
        }
        const extra = Math.max(0, available - sum);
        let cursor = contentStart;
        picks.forEach((pick) => {
          pick.width = pick.minWidth + (sum > 0 ? extra * (pick.minWidth / sum) : 0);
          pick.x = cursor;
          cursor += pick.width;
        });
        const contentWidth = Math.max(sum, available);
        const contentEnd = contentStart + contentWidth;
        const topPad = grand ? 6.6 * space : 6.2 * space;
        const staffGap = 5.5 * space;
        const contentHeight = grand ? 8 * space + staffGap : 4 * space;
        const bottomPad = 5.2 * space;
        const trebleTop = y + topPad;
        const trebleBottom = trebleTop + 4 * space;
        const bassTop = grand ? trebleBottom + staffGap : null;
        const bassBottom = grand ? bassTop + 4 * space : null;
        const system = {
          index: systems.length,
          first,
          yTop: y,
          headerWidth,
          header,
          staffStart: header.staffStart,
          contentStart,
          contentEnd,
          width: contentEnd + rightPad,
          space,
          picks,
          trebleTop,
          trebleBottom,
          bassTop,
          bassBottom,
          staffGap,
          height: topPad + contentHeight + bottomPad
        };
        systems.push(system);
        y += system.height;
        index += picks.length;
      }

      const maxSystemWidth = systems.reduce((max, system) => Math.max(max, system.width), width);
      return {
        width: Math.max(width, maxSystemWidth),
        baseWidth: width,
        height: y + 6,
        space,
        systems,
        measureMins
      };
    }

    render(exercise, options) {
      this.exercise = exercise;
      this.lastOptions = Object.assign({}, options || {});
      this.showNames = !!this.lastOptions.showNames;
      this.eventGeoms.clear();
      this.eventNodes.clear();
      this.quizRing = null;
      while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
      this.layout = this.computeLayout();
      const layout = this.layout;
      this.svg.setAttribute('viewBox', '0 0 ' + layout.width + ' ' + layout.height);
      this.svg.setAttribute('role', 'img');
      this.svg.setAttribute('aria-label', 'Spartito di ' + exercise.measures.length + ' misure in ' + exercise.meter + ', tonalità di ' + exercise.key.nameIt + '.');
      if (layout.width > layout.baseWidth + 1) {
        this.svg.style.width = layout.width + 'px';
      } else {
        this.svg.style.width = '';
      }
      const defs = svgEl('defs', {}, this.svg);
      const title = svgEl('title', {}, this.svg);
      title.textContent = exercise.key.nameIt + ', ' + exercise.meter + ', ' + exercise.measures.length + ' misure';
      const desc = svgEl('desc', {}, this.svg);
      desc.textContent = 'Esercizio di lettura a prima vista. ' + exercise.levelName + '. Tempo ' + exercise.tempo + ' battiti al minuto.';

      layout.systems.forEach((system) => {
        this.drawSystemBackdrop(system, defs);
      });

      const measureMap = new Map();
      layout.systems.forEach((system) => {
        system.picks.forEach((pick) => {
          measureMap.set(pick.index, { system, pick, measure: exercise.measures[pick.index] });
        });
      });

      this.buildEventGeometries(measureMap, layout);

      this.drawTies(measureMap);

      if (this.lastOptions.playingIds) {
        this.setPlaying(this.lastOptions.playingIds);
      }
      if (this.lastOptions.quizTargetId) {
        this.setQuizTarget(this.lastOptions.quizTargetId, this.lastOptions.quizStatus);
      }
      return layout;
    }

    rerender() {
      if (!this.exercise) return;
      this.render(this.exercise, this.lastOptions);
    }

    drawSystemBackdrop(system, defs) {
      const g = svgEl('g', { class: 'system-backdrop' }, this.svg);
      const grand = this.exercise.parts.length > 1;
      const staffLine = (y) => {
        svgEl('line', {
          x1: system.staffStart,
          y1: y,
          x2: system.contentEnd,
          y2: y,
          class: 'staff-line'
        }, g);
      };
      for (let i = 0; i < 5; i++) {
        staffLine(system.trebleTop + i * system.space);
        if (grand) staffLine(system.bassTop + i * system.space);
      }
      if (grand) {
        const braceX = system.staffStart - 0.9 * system.space;
        const top = system.trebleTop;
        const bottom = system.bassBottom;
        const mid = (top + bottom) / 2;
        const curve = 0.9 * system.space;
        const path = 'M ' + (braceX + curve) + ' ' + top +
          ' C ' + (braceX - curve) + ' ' + (top + curve * 1.4) + ' ' + (braceX + curve * 1.2) + ' ' + (mid - curve) + ' ' + braceX + ' ' + mid +
          ' C ' + (braceX + curve * 1.2) + ' ' + (mid + curve) + ' ' + (braceX - curve) + ' ' + (bottom - curve * 1.4) + ' ' + (braceX + curve) + ' ' + bottom;
        svgEl('path', { d: path, class: 'bracket' }, g);
      }
      this.drawSystemHeader(system, g);
      this.drawBarlines(system, g);
    }

    drawSystemHeader(system, parent) {
      const exercise = this.exercise;
      const space = system.space;
      const grand = exercise.parts.length > 1;
      const header = system.header;
      const clefX = header.clefX;
      const keyX = header.keyX;
      const keySpacing = header.keySpacing;
      const timeCenterX = header.timeX + header.timeWidth / 2;
      const staves = [];
      if (exercise.parts.some((part) => part.clef === 'treble')) {
        staves.push({ clef: 'treble', top: system.trebleTop, bottom: system.trebleBottom });
      }
      if (grand || exercise.parts.some((part) => part.clef === 'bass')) {
        staves.push({ clef: 'bass', top: grand ? system.bassTop : system.trebleTop, bottom: grand ? system.bassBottom : system.trebleBottom });
      }
      staves.forEach((staff) => {
        const clefName = staff.clef === 'treble' ? 'treble' : 'bass';
        const originStep = staff.clef === 'treble' ? 2 : 6;
        drawGlyph(parent, clefName, clefX, T.noteY(originStep, staff.bottom, space), space, { className: 'clef-glyph' });
        const steps = T.keySignatureSteps(staff.clef, exercise.key);
        steps.forEach((step, index) => {
          const y = T.noteY(step, staff.bottom, space);
          const x = keyX + index * keySpacing;
          const glyph = exercise.key.type === 'flat' ? 'flat' : 'sharp';
          drawAccidental(parent, glyph, x, y, space);
        });
        if (system.first) {
          const drawNumber = (text, y) => {
            const digits = String(text).split('');
            const widths = digits.map((digit) => glyphWidth('time' + digit, space) * TIME_DIGIT_SCALE);
            const gap = TIME_DIGIT_GAP * space;
            const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, digits.length - 1);
            let cursor = timeCenterX - total / 2;
            digits.forEach((digit, index) => {
              const width = widths[index];
              drawGlyphCentered(parent, 'time' + digit, cursor + width / 2, y, space, {
                className: 'glyph',
                scale: TIME_DIGIT_SCALE
              });
              cursor += width + gap;
            });
          };
          drawNumber(exercise.meterInfo.numerator, staff.top + 1.0 * space);
          drawNumber(exercise.meterInfo.denominator, staff.top + 3.0 * space);
        }
      });
      const measure = exercise.measures[system.picks[0].index];
      if (measure) {
        const number = system.picks[0].index + 1;
        const text = svgEl('text', {
          x: system.contentStart + 2,
          y: system.trebleTop - 1.55 * space,
          class: 'measure-number'
        }, parent);
        text.textContent = String(number);
      }
      if (system.first) {
        const tempoText = svgEl('text', {
          x: system.contentEnd - 2,
          y: system.trebleTop - 1.9 * space,
          class: 'tempo-mark',
          'text-anchor': 'end'
        }, parent);
        tempoText.textContent = '♩ = ' + exercise.tempo;
      }
    }

    drawBarlines(system, parent) {
      const grand = this.exercise.parts.length > 1;
      const y1 = system.trebleTop;
      const y2 = grand ? system.bassBottom : system.trebleBottom;
      const start = system.contentStart;
      const end = system.contentEnd;
      svgEl('line', { x1: start, y1, x2: start, y2, class: 'barline' }, parent);
      system.picks.forEach((pick, index) => {
        const x = pick.x + pick.width;
        const isFinal = index === system.picks.length - 1 && pick.index === this.exercise.measures.length - 1;
        if (isFinal) {
          svgEl('line', { x1: x - 0.55 * system.space, y1, x2: x - 0.55 * system.space, y2, class: 'barline--final-thin' }, parent);
          svgEl('line', { x1: x, y1, x2: x, y2, class: 'barline--final-thick' }, parent);
        } else {
          svgEl('line', { x1: x, y1, x2: x, y2, class: 'barline' }, parent);
        }
      });
    }

    eventAccidentalWidth(event, space) {
      let width = 0;
      let count = 0;
      event.pitches.forEach((pitch) => {
        const display = T.displayAccidental(pitch, this.exercise.key);
        if (!display) return;
        if (count > 0) width += 0.16 * space;
        width += glyphWidth(T.accidentalGlyph(display), space);
        count += 1;
      });
      return width;
    }

    measureOnsetMetrics(measure, space) {
      const groups = new Map();
      measure.events.forEach((event) => {
        if (!groups.has(event.localStart)) groups.set(event.localStart, []);
        groups.get(event.localStart).push(event);
      });
      const onsets = Array.from(groups.keys()).sort((a, b) => a - b);
      const headHalf = glyphWidth('noteheadBlack', space) / 2;
      const gap = 0.16 * space;
      const extents = onsets.map((onset) => {
        let left = headHalf;
        let right = headHalf;
        groups.get(onset).forEach((event) => {
          if (event.rest) {
            const half = glyphWidth(this.restGlyph(event), space) / 2;
            left = Math.max(left, half);
            right = Math.max(right, half + (event.dots || 0) * 0.24 * space + 0.12 * space);
          } else if (event.pitches && event.pitches.length) {
            const accidentalWidth = this.eventAccidentalWidth(event, space);
            if (accidentalWidth) left = Math.max(left, headHalf + gap + accidentalWidth);
            if (event.pitches.length > 1) {
              left = Math.max(left, headHalf + 0.18 * space);
              right = Math.max(right, headHalf + 0.18 * space);
            }
          }
        });
        return { left, right };
      });
      const minGaps = [];
      for (let index = 1; index < onsets.length; index++) {
        minGaps.push(extents[index - 1].right + extents[index].left + 0.18 * space);
      }
      return { onsets, extents, minGaps };
    }

    measureStartPad(measure, space, metrics, width) {
      const headHalf = glyphWidth('noteheadBlack', space) / 2;
      const basePad = Math.min(1.15 * space, width * 0.15);
      const firstLeft = metrics.extents.length ? metrics.extents[0].left : headHalf;
      return Math.max(basePad, firstLeft + 0.35 * space);
    }

    measureMinimumWidth(measure, space) {
      const metrics = this.measureOnsetMetrics(measure, space);
      if (!metrics.onsets.length) return 88;
      const pad = this.measureStartPad(measure, space, metrics, 10000);
      const gapSum = metrics.minGaps.reduce((sum, value) => sum + value, 0);
      const lastRight = metrics.extents[metrics.extents.length - 1].right;
      return Math.max(88, pad * 2 + gapSum + lastRight + 0.35 * space);
    }

    onsetPositions(measure, pick, pad, innerWidth, space, metrics) {
      const positions = new Map();
      const onsets = metrics.onsets;
      if (!onsets.length) return positions;
      const firstX = pick.x + pad;
      if (onsets.length === 1) {
        positions.set(onsets[0], firstX);
        return positions;
      }
      const baseGaps = [];
      for (let index = 1; index < onsets.length; index++) {
        baseGaps.push(((onsets[index] - onsets[index - 1]) / measure.ticks) * innerWidth);
      }
      let gaps = baseGaps.map((value, index) => Math.max(value, metrics.minGaps[index]));
      const maxTotal = Math.max(0, innerWidth - metrics.extents[metrics.extents.length - 1].right - 0.35 * space);
      const total = gaps.reduce((sum, value) => sum + value, 0);
      if (total > maxTotal) {
        const slack = gaps.map((value, index) => value - metrics.minGaps[index]);
        const slackSum = slack.reduce((sum, value) => sum + value, 0);
        const excess = total - maxTotal;
        if (slackSum >= excess && slackSum > 0) {
          gaps = gaps.map((value, index) => value - (excess * slack[index]) / slackSum);
        } else {
          gaps = baseGaps;
        }
      }
      let x = firstX;
      positions.set(onsets[0], x);
      for (let index = 1; index < onsets.length; index++) {
        x += gaps[index - 1];
        positions.set(onsets[index], x);
      }
      return positions;
    }

    buildEventGeometries(measureMap, layout) {
      this.eventGeoms.clear();
      this.eventNodes.clear();
      const exercise = this.exercise;
      measureMap.forEach((entry) => {
        const system = entry.system;
        const pick = entry.pick;
        const measure = entry.measure;
        const space = system.space;
        const metrics = this.measureOnsetMetrics(measure, space);
        const pad = this.measureStartPad(measure, space, metrics, pick.width);
        const innerWidth = Math.max(1, pick.width - pad * 2);
        const onsetX = this.onsetPositions(measure, pick, pad, innerWidth, space, metrics);
        const partGroups = new Map();
        exercise.parts.forEach((part) => {
          const staffTop = system.trebleTop;
          const staffBottom = part.clef === 'treble'
            ? system.trebleBottom
            : (system.bassTop !== null ? system.bassBottom : system.trebleBottom);
          const geoms = [];
          for (let voice = 0; voice < part.voiceCount; voice++) {
            const events = measure.events
              .filter((event) => event.part === part.role && event.voice === voice)
              .sort((a, b) => a.localStart - b.localStart);
            events.forEach((event) => {
              const x = onsetX.has(event.localStart)
                ? onsetX.get(event.localStart)
                : pick.x + pad + (event.localStart / measure.ticks) * innerWidth;
              const geom = {
                event,
                x,
                system,
                measure,
                part,
                staffTop,
                staffBottom,
                space,
                isRest: event.rest,
                pitches: [],
                noteYmin: 0,
                noteYmax: 0,
                stemDir: 'up',
                stemX: x,
                stemStartY: 0,
                stemEndY: 0,
                flags: event.rest ? 0 : T.tokenFlags({ base: event.base }),
                beamGroup: null
              };
              if (!event.rest && event.pitches.length) {
                const steps = event.pitches.map((pitch) => T.staffStep(pitch, part.clef));
                const offsets = new Array(steps.length).fill(0);
                for (let i = 1; i < steps.length; i++) {
                  if (Math.abs(steps[i] - steps[i - 1]) <= 1) {
                    offsets[i] = i % 2 === 1 ? 0.18 * space : -0.18 * space;
                  }
                }
                geom.pitches = event.pitches.map((pitch, index) => {
                  const step = steps[index];
                  return {
                    pitch,
                    step,
                    y: T.noteY(step, staffBottom, space),
                    x: x + offsets[index],
                    ledgerSteps: T.ledgerSteps(step),
                    displayAccidental: T.displayAccidental(pitch, exercise.key)
                  };
                });
                geom.noteYmin = Math.min.apply(null, geom.pitches.map((p) => p.y));
                geom.noteYmax = Math.max.apply(null, geom.pitches.map((p) => p.y));
                const averageStep = steps.reduce((sum, step) => sum + step, 0) / steps.length;
                if (part.voiceCount > 1) {
                  geom.stemDir = voice === 0 ? 'up' : 'down';
                } else {
                  geom.stemDir = averageStep < 4 ? 'up' : 'down';
                }
                geom.stemX = x + (geom.stemDir === 'up' ? 0.55 * space : -0.55 * space);
                geom.stemStartY = geom.stemDir === 'up' ? geom.noteYmax : geom.noteYmin;
                geom.stemEndY = geom.stemDir === 'up'
                  ? geom.noteYmin - 3.35 * space
                  : geom.noteYmax + 3.35 * space;
              } else {
                geom.restY = this.restY(event, staffBottom, space);
                geom.restGlyph = this.restGlyph(event);
              }
              geoms.push(geom);
              this.eventGeoms.set(event.id, geom);
            });
          }
          partGroups.set(part.role, geoms);
        });
        entry.system.partGeoms = partGroups;
        this.buildBeamGroups(partGroups, system, measure);
        this.drawMeasureEvents(pick, partGroups, system, measure);
      });
    }

    restGlyph(event) {
      const map = {
        whole: 'restWhole',
        half: 'restHalf',
        quarter: 'restQuarter',
        eighth: 'rest8',
        sixteenth: 'rest16',
        thirtysecond: 'rest32'
      };
      return map[event.base] || 'restQuarter';
    }

    restY(event, staffBottom, space) {
      const map = { whole: 6, half: 4, quarter: 4, eighth: 4, sixteenth: 4, thirtysecond: 4 };
      const step = map[event.base] !== undefined ? map[event.base] : 4;
      let y = T.noteY(step, staffBottom, space);
      if (event.base === 'sixteenth' || event.base === 'thirtysecond') y += 0.15 * space;
      return y;
    }

    buildBeamGroups(partGroups, system, measure) {
      const space = system.space;
      const meter = this.exercise.meterInfo;
      const beamGroupTicks = meter.compound ? 720 : (this.exercise.meter === '3/8' ? 720 : 480);
      const irregular = this.exercise.meter === '5/8' || this.exercise.meter === '7/8';
      const boundaries = irregular
        ? T.beatPositions(this.exercise.meter).filter((tick) => tick > 0)
        : null;
      partGroups.forEach((geoms) => {
        for (let voice = 0; voice < this.exercise.parts.reduce((max, part) => Math.max(max, part.voiceCount), 1); voice++) {
          const voiceGeoms = geoms.filter((geom) => geom.event.voice === voice && !geom.isRest && geom.flags > 0);
          const groups = [];
          let current = [];
          let currentKey = null;
          voiceGeoms.forEach((geom) => {
            const groupKey = geom.event.tupletGroup !== null && geom.event.tupletGroup !== undefined
              ? 't' + geom.event.tupletGroup
              : boundaries
                ? 'b' + boundaries.filter((tick) => tick <= geom.event.localStart).length
                : Math.floor(geom.event.localStart / beamGroupTicks);
            const previous = current.length ? current[current.length - 1] : null;
            const contiguous = previous && previous.event.localStart + previous.event.duration === geom.event.localStart;
            if (!current.length || groupKey !== currentKey || !contiguous) {
              if (current.length) groups.push(current);
              current = [];
              currentKey = groupKey;
            }
            current.push(geom);
          });
          if (current.length) groups.push(current);
          groups.forEach((group) => {
            if (group.length < 2) return;
            const direction = group[0].event.voice === 1 ? 'down' : (group[0].part.voiceCount > 1 ? 'up' : group[0].stemDir);
            const directionCounts = group.map((geom) => geom.stemDir);
            const chosenDirection = directionCounts.filter((dir) => dir === direction).length >= directionCounts.length / 2
              ? direction
              : directionCounts[0];
            group.forEach((geom) => {
              geom.stemDir = chosenDirection;
              geom.stemX = geom.x + (chosenDirection === 'up' ? 0.55 * space : -0.55 * space);
            });
            const ends = group.map((geom) => chosenDirection === 'up'
              ? geom.noteYmin - 3.3 * space
              : geom.noteYmax + 3.3 * space);
            let beamY = ends.reduce((sum, value) => sum + value, 0) / ends.length;
            if (chosenDirection === 'up') {
              const highest = Math.min.apply(null, group.map((geom) => geom.noteYmin));
              beamY = Math.min(beamY, highest - 2.7 * space);
            } else {
              const lowest = Math.max.apply(null, group.map((geom) => geom.noteYmax));
              beamY = Math.max(beamY, lowest + 2.7 * space);
            }
            const beamGroup = {
              geoms: group,
              direction: chosenDirection,
              beamY,
              count: Math.max.apply(null, group.map((geom) => geom.flags))
            };
            group.forEach((geom) => {
              geom.beamGroup = beamGroup;
              geom.stemEndY = beamY;
              geom.stemStartY = chosenDirection === 'up' ? geom.noteYmax : geom.noteYmin;
            });
          });
        }
      });
    }

    drawMeasureEvents(pick, partGroups, system, measure) {
      const space = system.space;
      partGroups.forEach((geoms) => {
        geoms.forEach((geom) => {
          const node = svgEl('g', { class: 'note-group', 'data-event-id': geom.event.id }, null);
          this.eventNodes.set(geom.event.id, node);
          geom.groupNode = node;
          this.svg.appendChild(node);
          if (geom.isRest) {
            drawGlyphCentered(node, geom.restGlyph, geom.x, geom.restY, space, { className: 'rest-glyph' });
            if (geom.event.dots) {
              for (let dot = 0; dot < geom.event.dots; dot++) {
                svgEl('circle', {
                  cx: geom.x + 0.62 * space + dot * 0.24 * space,
                  cy: geom.restY - 0.5 * space,
                  r: 0.105 * space,
                  class: 'rest-dot'
                }, node);
              }
            }
            return;
          }
          geom.pitches.forEach((pitchGeom) => {
            pitchGeom.ledgerSteps.forEach((step) => {
              svgEl('line', {
                x1: geom.x - 0.82 * space,
                x2: geom.x + 0.82 * space,
                y1: T.noteY(step, geom.staffBottom, space),
                y2: T.noteY(step, geom.staffBottom, space),
                class: 'ledger-line'
              }, node);
            });
          });
          this.drawStem(node, geom, space);
          this.drawFlags(node, geom, space);
          this.drawNoteheads(node, geom, space);
          this.drawDots(node, geom, space);
          this.drawAccidentals(node, geom, space);
          if (this.showNames) this.drawNoteLabel(node, geom, space);
        });
      });
      this.drawBeams(system, measure, partGroups);
      this.drawTuplets(system, measure, partGroups);
    }

    drawStem(parent, geom, space) {
      if (!geom.pitches.length) return;
      if (geom.event.base === 'whole') return;
      if (geom.beamGroup) {
        const y1 = geom.stemDir === 'up' ? geom.noteYmax : geom.noteYmin;
        svgEl('line', {
          x1: geom.stemX,
          x2: geom.stemX,
          y1,
          y2: geom.stemEndY,
          class: 'stem'
        }, parent);
        return;
      }
      svgEl('line', {
        x1: geom.stemX,
        x2: geom.stemX,
        y1: geom.stemStartY,
        y2: geom.stemEndY,
        class: 'stem'
      }, parent);
    }

    drawFlags(parent, geom, space) {
      if (!geom.flags || geom.beamGroup || geom.event.base === 'whole') return;
      const x = geom.stemX;
      const y = geom.stemEndY;
      for (let i = 0; i < geom.flags; i++) {
        const offset = i * 0.66 * space;
        const path = geom.stemDir === 'up'
          ? 'M ' + x + ' ' + (y + offset) +
            ' C ' + (x + 0.5 * space) + ' ' + (y + offset + 0.32 * space) +
            ' ' + (x + 0.72 * space) + ' ' + (y + offset + 0.82 * space) +
            ' ' + (x + 0.42 * space) + ' ' + (y + offset + 1.18 * space)
          : 'M ' + x + ' ' + (y - offset) +
            ' C ' + (x + 0.5 * space) + ' ' + (y - offset - 0.32 * space) +
            ' ' + (x + 0.72 * space) + ' ' + (y - offset - 0.82 * space) +
            ' ' + (x + 0.42 * space) + ' ' + (y - offset - 1.18 * space);
        svgEl('path', {
          d: path,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 0.19 * space,
          'stroke-linecap': 'round',
          class: 'flag'
        }, parent);
      }
    }

    drawNoteheads(parent, geom, space) {
      geom.pitches.forEach((pitchGeom) => {
        const name = geom.event.base === 'whole'
          ? 'noteheadWhole'
          : (geom.event.base === 'half' ? 'noteheadHalf' : 'noteheadBlack');
        const node = drawGlyphCentered(parent, name, pitchGeom.x, pitchGeom.y, space, { className: 'notehead' });
        if (node) node.setAttribute('class', 'notehead notehead--' + (geom.event.base === 'whole' ? 'whole' : geom.event.base));
      });
    }

    drawDots(parent, geom, space) {
      if (!geom.event.dots) return;
      geom.pitches.forEach((pitchGeom) => {
        const width = glyphWidth('noteheadBlack', space);
        for (let dot = 0; dot < geom.event.dots; dot++) {
          const onLine = pitchGeom.step % 2 === 0;
          svgEl('circle', {
            cx: pitchGeom.x + width / 2 + 0.34 * space + dot * 0.24 * space,
            cy: pitchGeom.y + (onLine ? -0.5 * space : 0),
            r: 0.105 * space,
            class: 'dotted-note-dot'
          }, parent);
        }
      });
    }

    drawAccidentals(parent, geom, space) {
      const headHalf = glyphWidth('noteheadBlack', space) / 2;
      const gap = 0.16 * space;
      let offset = 0;
      geom.pitches.forEach((pitchGeom) => {
        if (!pitchGeom.displayAccidental) return;
        const glyph = T.accidentalGlyph(pitchGeom.displayAccidental);
        const width = glyphWidth(glyph, space);
        const right = pitchGeom.x - headHalf - gap - offset;
        const x = (glyph === 'flat' || glyph === 'doubleFlat') ? right - width : right - width / 2;
        drawAccidental(parent, glyph, x, pitchGeom.y, space);
        offset += width + gap;
      });
    }

    drawNoteLabel(parent, geom, space) {
      if (!geom.pitches.length) return;
      const top = geom.pitches[geom.pitches.length - 1];
      const label = geom.pitches.map((pitchGeom) => T.formatPitchIt(pitchGeom.pitch, true)).join('/');
      const y = geom.stemDir === 'up' ? geom.noteYmax + 1.55 * space : geom.noteYmin - 1.05 * space;
      const text = svgEl('text', {
        x: geom.x,
        y,
        class: 'note-label'
      }, parent);
      text.textContent = label;
      text.style.fontSize = (0.82 * space) + 'px';
      return top;
    }

    drawBeams(system, measure, partGroups) {
      const space = system.space;
      const seen = new Set();
      partGroups.forEach((geoms) => {
        geoms.forEach((geom) => {
          if (!geom.beamGroup || seen.has(geom.beamGroup)) return;
          const group = geom.beamGroup;
          seen.add(group);
          const direction = group.direction;
          for (let level = 0; level < group.count; level++) {
            const runs = [];
            let run = [];
            group.geoms.forEach((item) => {
              if (item.flags > level) {
                run.push(item);
              } else if (run.length) {
                runs.push(run);
                run = [];
              }
            });
            if (run.length) runs.push(run);
            runs.forEach((currentRun) => {
              const y = group.beamY + (direction === 'up' ? level * 0.72 * space : -level * 0.72 * space);
              if (currentRun.length >= 2) {
                this.drawBeamSegment(currentRun[0].stemX, currentRun[currentRun.length - 1].stemX, y, space);
              } else {
                const item = currentRun[0];
                const index = group.geoms.indexOf(item);
                const towardRight = index < group.geoms.length - 1;
                const start = item.stemX;
                const end = start + (towardRight ? 0.42 * space : -0.42 * space);
                this.drawBeamSegment(start, end, y, space);
              }
            });
          }
        });
      });
    }

    drawBeamSegment(x1, x2, y, space) {
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const thickness = 0.5 * space;
      svgEl('path', {
        d: 'M ' + left + ' ' + (y - thickness / 2) +
          ' L ' + right + ' ' + (y - thickness / 2) +
          ' L ' + right + ' ' + (y + thickness / 2) +
          ' L ' + left + ' ' + (y + thickness / 2) + ' Z',
        class: 'beam'
      }, this.svg);
    }

    drawTuplets(system, measure, partGroups) {
      const space = system.space;
      const groups = new Map();
      partGroups.forEach((geoms) => {
        geoms.forEach((geom) => {
          if (geom.event.tupletGroup === null || geom.event.tupletGroup === undefined) return;
          const key = geom.event.part + ':' + geom.event.voice + ':' + geom.event.tupletGroup;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(geom);
        });
      });
      groups.forEach((geoms) => {
        geoms.sort((a, b) => a.event.localStart - b.event.localStart);
        if (!geoms.length) return;
        const first = geoms[0];
        const last = geoms[geoms.length - 1];
        const direction = first.beamGroup ? first.beamGroup.direction : first.stemDir;
        const y = direction === 'up'
          ? Math.min.apply(null, geoms.map((geom) => geom.beamGroup ? geom.beamGroup.beamY : geom.noteYmin)) - 1.25 * space
          : Math.max.apply(null, geoms.map((geom) => geom.beamGroup ? geom.beamGroup.beamY : geom.noteYmax)) + 1.25 * space;
        const x1 = first.x - 0.15 * space;
        const x2 = last.x + 0.15 * space;
        svgEl('path', {
          d: 'M ' + x1 + ' ' + (y + 0.28 * space) + ' L ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y + ' L ' + x2 + ' ' + (y + 0.28 * space),
          class: 'tuplet-bracket'
        }, this.svg);
        const text = svgEl('text', {
          x: (x1 + x2) / 2,
          y: y - 0.18 * space,
          class: 'tuplet-number'
        }, this.svg);
        text.textContent = String(first.event.tuplet ? first.event.tuplet.num : 3);
        text.style.fontSize = (0.95 * space) + 'px';
      });
    }

    drawTies(measureMap) {
      const byVoice = new Map();
      this.eventGeoms.forEach((geom) => {
        const key = geom.event.part + ':' + geom.event.voice;
        if (!byVoice.has(key)) byVoice.set(key, []);
        byVoice.get(key).push(geom);
      });
      byVoice.forEach((geoms) => {
        geoms.sort((a, b) => a.event.startTick - b.event.startTick);
        for (let i = 0; i < geoms.length - 1; i++) {
          const current = geoms[i];
          const next = geoms[i + 1];
          if (!current.event.tieToNext) continue;
          if (!next || next.isRest || current.isRest || current.pitches.length !== 1 || next.pitches.length !== 1) continue;
          if (current.pitches[0].pitch.midi !== next.pitches[0].pitch.midi) continue;
          this.drawTieCurve(current, next);
        }
      });
    }

    drawTieCurve(current, next) {
      const space = current.space;
      const width = glyphWidth('noteheadBlack', space);
      const sign = current.stemDir === 'up' ? 1 : -1;
      const y = current.pitches[0].y;
      const x1 = current.x + width / 2 + 0.08 * space;
      const x2 = next.x - width / 2 - 0.08 * space;
      if (current.system === next.system) {
        if (x2 <= x1) return;
        const mid = (x1 + x2) / 2;
        const curve = y + sign * 0.56 * space;
        svgEl('path', {
          d: 'M ' + x1 + ' ' + y + ' Q ' + mid + ' ' + curve + ' ' + x2 + ' ' + y,
          class: 'tie'
        }, this.svg);
        return;
      }
      const endX = current.system.contentEnd - 0.2 * space;
      if (endX > x1) {
        const curve = y + sign * 0.5 * space;
        svgEl('path', {
          d: 'M ' + x1 + ' ' + y + ' Q ' + ((x1 + endX) / 2) + ' ' + curve + ' ' + endX + ' ' + (y - sign * 0.1 * space),
          class: 'tie'
        }, this.svg);
      }
      const startX = next.system.contentStart + 0.2 * space;
      const nextY = next.pitches[0].y;
      if (startX < x2) {
        const curve = nextY + sign * 0.5 * space;
        svgEl('path', {
          d: 'M ' + startX + ' ' + (nextY - sign * 0.1 * space) + ' Q ' + ((startX + x2) / 2) + ' ' + curve + ' ' + x2 + ' ' + nextY,
          class: 'tie'
        }, this.svg);
      }
    }

    setShowNames(show) {
      if (this.showNames === !!show) return;
      this.showNames = !!show;
      this.lastOptions.showNames = this.showNames;
      this.rerender();
    }

    setPlaying(ids) {
      this.playingIds = new Set(ids || []);
      this.lastOptions.playingIds = Array.from(this.playingIds);
      this.eventNodes.forEach((node, id) => {
        node.classList.toggle('is-playing', this.playingIds.has(id));
      });
    }

    setQuizTarget(id, status) {
      if (this.quizRing && this.quizRing.parentNode) this.quizRing.parentNode.removeChild(this.quizRing);
      this.quizRing = null;
      this.lastOptions.quizTargetId = id || null;
      this.lastOptions.quizStatus = status || null;
      if (!id) return;
      const geom = this.eventGeoms.get(id);
      if (!geom || geom.isRest || !geom.pitches.length) return;
      const space = geom.space;
      const cx = geom.x;
      const top = geom.noteYmin;
      const bottom = geom.noteYmax;
      const width = Math.max(1.32 * space, glyphWidth('noteheadBlack', space) + 0.5 * space);
      const ring = svgEl('ellipse', {
        cx,
        cy: (top + bottom) / 2,
        rx: width / 2 + 0.35 * space,
        ry: (bottom - top) / 2 + 0.6 * space,
        class: 'quiz-target-ring' + (status === 'correct' ? ' is-correct' : status === 'wrong' ? ' is-wrong' : '')
      }, this.svg);
      this.quizRing = ring;
    }

    clearQuizTarget() {
      if (this.quizRing && this.quizRing.parentNode) this.quizRing.parentNode.removeChild(this.quizRing);
      this.quizRing = null;
      this.lastOptions.quizTargetId = null;
      this.lastOptions.quizStatus = null;
    }

    clearPlaying() {
      this.setPlaying([]);
    }
  }

  window.ScoreRenderer = ScoreRenderer;
})();
