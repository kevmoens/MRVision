import * as THREE from 'three';
import { ball, cone, box, cyl } from '../primitives.js';

function buildPigeon() {
  const g = new THREE.Group();

  const body = ball(0.09, 0x8b8d8f, 12);
  body.scale.set(1, 0.75, 1.15);
  body.position.y = 0.13;
  g.add(body);

  const head = ball(0.045, 0x9a9c9e, 10);
  head.position.set(0, 0.21, 0.08);
  g.add(head);

  const beak = cone(0.012, 0.035, 0xe8a13c, 8);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.205, 0.125);
  g.add(beak);

  for (const side of [-1, 1]) {
    const wing = box(0.02, 0.1, 0.16, 0x6f7173);
    wing.position.set(side * 0.09, 0.13, -0.02);
    wing.rotation.z = side * 0.35;
    g.add(wing);
  }

  for (const side of [-1, 1]) {
    const leg = cyl(0.006, 0.006, 0.07, 0xe8a13c, 6);
    leg.position.set(side * 0.03, 0.045, 0.02);
    g.add(leg);
  }

  return g;
}

export default [{ id: 'pigeon', build: buildPigeon, colliderRadius: 0.16, animHint: 'bob' }];
