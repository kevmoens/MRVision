export function angularDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function randomAzimuthAvoiding(usedAzimuths, minSeparation = 25) {
  for (let i = 0; i < 20; i++) {
    const az = Math.random() * 360 - 180;
    if (usedAzimuths.every((u) => angularDist(u, az) > minSeparation)) return az;
  }
  return Math.random() * 360 - 180;
}

/**
 * Converts a round's selected object pool (+ clue/punchline/duplicate info)
 * into concrete spherical placements (see engine/sphericalPlacement.js for
 * why spherical-relative-to-player-start is the shared representation
 * across all three render tiers). Motion/giant flags are hints the
 * renderer's reveal choreography consumes; this module only decides WHERE
 * things start, not how they animate frame-to-frame.
 */
export function computePlacements({ roundTypeDef, pool, punchlineTarget, duplicateObject, duplicateCount, specialEvent }) {
  const instances = [];
  const usedAz = [];
  let counter = 0;

  function addInstance(objectDef, sphericalOverride, extra = {}) {
    const spherical = sphericalOverride || {
      azimuthDeg: randomAzimuthAvoiding(usedAz),
      elevationDeg: -5 + Math.random() * 15,
      distanceM: 1.4 + Math.random() * 1.6,
    };
    usedAz.push(spherical.azimuthDeg);
    const instance = {
      instanceId: `i${counter++}`,
      objectId: objectDef.id,
      spherical,
      isGiant: !!extra.isGiant,
      motion: extra.motion || 'static',
    };
    instances.push(instance);
    return instance;
  }

  if (roundTypeDef.id === 'too-many-of-them' && duplicateObject) {
    for (let i = 0; i < duplicateCount; i++) addInstance(duplicateObject);
  }

  for (const obj of pool) {
    if (roundTypeDef.id === 'too-many-of-them' && duplicateObject && obj.id === duplicateObject.id) continue;

    let sphericalOverride = null;
    let motion = 'static';
    const isGiant = (specialEvent === 'giantPigeon' && obj.id === 'pigeon') || false;
    const isPunchline = punchlineTarget && obj.id === punchlineTarget.id;

    if (isPunchline) {
      if (roundTypeDef.constraints.punchlineMustBePlaceableBehindPlayer) {
        const mag = 120 + Math.random() * 60; // 120-180 degrees off center
        sphericalOverride = {
          azimuthDeg: Math.random() < 0.5 ? mag : -mag,
          elevationDeg: 0,
          distanceM: 1.8 + Math.random() * 1.2,
        };
      }
      if (roundTypeDef.constraints.punchlineMustSupportFlyIn && obj.placement.canFlyIn) motion = 'fly-in';
      else if (roundTypeDef.constraints.punchlineMustSupportFlyIn && obj.placement.canDropFromAbove) motion = 'drop-in';
      else if (roundTypeDef.constraints.punchlineMustSupportFlyIn && obj.placement.canRollIn) motion = 'roll-in';
      if (roundTypeDef.constraints.punchlineMustSupportInvadeCamera) motion = 'invade-camera';
    }

    if (roundTypeDef.id === 'total-chaos' && obj.placement.canOrbit) motion = 'orbit';

    addInstance(obj, sphericalOverride, { motion, isGiant });
  }

  // Forced punchlines (e.g. the "nothing" sentinel, or "cooler" forced by
  // beerEmergency) may not have been part of `pool` -- make sure they're
  // always placed somewhere so the reveal has something to point at.
  if (punchlineTarget && !instances.some((i) => i.objectId === punchlineTarget.id)) {
    const behind = roundTypeDef.constraints.punchlineMustBePlaceableBehindPlayer;
    const sphericalOverride = behind
      ? { azimuthDeg: Math.random() < 0.5 ? 150 : -150, elevationDeg: 0, distanceM: 2 }
      : null;
    addInstance(punchlineTarget, sphericalOverride, {});
  }

  return instances;
}
