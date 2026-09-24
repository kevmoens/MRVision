import { createTierA } from './tierA-webxr.js';
import { createTierB } from './tierB-deviceOrientation.js';
import { createTierC } from './tierC-orbit.js';

/**
 * Feature-detection ladder: Tier A (WebXR immersive-ar) -> Tier B (camera
 * passthrough + device orientation) -> Tier C (drag-to-look, always
 * succeeds). MUST be called from inside the "Tap to Start" click handler --
 * both the iOS motion-permission prompt and getUserMedia require a live
 * user gesture and cannot be requested from a deferred/async context that
 * has lost gesture attribution.
 */
export async function selectTier(renderer, canvas) {
  if (navigator.xr) {
    const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
    if (supported) {
      const driverA = createTierA(renderer);
      const ok = await driverA.tryStart(canvas).catch(() => false);
      if (ok) return driverA;
    }
  }

  // Only attempt Tier B (camera + device-orientation permission prompts) on
  // devices that plausibly have real motion sensors -- desktop browsers
  // technically expose these same APIs but have no gyro, so gating on
  // touch support avoids spuriously prompting for camera/motion access on
  // desktop before falling through to Tier C.
  const isLikelyMobile = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  if (isLikelyMobile && ('DeviceOrientationEvent' in window || navigator.mediaDevices)) {
    const driverB = createTierB();
    const ok = await driverB.tryStart(canvas).catch(() => false);
    if (ok) return driverB;
  }

  const driverC = createTierC();
  await driverC.tryStart(canvas);
  return driverC;
}
