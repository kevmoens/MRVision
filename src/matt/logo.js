import * as THREE from 'three';

const NEUTRAL_ANGLE = Math.PI / 2; // notch rests pointing "up" the logo
const BLEND = 0.25; // how much of the true clue angle leaks into the notch -- keep low so it reads as a logo detail, not an arrow
const NOTCH_SPEED = 1.2; // slow ease so it's a drifting detail, not a snapping needle

function buildLogoTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Circular badge background.
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fillStyle = '#2f6b3e';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#f4d35e';
  ctx.stroke();

  // Stylized "R" (this is "The Ramage Compass" glyph -- the notch mesh,
  // added separately as a real 3D wedge so it can rotate, sits on top of
  // this static texture).
  ctx.fillStyle = '#f4d35e';
  ctx.font = 'bold 150px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', size / 2, size / 2 + 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the shirt logo: a static badge (logoBase) plus one small rotatable
 * wedge (logoNotch) parented at its center -- this is the entire secret
 * "Ramage Compass" mechanic. logoNotch never aims precisely at the true
 * clue direction; see updateLogoNotch.
 */
export function buildShirtLogo() {
  const group = new THREE.Group();
  group.name = 'shirtLogoGroup';

  const baseGeo = new THREE.CircleGeometry(0.09, 24);
  const baseMat = new THREE.MeshBasicMaterial({ map: buildLogoTexture(), transparent: true });
  const logoBase = new THREE.Mesh(baseGeo, baseMat);
  logoBase.name = 'logoBase';
  group.add(logoBase);

  const notchGeo = new THREE.ConeGeometry(0.015, 0.05, 3);
  notchGeo.rotateX(Math.PI / 2);
  const notchMat = new THREE.MeshStandardMaterial({ color: 0xf4d35e });
  const logoNotch = new THREE.Mesh(notchGeo, notchMat);
  logoNotch.name = 'logoNotch';
  logoNotch.position.set(0, 0.095, 0.002);
  logoNotch.rotation.z = NEUTRAL_ANGLE;
  group.add(logoNotch);

  return { group, logoNotch };
}

/**
 * Rotates logoNotch about the torso-forward (Z) axis toward the clue
 * target's bearing, but only blends BLEND of the way there from a neutral
 * resting angle -- deliberately subtle, discoverable on close inspection,
 * never a legible compass needle.
 */
export function updateLogoNotch(logoNotch, clueWorldPos, dt) {
  const localTarget = logoNotch.parent.worldToLocal(clueWorldPos.clone());
  const trueAngle = Math.atan2(localTarget.y, localTarget.x) + Math.PI / 2;
  const targetAngle = THREE.MathUtils.lerp(NEUTRAL_ANGLE, trueAngle, BLEND);
  logoNotch.rotation.z = THREE.MathUtils.lerp(
    logoNotch.rotation.z,
    targetAngle,
    Math.min(1, NOTCH_SPEED * dt)
  );
}
