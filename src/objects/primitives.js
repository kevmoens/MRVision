import * as THREE from 'three';

/**
 * Small shared shape helpers so every object factory in defs/*.js stays
 * terse. Each object factory still owns its own choice of proportions and
 * colors -- these just cut boilerplate, they don't encode object identity.
 */
export function mesh(geometry, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, ...opts });
  return new THREE.Mesh(geometry, mat);
}

export function cyl(rTop, rBottom, h, color, segments = 16, opts = {}) {
  return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), color, opts);
}

export function box(w, h, d, color, opts = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), color, opts);
}

export function ball(r, color, segments = 12, opts = {}) {
  return mesh(new THREE.SphereGeometry(r, segments, Math.max(6, segments * 0.6)), color, opts);
}

export function cone(r, h, color, segments = 12, opts = {}) {
  return mesh(new THREE.ConeGeometry(r, h, segments), color, opts);
}

export function torus(r, tube, color, segments = 16, opts = {}) {
  return mesh(new THREE.TorusGeometry(r, tube, 8, segments), color, opts);
}

/** A cluster of small low-poly lumps -- used for cheese curds / nachos / chicken-wings-pile type props. */
export function lumpCluster(count, radiusRange, color, spread) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const r = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    const lump = ball(r, color, 6);
    lump.geometry.scale(1, 0.75 + Math.random() * 0.3, 1);
    lump.position.set(
      (Math.random() - 0.5) * spread,
      r * 0.6,
      (Math.random() - 0.5) * spread
    );
    lump.rotation.y = Math.random() * Math.PI;
    group.add(lump);
  }
  return group;
}
