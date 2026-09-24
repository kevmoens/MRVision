import * as THREE from 'three';
import { box, cyl } from '../primitives.js';

function buildPortaPotty() {
  const g = new THREE.Group();
  const body = box(0.9, 2.2, 0.9, 0x1f5fa8);
  body.position.y = 1.1;
  g.add(body);

  const door = box(0.5, 1.7, 0.02, 0x18497f);
  door.position.set(0, 0.95, 0.46);
  g.add(door);
  const doorOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(door.geometry),
    new THREE.LineBasicMaterial({ color: 0x0a2c4d })
  );
  doorOutline.position.copy(door.position);
  g.add(doorOutline);

  const vent = cyl(0.05, 0.05, 0.12, 0x888888, 10);
  vent.position.set(0.3, 2.28, 0);
  g.add(vent);
  return g;
}

function buildGrill() {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.4, roughness: 0.5 })
  );
  dome.position.y = 0.75;
  g.add(dome);
  const bowl = cyl(0.26, 0.22, 0.16, 0x2a2a2a, 16, { metalness: 0.4, roughness: 0.5 });
  bowl.position.y = 0.6;
  g.add(bowl);
  for (const dx of [-0.15, 0.15]) {
    for (const dz of [-0.15, 0.15]) {
      const leg = cyl(0.015, 0.015, 0.5, 0x1a1a1a, 6);
      leg.position.set(dx, 0.25, dz);
      g.add(leg);
    }
  }
  return g;
}

function buildParkingCone() {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xff6a1a })
  );
  cone.position.y = 0.22;
  g.add(cone);
  const stripe = cyl(0.1, 0.1, 0.05, 0xffffff, 12);
  stripe.position.y = 0.3;
  g.add(stripe);
  const base = cyl(0.17, 0.19, 0.03, 0xff6a1a, 12);
  g.add(base);
  return g;
}

function buildTailgateTable() {
  const g = new THREE.Group();
  const top = box(0.9, 0.03, 0.5, 0x555555);
  top.position.y = 0.72;
  g.add(top);
  for (const dx of [-0.4, 0.4]) {
    const leg = box(0.03, 0.7, 0.4, 0x333333);
    leg.position.set(dx, 0.36, 0);
    leg.rotation.z = dx > 0 ? -0.15 : 0.15;
    g.add(leg);
  }
  return g;
}

function buildGarbageCan() {
  const g = new THREE.Group();
  const can = cyl(0.24, 0.2, 0.75, 0x3b6e3b, 16);
  can.position.y = 0.38;
  g.add(can);
  const lid = cyl(0.25, 0.25, 0.04, 0x2c542c, 16);
  lid.position.y = 0.77;
  g.add(lid);
  return g;
}

export default [
  { id: 'porta-potty', build: buildPortaPotty, colliderRadius: 0.7, animHint: 'none' },
  { id: 'grill', build: buildGrill, colliderRadius: 0.35, animHint: 'none' },
  { id: 'parking-cone', build: buildParkingCone, colliderRadius: 0.2, animHint: 'none' },
  { id: 'tailgate-table', build: buildTailgateTable, colliderRadius: 0.5, animHint: 'none' },
  { id: 'garbage-can', build: buildGarbageCan, colliderRadius: 0.32, animHint: 'none' },
];
