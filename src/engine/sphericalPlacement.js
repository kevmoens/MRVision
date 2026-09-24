import * as THREE from 'three';

/**
 * Every object's authored position is a spherical slot relative to the
 * player's start heading: { azimuthDeg, elevationDeg, distanceM }.
 * azimuthDeg: 0 = straight ahead at session start, 90 = to the right,
 * 180 = directly behind, 270/-90 = to the left.
 * elevationDeg: 0 = eye height, positive = up, negative = down.
 * This is the single placement representation shared by all three
 * render tiers (Tier A converts it to a world-space anchor-relative
 * offset once at spawn time; Tier B/C use it directly every frame
 * since their camera never translates).
 */
export function sphericalToCartesian({ azimuthDeg, elevationDeg, distanceM }) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const horizontalDist = distanceM * Math.cos(el);
  const x = horizontalDist * Math.sin(az);
  const z = -horizontalDist * Math.cos(az);
  const y = distanceM * Math.sin(el);
  return new THREE.Vector3(x, y, z);
}

/**
 * Parents object3D under worldRoot and positions it at the given spherical
 * slot. Identical across all three render tiers -- worldRoot itself is what
 * differs per tier (an AR anchor pose for Tier A, identity/origin for Tier
 * B and C), so authoring a round's object layout never needs to know which
 * tier is active.
 */
export function placeInWorld(worldRoot, object3D, spherical) {
  object3D.position.copy(sphericalToCartesian(spherical));
  worldRoot.add(object3D);
  return object3D;
}
