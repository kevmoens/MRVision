import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.4);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(1, 2, 1);
  scene.add(dir);
  return scene;
}

export function createBaseCamera() {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.05,
    50
  );
  camera.position.set(0, 0, 0);
  return camera;
}

export function watchResize(renderer, camera) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
