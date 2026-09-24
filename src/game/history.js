const STORAGE_KEY = 'mrv_history_v1';

/** Refill-and-reshuffle-when-empty bag -- no repeat until every item has been drawn once. */
export class ShuffleBag {
  constructor(items) {
    this.originalItems = items.slice();
    this.bag = [];
  }

  refill() {
    this.bag = this.originalItems.slice();
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  draw() {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop();
  }

  /** Draw `count` distinct items (skips items already returned in this call). */
  drawUnique(count) {
    const result = [];
    const seen = new Set();
    let attempts = 0;
    while (result.length < count && attempts < count * 20) {
      attempts++;
      const candidate = this.draw();
      const key = typeof candidate === 'object' ? candidate.id : candidate;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(candidate);
      }
    }
    return result;
  }
}

/** Linear-recovery weight: full weight after `recoverAfterSessions`, never below `floor`. */
export function historyWeight(lastUsedSession, currentSession, recoverAfterSessions = 6, floor = 0.15) {
  if (lastUsedSession == null) return 1.0;
  const sessionsAgo = currentSession - lastUsedSession;
  if (sessionsAgo >= recoverAfterSessions) return 1.0;
  const recovered = Math.max(0, sessionsAgo) / recoverAfterSessions;
  return floor + (1.0 - floor) * recovered;
}

export function weightedRandomPick(candidates, weightFn) {
  const weights = candidates.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function emptyHistory() {
  return {
    currentSessionNumber: 0,
    history: { objects: {}, jokes: {}, roundGimmicks: {}, specialEvents: {} },
  };
}

export function loadPersistedHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyHistory();
    const parsed = JSON.parse(raw);
    if (!parsed.history) return emptyHistory();
    return parsed;
  } catch {
    return emptyHistory();
  }
}

export function savePersistedHistory(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // best-effort -- private browsing / storage full is a non-fatal degradation
  }
}

/** Marks an id as used in `category` this session (objects | jokes | roundGimmicks | specialEvents). */
export function markUsed(persisted, category, id) {
  persisted.history[category][id] = { lastUsedSession: persisted.currentSessionNumber };
}

export function weightFor(persisted, category, id) {
  const entry = persisted.history[category][id];
  return historyWeight(entry ? entry.lastUsedSession : null, persisted.currentSessionNumber);
}

export function beginNewSession(persisted) {
  persisted.currentSessionNumber += 1;
  return persisted;
}
