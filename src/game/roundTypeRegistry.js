function pickExcluding(pool, excludeIds, rng = Math.random) {
  const candidates = pool.filter((o) => !excludeIds.includes(o.id));
  if (candidates.length === 0) return pool[Math.floor(rng() * pool.length)];
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Each pattern resolves left/right/head gaze targets from the round's
 * object pool. Patterns only encode WHICH objects each part targets --
 * the temporal texture ("slowly drifts", "suddenly changes") comes from
 * the optional `midRoundRetarget` a pattern can return, which roundRunner
 * applies partway through the round, plus per-part slerp speed already
 * baked into buildMatt (eyes fast/tight cone, head slower/wide cone).
 * Callers (selectRound.js) are responsible for rejecting any resolution
 * where a target equals the Punchline Target.
 */
export const EyeHeadPatterns = {
  'both-opposite': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const right = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id]);
    return { leftEyeTargetId: left.id, rightEyeTargetId: right.id, headTargetId: head.id };
  },
  'one-wandering': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    const driftTo = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, head.id]);
    return {
      leftEyeTargetId: left.id,
      rightEyeTargetId: left.id,
      headTargetId: head.id,
      midRoundRetarget: { part: 'rightEye', delaySec: 2.2, newTargetId: driftTo.id },
    };
  },
  'nearly-agreeing': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    return { leftEyeTargetId: left.id, rightEyeTargetId: left.id, headTargetId: head.id };
  },
  'head-unrelated': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const right = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id]);
    return { leftEyeTargetId: left.id, rightEyeTargetId: right.id, headTargetId: head.id };
  },
  'slow-drift': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const right = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id]);
    const driftTo = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id, head.id]);
    return {
      leftEyeTargetId: left.id,
      rightEyeTargetId: right.id,
      headTargetId: head.id,
      midRoundRetarget: { part: 'leftEye', delaySec: 3.2, newTargetId: driftTo.id },
    };
  },
  'sudden-change': (ctx) => {
    const left = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const right = pickExcluding(ctx.pool, [ctx.punchlineId, left.id]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id]);
    const suddenTo = pickExcluding(ctx.pool, [ctx.punchlineId, left.id, right.id, head.id]);
    return {
      leftEyeTargetId: left.id,
      rightEyeTargetId: right.id,
      headTargetId: head.id,
      midRoundRetarget: { part: 'leftEye', delaySec: 4.4, newTargetId: suddenTo.id },
    };
  },
  'one-tracks-moving': (ctx) => {
    const right = pickExcluding(ctx.pool, [ctx.punchlineId]);
    const head = pickExcluding(ctx.pool, [ctx.punchlineId, right.id]);
    return {
      leftEyeTargetId: ctx.punchlineId, // will be overridden every frame by trackPunchlineWithEye
      rightEyeTargetId: right.id,
      headTargetId: head.id,
      trackPunchlineWithEye: 'leftEye',
    };
  },
  'perfectly-aligned-fake': (ctx) => {
    const obvious = pickExcluding(ctx.pool, [ctx.punchlineId, ctx.clueId]);
    return {
      leftEyeTargetId: obvious.id,
      rightEyeTargetId: obvious.id,
      headTargetId: obvious.id,
    };
  },
};

export const FIXED_ROUND_ORDER = [
  'simple-misdirection',
  'object-behind-you',
  'object-moves',
  'too-many-of-them',
  'ramage-compass-tease',
  'object-invades-real-space',
  'another-matt',
  'fake-easy-round',
  'total-chaos',
  'impossible-finale',
];

/**
 * RoundTypeDefinition registry. Adding round #11 later is one new entry
 * here plus inserting its id into FIXED_ROUND_ORDER -- selectRound.js and
 * roundRunner.js are entirely driven by this data, no per-round branches.
 */
