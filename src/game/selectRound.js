import { ShuffleBag, weightFor, weightedRandomPick } from './history.js';
import { EyeHeadPatterns, SpecialEventRegistry } from './roundTypeRegistry.js';
import { computePlacements } from './placement.js';

const MAX_RETRIES = 30;

export function createGameContent({ objectsData, jokesData, persistedHistory }) {
  const objectsById = new Map(objectsData.objects.map((o) => [o.id, o]));
  const bags = new Map();

  function bag(key, items) {
    if (!bags.has(key)) bags.set(key, new ShuffleBag(items));
    return bags.get(key);
  }

  function drawWrong(tier) {
    return bag(`wrong-${tier}`, jokesData.genericPools.wrong[tier]).draw();
  }
  function drawFakeHint() {
    return bag('fakeHints', jokesData.genericPools.fakeHints).draw();
  }
  function drawCorrectStage1() {
    return bag('cs1', jokesData.genericPools.correctStage1).draw();
  }
  function drawCorrectStage2() {
    return bag('cs2', jokesData.genericPools.correctStage2Invalidated).draw();
  }
  function drawProximity(tier) {
    return bag(`prox-${tier}`, jokesData.genericPools.proximityMiss[tier]).draw();
  }
  function drawMultiplayerVerdict() {
    return bag('mpVerdict', jokesData.genericPools.multiplayerVerdict).draw();
  }
  function drawRoundFlavor(roundTypeId) {
    const pool = jokesData.roundFlavor[roundTypeId];
    return pool && pool.length ? bag(`rf-${roundTypeId}`, pool).draw() : null;
  }
  function drawEventFlavor(eventId) {
    const pool = jokesData.specialEventFlavor[eventId];
    return pool && pool.length ? bag(`ef-${eventId}`, pool).draw() : null;
  }
  function drawObjectJoke(objectId) {
    const pool = jokesData.objectJokePools[objectId];
    if (pool && pool.length) return bag(`obj-${objectId}`, pool).draw();
    const obj = objectsById.get(objectId);
    const catPool = obj && jokesData.categoryJokeFallback[obj.category];
    if (catPool && catPool.length) return bag(`cat-${obj.category}`, catPool).draw();
    return drawWrong('mid');
  }

  function eligibleObjects(filterFn) {
    return objectsData.objects.filter((o) => o.weight > 0 && o.id !== 'nothing' && (!filterFn || filterFn(o)));
  }

  function weightedSample(pool, count) {
    const keyed = pool.map((o) => {
      const w = Math.max(0.05, weightFor(persistedHistory, 'objects', o.id) * o.weight);
      return { o, key: Math.pow(Math.random(), 1 / w) };
    });
    keyed.sort((a, b) => b.key - a.key);
    return keyed.slice(0, Math.min(count, keyed.length)).map((k) => k.o);
  }

  return {
    objectsById,
    drawWrong,
    drawFakeHint,
    drawCorrectStage1,
    drawCorrectStage2,
    drawProximity,
    drawMultiplayerVerdict,
    drawRoundFlavor,
    drawEventFlavor,
    drawObjectJoke,
    eligibleObjects,
    weightedSample,
  };
}

export function wrongTierForRoundIndex(roundIndex) {
  if (roundIndex < 3) return 'early';
  if (roundIndex < 7) return 'mid';
  return 'late';
}

function maybeApplySpecialEvent(roundTypeDef, pool, gameState) {
  if (!roundTypeDef.eligibleSpecialEvents.length) return null;
  const candidates = roundTypeDef.eligibleSpecialEvents
    .map((id) => SpecialEventRegistry.get(id))
    .filter((e) => e && !gameState.eventsUsedThisGame.has(e.id));
  for (const event of candidates) {
    if (event.requiresObjectAffinity) {
      const hasAffinity = pool.some((o) => o.specialEventAffinities?.[event.requiresObjectAffinity]?.eligible);
      if (!hasAffinity) continue;
    }
    if (Math.random() < event.baseChance) {
      gameState.eventsUsedThisGame.add(event.id);
      return event.id;
    }
  }
  return null;
}

/**
 * The per-round selection pipeline: draw eligible objects -> pick Clue
 * Target -> pick a different Punchline Target (weighted against this-game
 * dominance) -> resolve eye/head targets (hard-rejecting any resolution
 * that equals the Punchline Target, capping how often eyes/head are
 * allowed to accidentally land on the Clue Target across a game) -> maybe
 * apply a special event -> draw jokes -> commit. Wrapped in a bounded
 * retry loop so any constraint violation just rerolls the round.
 */
