import * as THREE from 'three';
import { cyl, ball, cone } from '../primitives.js';

function buildRivalFan() {
  const g = new THREE.Group();
  const torso = cyl(0.2, 0.22, 0.55, 0x6a1b9a, 10);
  torso.position.y = 0.85;
  g.add(torso);
  const head = ball(0.15, 0xdca383, 14);
  head.position.y = 1.25;
  g.add(head);
  const cap = cone(0.16, 0.1, 0xffb300, 10);
  cap.position.y = 1.38;
  g.add(cap);
  const brim = cyl(0.18, 0.18, 0.02, 0xffb300, 10);
  brim.position.y = 1.32;
  g.add(brim);
  return g;
}

export default [{ id: 'rival-fan', build: buildRivalFan, colliderRadius: 0.4, animHint: 'none' }];
