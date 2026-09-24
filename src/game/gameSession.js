import { selectRound } from './selectRound.js';
import { FIXED_ROUND_ORDER, RoundTypeRegistry } from './roundTypeRegistry.js';

/**
 * Plain state container for one 10-round game. roundRunner.js drives it
 * directly (beginRound -> submitPick -> advanceRound per round) and owns
 * all rendering side effects -- there's no separate pub/sub layer since
 * one module (roundRunner) is both the game-logic conductor and the only
 * consumer of these state transitions.
 */
export class GameSession {
  constructor({ content, persistedHistory, playerCount = 1 }) {
    this.content = content;
    this.persistedHistory = persistedHistory;
    this.playerCount = playerCount;
    this.roundIndex = 0;
    this.rounds = [];
    this.sessionObjectHistory = new Map(); // objectId -> objectDef, for the finale replay
    this.punchlineUsageThisGame = new Map();
    this.revealInteractionsUsedThisGame = new Set();
    this.jokeIdsUsedThisGame = new Set();
    this.eyeAccidentallyHitClueCount = 0;
    this.eventsUsedThisGame = new Set();
    this.wrongStreakCount = 0;
  }

  get currentPlayerIndex() {
    return this.playerCount > 1 ? this.roundIndex % this.playerCount : 0;
  }

  get currentRoundTypeDef() {
    return RoundTypeRegistry.get(FIXED_ROUND_ORDER[this.roundIndex]);
  }

  get isLastRound() {
    return this.roundIndex === FIXED_ROUND_ORDER.length - 1;
  }

  get isHalftimeSeam() {
    // Between round 5 (index 4) and round 6 (index 5).
    return this.roundIndex === 5;
  }

  beginRound() {
    const roundTypeDef = this.currentRoundTypeDef;
    const setup = selectRound(roundTypeDef, this.content, this);
    for (const o of setup.pool) this.sessionObjectHistory.set(o.id, o);
    this.sessionObjectHistory.set(setup.punchlineTarget.id, setup.punchlineTarget);
    const record = {
      roundIndex: this.roundIndex,
      roundTypeId: roundTypeDef.id,
      setup,
      playerPickInstanceId: null,
      outcome: 'pending',
    };
    this.rounds.push(record);
    return record;
  }

  /** Classifies the player's pick as correct (hit the secret Clue Target) or wrong, and records it. */
  submitPick(instanceId) {
    const record = this.rounds[this.roundIndex];
    const setup = record.setup;
    record.playerPickInstanceId = instanceId;
    const pickedInstance = setup.placements.find((p) => p.instanceId === instanceId) || null;
    const pickedObjectId = pickedInstance ? pickedInstance.objectId : null;
    const isClueHit = pickedObjectId != null && pickedObjectId === setup.clueTarget.id;
    record.outcome = isClueHit ? 'correct-then-invalidated' : 'wrong';
    record.pickedInstance = pickedInstance;
    this.wrongStreakCount += 1;
    return record;
  }

  advanceRound() {
    this.roundIndex += 1;
  }
}
