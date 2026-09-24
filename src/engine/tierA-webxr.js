import * as THREE from 'three';

const FALLBACK_TIMEOUT_MS = 2500;
const FALLBACK_FORWARD_M = 1.8;
const FALLBACK_HEIGHT_M = -1.3;

/**
 * Tier A: real 6DoF WebXR immersive-ar with hit-test. Never blocks the
 * experience waiting for a surface -- if no valid hit-test result resolves
 * within FALLBACK_TIMEOUT_MS, Matt auto-places at a fixed forward offset
 * from the viewer's pose at session start.
 */
export function createTierA(renderer) {
  const worldRoot = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 50);

  let session = null;
  let hitTestSource = null;
  let viewerSpace = null;
  let referenceSpace = null;
  let sessionStartMs = null;
  let anchored = false;
  let rafId = null;

  async function tryStart() {
    try {
      session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor'],
      });
    } catch (err) {
      return false;
    }

    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);

    referenceSpace = renderer.xr.getReferenceSpace();
    viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    sessionStartMs = performance.now();

    session.addEventListener('end', () => {
      hitTestSource = null;
      session = null;
    });

    return true;
  }

  function tryAnchor(frame) {
    if (anchored) return;

    if (hitTestSource) {
      const results = frame.getHitTestResults(hitTestSource);
      if (results.length > 0) {
        const pose = results[0].getPose(referenceSpace);
        if (pose) {
          worldRoot.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
          worldRoot.quaternion.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
          );
          anchored = true;
          return;
        }
      }
    }

    if (performance.now() - sessionStartMs > FALLBACK_TIMEOUT_MS) {
      const viewerPose = frame.getViewerPose(referenceSpace);
      const forward = new THREE.Vector3(0, 0, -FALLBACK_FORWARD_M);
      if (viewerPose) {
        const p = viewerPose.transform.position;
        const o = viewerPose.transform.orientation;
        const viewerQuat = new THREE.Quaternion(o.x, o.y, o.z, o.w);
        forward.applyQuaternion(viewerQuat);
        worldRoot.position.set(p.x + forward.x, p.y + FALLBACK_HEIGHT_M, p.z + forward.z);
      } else {
        worldRoot.position.set(0, FALLBACK_HEIGHT_M, -FALLBACK_FORWARD_M);
      }
      worldRoot.quaternion.identity();
      anchored = true;
    }
  }

  function start(rendererArg, sceneRef, onUpdate) {
    let lastT = null;
    renderer.setAnimationLoop((timestamp, frame) => {
      const t = timestamp / 1000;
      const dt = lastT == null ? 0 : t - lastT;
      lastT = t;
      if (frame) tryAnchor(frame);
      onUpdate(dt);
      renderer.render(sceneRef, camera);
    });
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    if (session) session.end().catch(() => {});
  }

  return {
    tier: 'A',
    camera,
    worldRoot,
    tryStart,
    start,
    dispose,
    supportsTranslation: true,
  };
}