export function selectRound(roundTypeDef, content, gameState) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const eligible = content.eligibleObjects();
    const [minC, maxC] = roundTypeDef.objectCountRange;
    const count = minC + Math.floor(Math.random() * (maxC - minC + 1));
    let pool = content.weightedSample(eligible, count);

    if (roundTypeDef.constraints.requiresSecondMattSlot && !pool.some((o) => o.id === 'another-matt')) {
      pool = [...pool.slice(0, -1), content.objectsById.get('another-matt')];
    }
    if (roundTypeDef.constraints.requiresDuplicateCapableObject && !pool.some((o) => o.placement.canDuplicate)) continue;
    if (roundTypeDef.constraints.punchlineMustSupportFlyIn && !pool.some((o) => o.placement.canFlyIn || o.placement.canDropFromAbove || o.placement.canRollIn)) continue;
    if (roundTypeDef.constraints.punchlineMustSupportInvadeCamera && !pool.some((o) => o.placement.canInvadeCamera)) continue;
    if (roundTypeDef.constraints.requiresOrbitCapableObjects && pool.filter((o) => o.placement.canOrbit).length < 3) continue;

    const clueTarget = pool[Math.floor(Math.random() * pool.length)];

    const specialEvent = maybeApplySpecialEvent(roundTypeDef, pool, gameState);

    let punchlineTarget;
    if (specialEvent === 'nothingEvent') {
      punchlineTarget = content.objectsById.get('nothing');
    } else if (specialEvent === 'beerEmergency') {
      punchlineTarget = content.objectsById.get('cooler');
    } else {
      let candidates = pool.filter((o) => o.id !== clueTarget.id);
      if (roundTypeDef.constraints.punchlineMustBePlaceableBehindPlayer) candidates = candidates.filter((o) => o.placement.canAppearBehindPlayer);
      if (roundTypeDef.constraints.punchlineMustSupportFlyIn) candidates = candidates.filter((o) => o.placement.canFlyIn || o.placement.canDropFromAbove || o.placement.canRollIn);
      if (roundTypeDef.constraints.punchlineMustSupportInvadeCamera) candidates = candidates.filter((o) => o.placement.canInvadeCamera);
      if (candidates.length === 0) continue;
      punchlineTarget = weightedRandomPick(candidates, (o) => {
        const dominance = gameState.punchlineUsageThisGame.get(o.id) || 0;
        return 1 / (1 + dominance * 2);
      });
    }

    if (punchlineTarget.id === clueTarget.id) continue;

    const patternFn = EyeHeadPatterns[roundTypeDef.eyeHeadPattern];
    const resolved = patternFn({ pool, punchlineId: punchlineTarget.id, clueId: clueTarget.id });
    const gazeIds = [resolved.leftEyeTargetId, resolved.rightEyeTargetId, resolved.headTargetId];
    if (gazeIds.includes(punchlineTarget.id) && resolved.trackPunchlineWithEye == null) continue;

    const accidentallyHitsClue = gazeIds.includes(clueTarget.id);
    if (accidentallyHitsClue && gameState.eyeAccidentallyHitClueCount >= 2) continue;

    const revealInteraction = roundTypeDef.revealInteractionId;

    let duplicateObject = null;
    let duplicateCount = 0;
    if (roundTypeDef.id === 'too-many-of-them') {
      const dupCandidates = pool.filter((o) => o.placement.canDuplicate && o.id !== punchlineTarget.id);
      duplicateObject = dupCandidates[Math.floor(Math.random() * dupCandidates.length)] || pool.find((o) => o.placement.canDuplicate);
      duplicateCount = Math.min(duplicateObject.placement.maxDuplicates || 6, 8);
    }

    const wrongTier = wrongTierForRoundIndex(gameState.roundIndex);
    let joke = content.drawObjectJoke(punchlineTarget.id);
    if (gameState.jokeIdsUsedThisGame.has(joke.id)) joke = content.drawWrong(wrongTier);
    if (gameState.jokeIdsUsedThisGame.has(joke.id)) continue;

    const fakeHint = roundTypeDef.id !== 'impossible-finale' ? content.drawFakeHint() : null;
    if (fakeHint && gameState.jokeIdsUsedThisGame.has(fakeHint.id)) continue;

    const roundFlavor = content.drawRoundFlavor(roundTypeDef.id);
    const eventFlavor = specialEvent ? content.drawEventFlavor(specialEvent) : null;

    const placements = computePlacements({ roundTypeDef, pool, punchlineTarget, duplicateObject, duplicateCount, specialEvent });

    gameState.punchlineUsageThisGame.set(punchlineTarget.id, (gameState.punchlineUsageThisGame.get(punchlineTarget.id) || 0) + 1);
    gameState.revealInteractionsUsedThisGame.add(revealInteraction);
    gameState.jokeIdsUsedThisGame.add(joke.id);
    if (fakeHint) gameState.jokeIdsUsedThisGame.add(fakeHint.id);
    if (accidentallyHitsClue) gameState.eyeAccidentallyHitClueCount++;

    return {
      roundTypeId: roundTypeDef.id,
      pool,
      placements,
      clueTarget,
      punchlineTarget,
      duplicateObject,
      duplicateCount,
      leftEyeTargetId: resolved.leftEyeTargetId,
      rightEyeTargetId: resolved.rightEyeTargetId,
      headTargetId: resolved.headTargetId,
      midRoundRetarget: resolved.midRoundRetarget || null,
      trackPunchlineWithEye: resolved.trackPunchlineWithEye || null,
      specialEvent,
      revealInteraction,
      joke,
      fakeHint,
      roundFlavor,
      eventFlavor,
    };
  }
  throw new Error(`selectRound: exhausted retries for ${roundTypeDef.id}`);
}
