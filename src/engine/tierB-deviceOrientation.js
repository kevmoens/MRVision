import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

// Adapted from the classic three.js DeviceOrientationControls approach.
const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

function rawDeviceQuaternion(out, alpha, beta, gamma, orientDeg) {
  euler.set(beta * DEG2RAD, alpha * DEG2RAD, -gamma * DEG2RAD, 'YXZ');
  out.setFromEuler(euler);
  out.multiply(q1);
  out.multiply(q0.setFromAxisAngle(zee, -orientDeg * DEG2RAD));
  return out;
}

function currentScreenOrientationDeg() {
  if (screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  return window.orientation || 0;
}

/**
 * Tier B: camera-passthrough + device-orientation pseudo-AR. No positional
 * tracking -- the camera stays fixed at the world origin and only rotates.
 * Every object's authored spherical position is relative to the heading
 * captured at session start (never magnetometer/compass absolute heading,
 * which is unreliable) -- see sphericalPlacement.js for the shared
 * placement math this relies on.
 */
export function createTierB() {
  const worldRoot = new THREE.Group(); // stays at identity: origin, no rotation
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 50);

  let videoEl = null;
  let stream = null;
  let baseQuatInverse = null;
  let rafId = null;
  const rawQuat = new THREE.Quaternion();

  function onDeviceOrientation(e) {
    if (e.alpha == null) return;
    rawDeviceQuaternion(rawQuat, e.alpha, e.beta || 0, e.gamma || 0, currentScreenOrientationDeg());
    if (!baseQuatInverse) {
      baseQuatInverse = rawQuat.clone().invert();
    }
  }

  async function tryStart() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return false;
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (err) {
      return false;
    }

    videoEl = document.createElement('video');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('muted', '');
    videoEl.muted = true;
    videoEl.srcObject = stream;
    Object.assign(videoEl.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: '0',
    });
    document.body.prepend(videoEl);
    await videoEl.play().catch(() => {});

    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    return true;
  }

  function start(renderer, sceneRef, onUpdate) {
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (baseQuatInverse) {
        camera.quaternion.copy(baseQuatInverse).multiply(rawQuat);
      }
      onUpdate(dt);
      renderer.render(sceneRef, camera);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function dispose() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (videoEl) videoEl.remove();
  }

  return {
    tier: 'B',
    camera,
    worldRoot,
    tryStart,
    start,
    dispose,
    supportsTranslation: false,
  };
}