export const RoundTypeRegistry = new Map([
  ['simple-misdirection', {
    id: 'simple-misdirection',
    objectCountRange: [5, 5],
    eyeHeadPattern: 'both-opposite',
    revealInteractionId: 'basic-reveal',
    constraints: { punchlineMustBePlaceableBehindPlayer: true },
    eligibleSpecialEvents: [],
  }],
  ['object-behind-you', {
    id: 'object-behind-you',
    objectCountRange: [6, 8],
    eyeHeadPattern: 'head-unrelated',
    revealInteractionId: 'turn-around-arrow',
    constraints: { punchlineMustBePlaceableBehindPlayer: true },
    eligibleSpecialEvents: ['sunglassesMode', 'beerEmergency'],
  }],
  ['object-moves', {
    id: 'object-moves',
    objectCountRange: [5, 7],
    eyeHeadPattern: 'one-tracks-moving',
    revealInteractionId: 'object-flies-in',
    constraints: { punchlineMustSupportFlyIn: true },
    eligibleSpecialEvents: ['giantPigeon', 'sunglassesMode'],
  }],
  ['too-many-of-them', {
    id: 'too-many-of-them',
    objectCountRange: [6, 8],
    eyeHeadPattern: 'both-opposite',
    revealInteractionId: 'duplicate-lineup',
    constraints: { requiresDuplicateCapableObject: true },
    eligibleSpecialEvents: ['beerEmergency'],
  }],
  ['ramage-compass-tease', {
    id: 'ramage-compass-tease',
    objectCountRange: [5, 6],
    eyeHeadPattern: 'nearly-agreeing',
    revealInteractionId: 'compass-tease',
    constraints: {},
    eligibleSpecialEvents: [],
  }],
  ['object-invades-real-space', {
    id: 'object-invades-real-space',
    objectCountRange: [5, 7],
    eyeHeadPattern: 'slow-drift',
    revealInteractionId: 'camera-invasion',
    constraints: { punchlineMustSupportInvadeCamera: true },
    eligibleSpecialEvents: ['giantPigeon', 'sunglassesMode'],
  }],
  ['another-matt', {
    id: 'another-matt',
    objectCountRange: [5, 7],
    eyeHeadPattern: 'both-opposite',
    revealInteractionId: 'second-matt-reveal',
    constraints: { requiresSecondMattSlot: true },
    eligibleSpecialEvents: ['ramageception'],
  }],
  ['fake-easy-round', {
    id: 'fake-easy-round',
    objectCountRange: [5, 6],
    eyeHeadPattern: 'perfectly-aligned-fake',
    revealInteractionId: 'dramatic-pause',
    constraints: {},
    eligibleSpecialEvents: ['sunglassesMode'],
  }],
  ['total-chaos', {
    id: 'total-chaos',
    objectCountRange: [7, 8],
    eyeHeadPattern: 'sudden-change',
    revealInteractionId: 'freeze-frame-highlight',
    constraints: { requiresOrbitCapableObjects: true },
    eligibleSpecialEvents: ['giantPigeon', 'miniMatt', 'beerEmergency', 'nothingEvent'],
  }],
  ['impossible-finale', {
    id: 'impossible-finale',
    objectCountRange: [7, 8],
    eyeHeadPattern: 'sudden-change',
    revealInteractionId: 'grand-finale',
    constraints: { reuseSessionObjectsOnly: true },
    eligibleSpecialEvents: [],
  }],
]);

/**
 * Special random events layer onto a round's resolved setup rather than
 * being separate round types. Excluded entirely from rounds 1, 5, and 10
 * by those rounds' empty/limited eligibleSpecialEvents lists above.
 */
export const SpecialEventRegistry = new Map([
  ['sunglassesMode', {
    id: 'sunglassesMode',
    baseChance: 0.14,
    requiresObjectAffinity: null,
    apply: (setup) => ({ ...setup, sunglassesOn: true }),
  }],
  ['giantPigeon', {
    id: 'giantPigeon',
    baseChance: 0.1,
    requiresObjectAffinity: 'giantPigeon',
    apply: (setup) => ({ ...setup, giantPigeon: true }),
  }],
  ['beerEmergency', {
    id: 'beerEmergency',
    baseChance: 0.08,
    requiresObjectAffinity: 'beerEmergency',
    apply: (setup) => ({ ...setup, beerEmergency: true }),
  }],
  ['miniMatt', {
    id: 'miniMatt',
    baseChance: 0.1,
    requiresObjectAffinity: 'miniMatt',
    apply: (setup) => ({ ...setup, miniMatt: true }),
  }],
  ['ramageception', {
    id: 'ramageception',
    baseChance: 0.08,
    requiresObjectAffinity: 'ramageception',
    apply: (setup) => ({ ...setup, ramageception: true }),
  }],
  ['nothingEvent', {
    id: 'nothingEvent',
    baseChance: 0.08,
    requiresObjectAffinity: 'nothingEvent',
    apply: (setup) => ({ ...setup, nothingEvent: true }),
  }],
]);
