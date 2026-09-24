import * as THREE from 'three';
import { box, cyl, ball, cone } from '../primitives.js';

function buildCooler() {
  const g = new THREE.Group();
  const body = box(0.5, 0.35, 0.3, 0x1c6fd4);
  body.position.y = 0.2;
  g.add(body);
  const lid = box(0.53, 0.06, 0.32, 0xdfe6ee);
  lid.position.y = 0.41;
  g.add(lid);
  return g;
}

function buildSuspiciousCooler() {
  const g = buildCooler();
  g.traverse((c) => {
    if (c.material) {
      c.material = c.material.clone();
      c.material.color.set(0x555555);
    }
  });
  const tape = box(0.55, 0.03, 0.03, 0xd9c46a);
  tape.position.y = 0.41;
  g.add(tape);
  const sticker = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  );
  sticker.position.set(0.2, 0.2, 0.151);
  g.add(sticker);
  return g;
}

function buildLawnChair() {
  const g = new THREE.Group();
  const seat = box(0.45, 0.03, 0.45, 0x2f9e44);
  seat.position.y = 0.4;
  seat.rotation.x = -0.05;
  g.add(seat);
  const back = box(0.45, 0.55, 0.03, 0x2f9e44);
  back.position.set(0, 0.68, -0.2);
  back.rotation.x = -0.25;
  g.add(back);
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const leg = cyl(0.012, 0.012, 0.42, 0xaaaaaa, 6);
    leg.position.set(dx, 0.2, dz);
    g.add(leg);
  }
  return g;
}

function buildTVFootball() {
  const g = new THREE.Group();
  const frame = box(0.7, 0.42, 0.04, 0x111111);
  frame.position.y = 0.5;
  g.add(frame);
  const screen = box(0.64, 0.36, 0.01, 0x1a5e2e, { emissive: 0x0d3318, emissiveIntensity: 0.6 });
  screen.position.set(0, 0.5, 0.022);
  g.add(screen);
  const stand = box(0.16, 0.3, 0.1, 0x222222);
  stand.position.y = 0.15;
  g.add(stand);
  return g;
}

function buildSunglasses() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 16),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    lens.position.set(side * 0.045, 0, 0);
    g.add(lens);
    const arm = box(0.06, 0.01, 0.01, 0x111111);
    arm.position.set(side * 0.09, 0, -0.02);
    g.add(arm);
  }
  const bridge = box(0.02, 0.01, 0.01, 0x111111);
  g.add(bridge);
  return g;
}

function buildMicrophone() {
  const g = new THREE.Group();
  const head = ball(0.045, 0x1a1a1a, 10);
  head.position.y = 0.24;
  g.add(head);
  const handle = cyl(0.018, 0.018, 0.2, 0x333333, 10);
  handle.position.y = 0.12;
  g.add(handle);
  return g;
}

function buildCardboardBox() {
  const g = new THREE.Group();
  const body = box(0.4, 0.35, 0.4, 0xc19a6b);
  body.position.y = 0.175;
  g.add(body);
  const flapL = box(0.4, 0.03, 0.2, 0xa87f4d);
  flapL.position.set(0, 0.355, -0.1);
  flapL.rotation.x = 0.5;
  g.add(flapL);
  const flapR = flapL.clone();
  flapR.position.z = 0.1;
  flapR.rotation.x = -0.5;
  g.add(flapR);
  return g;
}

function buildRandomSock() {
  const g = new THREE.Group();
  const tube = cyl(0.025, 0.025, 0.16, 0xdddddd, 10);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, 0.03, 0);
  g.add(tube);
  const foot = ball(0.028, 0xdddddd, 8);
  foot.scale.set(1.4, 0.9, 0.9);
  foot.position.set(-0.09, 0.02, 0);
  g.add(foot);
  const stripe = cyl(0.027, 0.027, 0.025, 0xff4d4d, 10);
  stripe.rotation.z = Math.PI / 2;
  stripe.position.set(0.06, 0.03, 0);
  g.add(stripe);
  return g;
}

function buildGrillTongs() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = box(0.015, 0.28, 0.02, 0xbfbfbf, { metalness: 0.7, roughness: 0.3 });
    arm.position.set(side * 0.015, 0.14, 0);
    arm.rotation.z = side * 0.08;
    g.add(arm);
  }
  return g;
}

function buildFoldingChair() {
  const g = new THREE.Group();
  const seat = box(0.4, 0.02, 0.4, 0x2255aa);
  seat.position.y = 0.45;
  g.add(seat);
  const back = box(0.4, 0.5, 0.02, 0x2255aa);
  back.position.set(0, 0.7, -0.19);
  g.add(back);
  for (const [dx, dz, h, y] of [
    [-0.18, -0.18, 0.45, 0.22],
    [0.18, -0.18, 0.45, 0.22],
    [-0.18, 0.18, 0.45, 0.22],
    [0.18, 0.18, 0.45, 0.22],
  ]) {
    const leg = cyl(0.012, 0.012, h, 0x888888, 6);
    leg.position.set(dx, y, dz);
    g.add(leg);
  }
  return g;
}

function buildCornholeBag() {
  const g = new THREE.Group();
  const bag = box(0.15, 0.03, 0.15, 0x2255aa, { roughness: 0.9 });
  g.add(bag);
  return g;
}

export default [
  { id: 'cooler', build: buildCooler, colliderRadius: 0.35, animHint: 'none' },
  { id: 'suspicious-cooler', build: buildSuspiciousCooler, colliderRadius: 0.35, animHint: 'none' },
  { id: 'lawn-chair', build: buildLawnChair, colliderRadius: 0.4, animHint: 'none' },
  { id: 'tv-football', build: buildTVFootball, colliderRadius: 0.45, animHint: 'none' },
  { id: 'sunglasses', build: buildSunglasses, colliderRadius: 0.15, animHint: 'none' },
  { id: 'microphone', build: buildMicrophone, colliderRadius: 0.16, animHint: 'none' },
  { id: 'cardboard-box', build: buildCardboardBox, colliderRadius: 0.3, animHint: 'none' },
  { id: 'random-sock', build: buildRandomSock, colliderRadius: 0.15, animHint: 'none' },
  { id: 'grill-tongs', build: buildGrillTongs, colliderRadius: 0.18, animHint: 'none' },
  { id: 'folding-chair', build: buildFoldingChair, colliderRadius: 0.4, animHint: 'none' },
  { id: 'cornhole-bag', build: buildCornholeBag, colliderRadius: 0.15, animHint: 'none' },
];
