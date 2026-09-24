import * as THREE from 'three';
import { cyl, box, ball, cone } from '../primitives.js';

function buildFootball() {
  const g = new THREE.Group();
  const body = ball(0.14, 0x8b4513, 14);
  body.scale.set(1, 0.62, 0.62);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (let i = -1; i <= 1; i++) {
    const lace = box(0.012, 0.01, 0.05, 0xffffff);
    lace.position.set(i * 0.03, 0.086, 0);
    g.add(lace);
  }
  return g;
}

function buildFoamFinger() {
  const g = new THREE.Group();
  const hand = box(0.09, 0.32, 0.05, 0xffcc00);
  hand.position.y = 0.16;
  g.add(hand);
  const finger = cyl(0.035, 0.035, 0.22, 0xffcc00, 10);
  finger.position.y = 0.42;
  g.add(finger);
  return g;
}

function buildCheesehead() {
  const g = new THREE.Group();
  const base = box(0.24, 0.2, 0.18, 0xf4d35e, { roughness: 0.9 });
  base.position.y = 0.15;
  g.add(base);
  for (let i = 0; i < 6; i++) {
    const bump = ball(0.045, 0xf4d35e, 6, { roughness: 0.9 });
    bump.position.set((Math.random() - 0.5) * 0.2, 0.25 + Math.random() * 0.04, (Math.random() - 0.5) * 0.16);
    g.add(bump);
  }
  return g;
}

function buildTrophy() {
  const g = new THREE.Group();
  const base = cyl(0.06, 0.07, 0.03, 0x8a6d1f, 12, { metalness: 0.6, roughness: 0.3 });
  g.add(base);
  const stem = cyl(0.012, 0.012, 0.12, 0xd4af37, 10, { metalness: 0.8, roughness: 0.2 });
  stem.position.y = 0.09;
  g.add(stem);
  const cup = cyl(0.05, 0.03, 0.1, 0xd4af37, 12, { metalness: 0.8, roughness: 0.2 });
  cup.position.y = 0.2;
  g.add(cup);
  return g;
}

function buildInflatableFootball() {
  const g = buildFootball();
  g.scale.setScalar(2.6);
  g.traverse((c) => {
    if (c.material) c.material = c.material.clone();
    if (c.material) c.material.roughness = 0.15;
  });
  return g;
}

function buildMegaphone() {
  const g = new THREE.Group();
  const bell = cone(0.11, 0.24, 0xff4d4d, 16);
  bell.rotation.z = -Math.PI / 2;
  bell.position.x = 0.1;
  g.add(bell);
  const handle = cyl(0.015, 0.015, 0.1, 0x222222, 8);
  handle.position.set(-0.02, -0.09, 0);
  g.add(handle);
  return g;
}

export default [
  { id: 'football', build: buildFootball, colliderRadius: 0.16, animHint: 'spin' },
  { id: 'foam-finger', build: buildFoamFinger, colliderRadius: 0.2, animHint: 'none' },
  { id: 'cheesehead', build: buildCheesehead, colliderRadius: 0.2, animHint: 'none' },
  { id: 'trophy', build: buildTrophy, colliderRadius: 0.14, animHint: 'none' },
  { id: 'inflatable-football', build: buildInflatableFootball, colliderRadius: 0.42, animHint: 'none' },
  { id: 'megaphone', build: buildMegaphone, colliderRadius: 0.18, animHint: 'none' },
];
