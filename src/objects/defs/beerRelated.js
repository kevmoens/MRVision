import * as THREE from 'three';
import { cyl, box } from '../primitives.js';

function buildBeer() {
  const g = new THREE.Group();
  const can = cyl(0.032, 0.032, 0.12, 0xc9ccd1, 16, { metalness: 0.6, roughness: 0.35 });
  can.position.y = 0.06;
  g.add(can);
  const label = cyl(0.0335, 0.0335, 0.045, 0xd4a017, 16);
  label.position.y = 0.06;
  g.add(label);
  const tab = cyl(0.028, 0.028, 0.004, 0xb8bcc2, 16, { metalness: 0.8, roughness: 0.2 });
  tab.position.y = 0.122;
  g.add(tab);
  return g;
}

function buildEmptyBeerCase() {
  const g = new THREE.Group();
  const box1 = box(0.32, 0.24, 0.24, 0xc0392b);
  box1.position.y = 0.12;
  g.add(box1);
  const flap = box(0.33, 0.03, 0.25, 0x922b21);
  flap.position.y = 0.24;
  flap.rotation.x = 0.3;
  g.add(flap);
  return g;
}

export default [
  { id: 'beer', build: buildBeer, colliderRadius: 0.14, animHint: 'none' },
  { id: 'empty-beer-case', build: buildEmptyBeerCase, colliderRadius: 0.24, animHint: 'none' },
];
