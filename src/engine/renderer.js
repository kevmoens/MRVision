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
  // Filmic tone mapping + a touch of extra exposure -- flat/linear output is
  // the single biggest reason hand-built characters read as "cheap 3D demo"
  // rather than styled/rendered; this alone sells the toon materials below.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.xr.enabled = true;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  // Three-point rig (key/fill/rim) instead of one flat hemisphere + one
  // directional -- the rim light in particular is what separates a
  // character's silhouette from the background the way a TV cartoon does.
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a2f28, 0.55);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff4e0, 1.75);
  key.position.set(1.2, 2.4, 1.6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.55);
  fill.position.set(-1.6, 1.2, 0.8);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-0.6, 1.6, -2);
  scene.add(rim);

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
