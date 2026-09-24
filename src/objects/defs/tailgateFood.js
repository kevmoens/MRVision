import * as THREE from 'three';
import { cyl, box, ball, cone, torus, lumpCluster } from '../primitives.js';

function buildBrat() {
  const g = new THREE.Group();
  const bun = cyl(0.03, 0.03, 0.16, 0xd9a866, 10);
  bun.rotation.z = Math.PI / 2;
  bun.position.y = 0.025;
  g.add(bun);
  const sausage = cyl(0.022, 0.022, 0.19, 0x8b4a3a, 12);
  sausage.rotation.z = Math.PI / 2;
  sausage.position.y = 0.05;
  g.add(sausage);
  return g;
}

function buildCheeseCurds() {
  return lumpCluster(6, [0.02, 0.032], 0xf4d35e, 0.1);
}

function buildNachos() {
  const g = new THREE.Group();
  const plate = cyl(0.14, 0.15, 0.015, 0xffffff, 20);
  g.add(plate);
  const chips = lumpCluster(10, [0.018, 0.03], 0xe8b84b, 0.16);
  chips.position.y = 0.01;
  g.add(chips);
  return g;
}

function buildGiantPretzel() {
  const g = new THREE.Group();
  const ring = torus(0.16, 0.035, 0x8a5a2c, 20);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  g.add(ring);
  const salt = ball(0.006, 0xffffff, 4);
  for (let i = 0; i < 14; i++) {
    const s = salt.clone();
    const a = (i / 14) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.16, 0.23, Math.sin(a) * 0.16);
    g.add(s);
  }
  return g;
}

function buildHotDog() {
  const g = new THREE.Group();
  const bun = cyl(0.026, 0.026, 0.17, 0xe0b878, 10);
  bun.rotation.z = Math.PI / 2;
  bun.position.y = 0.024;
  g.add(bun);
  const dog = cyl(0.017, 0.017, 0.2, 0xa5533b, 12);
  dog.rotation.z = Math.PI / 2;
  dog.position.y = 0.045;
  g.add(dog);
  const mustard = box(0.16, 0.006, 0.012, 0xe4c02a);
  mustard.position.y = 0.058;
  g.add(mustard);
  return g;
}

function buildPizza() {
  const g = new THREE.Group();
  const slice = cone(0.22, 0.03, 0xe8b84b, 3);
  slice.rotation.x = Math.PI / 2;
  slice.position.y = 0.02;
  g.add(slice);
  const crust = torus(0.22, 0.02, 0xd39b4e, 3);
  crust.rotation.x = Math.PI / 2;
  crust.position.y = 0.02;
  g.add(crust);
  return g;
}

function buildChickenWings() {
  const g = new THREE.Group();
  const plate = cyl(0.13, 0.14, 0.012, 0xffffff, 18);
  g.add(plate);
  for (let i = 0; i < 5; i++) {
    const wing = cyl(0.014, 0.02, 0.09, 0xc17a3d, 8);
    const a = (i / 5) * Math.PI * 2;
    wing.position.set(Math.cos(a) * 0.06, 0.05, Math.sin(a) * 0.06);
    wing.rotation.z = Math.random() * Math.PI;
    g.add(wing);
  }
  return g;
}

function buildMustardBottle() {
  const g = new THREE.Group();
  const body = cyl(0.028, 0.024, 0.16, 0xe4c02a, 12);
  body.position.y = 0.09;
  g.add(body);
  const cap = cyl(0.012, 0.014, 0.03, 0xffffff, 10);
  cap.position.y = 0.185;
  g.add(cap);
  return g;
}

export default [
  { id: 'brat', build: buildBrat, colliderRadius: 0.13, animHint: 'none' },
  { id: 'cheese-curds', build: buildCheeseCurds, colliderRadius: 0.1, animHint: 'none' },
  { id: 'nachos', build: buildNachos, colliderRadius: 0.17, animHint: 'none' },
  { id: 'giant-pretzel', build: buildGiantPretzel, colliderRadius: 0.22, animHint: 'none' },
  { id: 'hot-dog', build: buildHotDog, colliderRadius: 0.14, animHint: 'none' },
  { id: 'pizza', build: buildPizza, colliderRadius: 0.24, animHint: 'none' },
  { id: 'chicken-wings', build: buildChickenWings, colliderRadius: 0.16, animHint: 'none' },
  { id: 'mustard-bottle', build: buildMustardBottle, colliderRadius: 0.12, animHint: 'none' },
];
