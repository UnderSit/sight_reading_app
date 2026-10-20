const RH_LOW = 60;
const MIN_GAP = 3;
const MAX_SPAN = 12;

type VoiceAssignment = {
  movement: number;
  mapping: (number | null)[];
};

type ScoredVoicing = {
  lower: number[];
  score: number;
  parallels: number;
};

export interface InnerVoiceOptions {
  melody: number;
  chordPcs: number[];
  previous: number[] | null;
  voices: number;
  final: boolean;
}

export interface InnerVoiceChoice {
  lower: number[];
  score: number;
}

function isPerfect(interval: number): boolean {
  const simple = Math.abs(interval) % 12;
  return simple === 0 || simple === 7;
}

function candidatesForCount(melody: number, chordPcs: number[], count: number): number[][] {
  const pcs = new Set(chordPcs);
  const high = melody - MIN_GAP;
  if (high < RH_LOW) return [];
  const tones: number[] = [];
  for (let midi = RH_LOW; midi <= high; midi += 1) {
    if (pcs.has(midi % 12)) tones.push(midi);
  }

  if (count <= 1) return tones.map((tone) => [tone]);

  const pairs: number[][] = [];
  for (let lowIndex = 0; lowIndex < tones.length; lowIndex += 1) {
    for (let highIndex = lowIndex + 1; highIndex < tones.length; highIndex += 1) {
      const low = tones[lowIndex];
      const highTone = tones[highIndex];
      if (highTone - low < MIN_GAP) continue;
      if (melody - low > MAX_SPAN) continue;
      pairs.push([low, highTone]);
    }
  }
  return pairs;
}

function assignmentFor(previous: number[] | null, current: number[]): VoiceAssignment {
  if (previous === null || previous.length === 0) {
    return { movement: 0, mapping: current.map(() => null) };
  }
  const previousInner = previous.slice(0, -1);
  if (previousInner.length === 0) {
    return { movement: 0, mapping: current.map(() => null) };
  }

  if (current.length === 1 && previousInner.length === 1) {
    return {
      movement: Math.abs(current[0] - previousInner[0]),
      mapping: [0],
    };
  }
  if (current.length === 1) {
    const low = Math.abs(current[0] - previousInner[0]);
    const high = Math.abs(current[0] - previousInner[1]);
    return {
      movement: Math.min(low, high),
      mapping: [low <= high ? 0 : 1],
    };
  }
  if (previousInner.length === 1) {
    const low = Math.abs(current[0] - previousInner[0]);
    const high = Math.abs(current[1] - previousInner[0]);
    return {
      movement: Math.min(low, high),
      mapping: low <= high ? [0, null] : [null, 0],
    };
  }
  return {
    movement: Math.abs(current[0] - previousInner[0]) + Math.abs(current[1] - previousInner[1]),
    mapping: [0, 1],
  };
}

function parallelCount(previous: number[] | null, current: number[]): number {
  if (previous === null || previous.length < 2) return 0;
  const previousInner = previous.slice(0, -1);
  const currentInner = current.slice(0, -1);
  const assignment = assignmentFor(previous, currentInner);
  const tracks: { previous: number; current: number }[] = [
    {
      previous: previous[previous.length - 1],
      current: current[current.length - 1],
    },
  ];
  assignment.mapping.forEach((previousIndex, currentIndex) => {
    if (previousIndex === null) return;
    tracks.push({
      previous: previousInner[previousIndex],
      current: currentInner[currentIndex],
    });
  });

  let parallels = 0;
  for (let first = 0; first < tracks.length; first += 1) {
    for (let second = first + 1; second < tracks.length; second += 1) {
      const firstMotion = tracks[first].current - tracks[first].previous;
      const secondMotion = tracks[second].current - tracks[second].previous;
      if (firstMotion === 0 || secondMotion === 0) continue;
      if (Math.sign(firstMotion) !== Math.sign(secondMotion)) continue;
      const previousInterval = Math.abs(tracks[first].previous - tracks[second].previous);
      const currentInterval = Math.abs(tracks[first].current - tracks[second].current);
      if (isPerfect(previousInterval) && isPerfect(currentInterval)) parallels += 1;
    }
  }
  return parallels;
}

function scoreVoicing(previous: number[] | null, current: number[], final: boolean): ScoredVoicing {
  const melody = current[current.length - 1];
  const lower = current.slice(0, -1);
  let score = 0;
  const assignment = assignmentFor(previous, lower);
  score -= assignment.movement * 1.15;

  assignment.mapping.forEach((previousIndex, index) => {
    if (previous === null || previousIndex === null) {
      score -= 0.9;
      return;
    }
    const movement = Math.abs(lower[index] - previous.slice(0, -1)[previousIndex]);
    if (movement === 0) score += 0.5;
    else if (movement <= 2) score += 0.2;
    else if (movement > 5) score -= (movement - 5) * 0.9;
  });

  if (previous === null) {
    const top = lower[lower.length - 1];
    score -= Math.max(0, melody - top - 6) * 0.35;
    if (lower.length === 2) score -= (top - lower[0]) * 0.12;
  }

  const distinctPcs = new Set(current.map((pitch) => pitch % 12));
  score += distinctPcs.size * 0.45;
  if (final) {
    score += distinctPcs.size * 0.8;
    if (lower.length === 2) score += 1.2;
  }

  const parallels = parallelCount(previous, current);
  score -= parallels * 18;
  return { lower, score, parallels };
}

function bestScored(scored: ScoredVoicing[]): ScoredVoicing {
  let best = scored[0];
  for (const candidate of scored.slice(1)) {
    if (
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.lower.join(",") < best.lower.join(","))
    ) {
      best = candidate;
    }
  }
  return best;
}

export function chooseInnerVoices(options: InnerVoiceOptions): InnerVoiceChoice | null {
  const { melody, chordPcs, previous, voices, final } = options;
  const counts = voices >= 2 ? [2, 1] : [1];
  const fallback: ScoredVoicing[] = [];
  for (const count of counts) {
    const candidates = candidatesForCount(melody, chordPcs, count);
    if (candidates.length === 0) continue;
    const scored = candidates.map((lower) =>
      scoreVoicing(previous, [...lower, melody], final),
    );
    const clean = scored.filter((candidate) => candidate.parallels === 0);
    if (clean.length > 0) {
      const best = bestScored(clean);
      return { lower: best.lower, score: best.score };
    }
    fallback.push(...scored);
  }
  if (fallback.length === 0) return null;
  const best = bestScored(fallback);
  if (best.parallels > 0) return null;
  return { lower: best.lower, score: best.score };
}
