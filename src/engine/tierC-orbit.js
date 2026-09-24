import * as THREE from 'three';

const DRAG_SENSITIVITY = 0.004;
const MAX_PITCH = Math.PI / 2 - 0.05;

/**
 * Tier C: no camera feed, no device motion -- desktop / permission-denied
 * floor so the game is always demoable. Camera position stays fixed at the
 * origin (matching Tier B's placement model exactly, so spherical object
 * placement is identical across tiers) and rotates via pointer-drag yaw/
 * pitch instead of real rotation. Deliberately NOT three.js OrbitControls,
 * which orbits the camera's *position* around a target -- that would break
 * the "camera fixed, objects static in world space" placement contract
 * shared with Tier B.
 */
export function createTierC() {
  const worldRoot = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 50);

  let yaw = 0;
  let pitch = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let rafId = null;
  let canvasEl = null;

  function onPointerDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw -= dx * DRAG_SENSITIVITY;
    pitch = THREE.MathUtils.clamp(pitch - dy * DRAG_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
  }
  function onPointerUp() {
    dragging = false;
  }

  // eslint-disable-next-line no-unused-vars
  async function tryStart(canvas) {
    canvasEl = canvas || window;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return true; // this tier always succeeds
  }

  function start(renderer, sceneRef, onUpdate) {
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      onUpdate(dt);
      renderer.render(sceneRef, camera);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function dispose() {
    if (rafId) cancelAnimationFrame(rafId);
    if (canvasEl) canvasEl.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  return {
    tier: 'C',
    camera,
    worldRoot,
    tryStart,
    start,
    dispose,
    supportsTranslation: false,
  };
}
