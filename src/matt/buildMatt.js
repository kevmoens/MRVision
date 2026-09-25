import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildShirtLogo, updateLogoNotch } from './logo.js';
import { updateAim, computeLocalAimQuaternion } from './eyeAim.js';

const SKIN = 0xe3ac82;
const SHIRT = 0x2f6b3e;
const HAIR = 0x4a3527;
const STUBBLE = 0x8a7160;
const CAP = 0xf2f0e9;
const GOLD_TRIM = 0xf4d35e;
const IRIS = 0x7a5c3e;
const BLUSH = 0xd98878;
const SIDEBURN = 0x5b4a3a;
const LIP = 0xa8695f;

// Cel/toon shading, not flat PBR -- a hand-arranged pile of primitives reads
// as a cheap 3D demo under realistic lighting no matter how it's posed; a
// stepped gradient + inked outlines is what actually sells "cartoon
// character" instead of "placeholder geometry."
let _toonGradient = null;
function toonGradientMap() {
  if (_toonGradient) return _toonGradient;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const bands = [90, 160, 210, 255];
  bands.forEach((v, i) => {
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(i, 0, 1, 1);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  _toonGradient = tex;
  return tex;
}

function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradientMap(), ...opts });
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x211a15, side: THREE.BackSide });

/** Inverted-hull outline: a black backface-only shell just outside the mesh's own surface. */
function addOutline(mesh, thickness = 0.06) {
  const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  outline.scale.setScalar(1 + thickness);
  mesh.add(outline);
  return outline;
}

function buildCapPatchTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#f4d35e';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MR', size / 2, size / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MATT_MODEL_URL = './assets/models/matt.glb';

// Populated by preloadMattModel(), which main.js awaits once during the
// loading screen -- buildMatt() itself stays synchronous (required by the
// object registry's build()-returns-a-Group contract, since "another-matt"
// / "tiny-matt" spawn additional Matts mid-round via that same registry)
// and just reads whatever landed in this cache.
let mattTemplate = null;

/**
 * Drop a real Matt model at assets/models/matt.glb (binary glTF) to replace
 * the placeholder primitive rig everywhere in the game -- no other code
 * changes needed. Call once, before any buildMatt() calls (main.js does
 * this during the "Finding Matt..." loading step). Silently falls back to
 * the procedural rig if the file is missing or fails to load.
 *
 * The .glb must contain these exact (case-sensitive) named objects for the
 * gaze/compass mechanic to work -- export from Blender as a RIGID hierarchy
 * (empties/meshes parented to each other), not a soft-skinned single mesh,
 * since nothing here does skeletal blending:
 *   - "Head"           -- rotates to aim Matt's head
 *   - "LeftEye"         -- child of Head (or anywhere) -- rotates independently
 *   - "RightEye"        -- rotates independently of LeftEye
 *   - "ShirtLogoNotch"  -- small part of the shirt emblem that subtly
 *                          rotates to secretly point at the round's clue
 *                          object -- this IS the Ramage Compass
 *   - "Sunglasses"      -- optional; toggled visible for Sunglasses Mode
 * Model should be built at real-world scale (meters), standing upright
 * with feet at the object's own local origin (y=0) and facing +Z.
 */
export async function preloadMattModel() {
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(MATT_MODEL_URL);
    mattTemplate = gltf.scene;
    console.log(`[wim] loaded custom Matt model from ${MATT_MODEL_URL}`);
  } catch {
    mattTemplate = null; // no file dropped in yet, or it failed to load
  }
}

function buildEye(side) {
  const eyeGroup = new THREE.Group();
  eyeGroup.name = `${side}Eye`;

  const socketWhite = new THREE.Mesh(new THREE.SphereGeometry(0.028, 20, 16), toonMat(0xffffff));
  addOutline(socketWhite, 0.05);
  eyeGroup.add(socketWhite);

  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), toonMat(IRIS));
  iris.position.set(0, 0, 0.018);
  eyeGroup.add(iris);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), toonMat(0x1a1a1a));
  pupil.position.set(0, 0, 0.026); // offset toward local +Z so rotating the group visibly re-aims the pupil
  eyeGroup.add(pupil);

  return eyeGroup;
}

// Matt has a real, permanent lazy eye (strabismus) -- his RIGHT eye (the one
// on screen-left when he's facing you) never quite converges on what he's
// looking at, drifting outward by a fixed angle instead. Flip which eye by
// swapping AFFECTED_EYE to 'left', or set LAZY_EYE_DEG to 0 to disable.
const AFFECTED_EYE = 'right';
const LAZY_EYE_DEG = 16;
const _lazyEyeOffset = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  THREE.MathUtils.degToRad(LAZY_EYE_DEG)
);

/**
 * Wraps a rig's named nodes (head/eyes/logoNotch/sunglasses, wherever they
 * came from -- procedural or a loaded .glb) with the shared aim/update API
 * the round runner drives every frame.
 */
function wireRig(root, { head, leftEye, rightEye, logoNotch, sunglasses }) {
  const restHeadQuat = head.quaternion.clone();
  const restLeftQuat = leftEye.quaternion.clone();
  const restRightQuat = rightEye.quaternion.clone();

  // The lazy eye's "true" tracked aim is kept in a separate quaternion rather
  // than written straight to the node -- the node also displays a constant
  // outward offset on top, and if that offset were folded back into the
  // node's own quaternion each frame (the thing updateAim reads as its slerp
  // start point next frame), the offset would compound frame over frame into
  // runaway spin instead of a fixed misalignment.
  const lazyTracked = (AFFECTED_EYE === 'right' ? restRightQuat : restLeftQuat).clone();

  const state = {
    headTarget: null,
    leftEyeTarget: null,
    rightEyeTarget: null,
    clueTarget: null,
  };

  function setGazeTargets({ headWorldPos, leftEyeWorldPos, rightEyeWorldPos }) {
    state.headTarget = headWorldPos;
    state.leftEyeTarget = leftEyeWorldPos;
    state.rightEyeTarget = rightEyeWorldPos;
  }

  function setClueTarget(worldPos) {
    state.clueTarget = worldPos;
  }

  function setSunglasses(on) {
    if (sunglasses) sunglasses.visible = on;
  }

  function updateLazyEye(node, worldTarget, restQuat, dt) {
    const desired = computeLocalAimQuaternion(node, worldTarget);
    const maxRad = THREE.MathUtils.degToRad(38);
    const angle = restQuat.angleTo(desired);
    const clamped = angle > maxRad ? restQuat.clone().slerp(desired, maxRad / angle) : desired;
    lazyTracked.slerp(clamped, Math.min(1, 4.0 * dt));
    node.quaternion.copy(lazyTracked).multiply(_lazyEyeOffset);
  }

  function update(dt) {
    if (state.headTarget) updateAim(head, state.headTarget, restHeadQuat, 75, 1.6, dt);
    if (state.leftEyeTarget) {
      if (AFFECTED_EYE === 'left') updateLazyEye(leftEye, state.leftEyeTarget, restLeftQuat, dt);
      else updateAim(leftEye, state.leftEyeTarget, restLeftQuat, 38, 4.0, dt);
    }
    if (state.rightEyeTarget) {
      if (AFFECTED_EYE === 'right') updateLazyEye(rightEye, state.rightEyeTarget, restRightQuat, dt);
      else updateAim(rightEye, state.rightEyeTarget, restRightQuat, 38, 4.0, dt);
    }
    if (state.clueTarget && logoNotch) updateLogoNotch(logoNotch, state.clueTarget, dt);
  }

  return {
    root,
    parts: { head, leftEye, rightEye, logoNotch, sunglasses },
    setGazeTargets,
    setClueTarget,
    setSunglasses,
    update,
  };
}

function buildFromTemplate(scale) {
  const root = mattTemplate.clone(true);
  root.name = 'mattRoot';
  root.scale.setScalar(scale);

  const head = root.getObjectByName('Head');
  const leftEye = root.getObjectByName('LeftEye');
  const rightEye = root.getObjectByName('RightEye');
  const logoNotch = root.getObjectByName('ShirtLogoNotch');
  const sunglasses = root.getObjectByName('Sunglasses');

  if (!head || !leftEye || !rightEye) {
    console.warn(
      '[wim] matt.glb is missing a required "Head"/"LeftEye"/"RightEye" named object -- falling back to the placeholder Matt.'
    );
    return null;
  }
  if (!logoNotch) {
    console.warn('[wim] matt.glb has no "ShirtLogoNotch" object -- the Ramage Compass clue will be invisible on this model.');
  }
  if (sunglasses) sunglasses.visible = false;

  return wireRig(root, { head, leftEye, rightEye, logoNotch, sunglasses });
}

/**
 * Assembles the placeholder Matt rig:
 *   mattRoot -> torso -> shirtLogoGroup (logoBase + rotating logoNotch)
 *            -> neckMesh (visual bridge only, not part of the aim rig)
 *            -> neck -> head -> beanie (dome + cuff + "MR" patch), stubble
 *                            -> leftEyeSocket -> leftEye (rotates)
 *                            -> rightEyeSocket -> rightEye (rotates, lazy)
 *                            -> sunglasses (hidden by default)
 */
function buildProceduralMatt(scale) {
  const mattRoot = new THREE.Group();
  mattRoot.name = 'mattRoot';
  mattRoot.scale.setScalar(scale);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.52, 8, 24), toonMat(SHIRT));
  torso.position.y = 0.9;
  addOutline(torso, 0.04);
  mattRoot.add(torso);

  // Packers-style gold collar trim, sitting right where the jersey V-neck
  // would be -- torso-local, just above the capsule's shoulder curve.
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.014, 10, 32), toonMat(GOLD_TRIM));
  collarTrim.position.y = 0.34;
  collarTrim.rotation.x = Math.PI / 2;
  torso.add(collarTrim);

  const { group: shirtLogoGroup, logoNotch } = buildShirtLogo();
  // Chest height, in torso-LOCAL space (the capsule geometry spans roughly
  // -0.5..+0.5 locally before torso's own y=0.9 world offset is applied).
  shirtLogoGroup.position.set(0, 0.15, 0.27);
  torso.add(shirtLogoGroup);

  // Torso top (radius 0.26, half-height 0.52, centered 0.9) caps out at
  // y=1.42 -- bridge the gap up to the head with a visible neck cylinder,
  // otherwise the head renders as if floating disconnected above the torso.
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.22, 24), toonMat(SKIN));
  neckMesh.position.y = 1.51;
  addOutline(neckMesh, 0.05);
  mattRoot.add(neckMesh);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 1.6;
  mattRoot.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  neck.add(head);

  const skinMat = toonMat(SKIN);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skinMat);
  headMesh.scale.set(1.08, 1.0, 1.02); // wider/rounder full face rather than a plain sphere
  addOutline(headMesh, 0.055);
  head.add(headMesh);

  // Double-chin/jowl fullness under the jawline.
  const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), skinMat);
  jowl.scale.set(1.3, 0.6, 0.9);
  jowl.position.set(0, -0.11, 0.03);
  head.add(jowl);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
    toonMat(HAIR)
  );
  hair.position.y = 0.12; // stays fully hidden under the raised cap rim
  head.add(hair);

  // Grayish sideburn tufts peeking out from under the cap at ear height,
  // since the cap itself doesn't reach that low.
  const sideburnMat = toonMat(SIDEBURN);
  const leftSideburn = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), sideburnMat);
  leftSideburn.scale.set(0.7, 1.4, 0.8);
  leftSideburn.position.set(-0.155, -0.03, 0.04);
  head.add(leftSideburn);
  const rightSideburn = leftSideburn.clone();
  rightSideburn.position.x = 0.155;
  head.add(rightSideburn);

  // Thin eyebrows, sitting just below the cap and above the eyes.
  const browMat = toonMat(SIDEBURN);
  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.015), browMat);
  leftBrow.position.set(-0.06, 0.055, 0.15);
  head.add(leftBrow);
  const rightBrow = leftBrow.clone();
  rightBrow.position.x = 0.06;
  head.add(rightBrow);

  // Rosy cheeks/blush, matched to his ruddy complexion in the photos.
  const blushMat = toonMat(BLUSH);
  const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), blushMat);
  leftBlush.scale.set(1, 0.8, 0.3);
  leftBlush.position.set(-0.1, -0.03, 0.1);
  head.add(leftBlush);
  const rightBlush = leftBlush.clone();
  rightBlush.position.x = 0.1;
  head.add(rightBlush);

  // Round, fairly prominent nose, plus a soft nostril shadow underneath.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), skinMat);
  nose.scale.set(0.85, 1.1, 0.9);
  nose.position.set(0, -0.015, 0.155);
  addOutline(nose, 0.08);
  head.add(nose);

  const nostrilShadowMat = toonMat(0xc98f68);
  const nostrilShadow = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), nostrilShadowMat);
  nostrilShadow.scale.set(1.6, 0.5, 0.6);
  nostrilShadow.position.set(0, -0.042, 0.162);
  head.add(nostrilShadow);

  // Scruff/stubble along the upper lip and jawline -- lighter and sparser
  // than a full goatee, tracing the jaw rather than one solid chin patch.
  const stubbleMat = toonMat(STUBBLE);
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), stubbleMat);
  mustache.position.set(0, -0.065, 0.13);
  head.add(mustache);

  // Mouth/lip line, sitting between the mustache stubble above and the
  // jowl below.
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.02), toonMat(LIP));
  mouth.position.set(0, -0.082, 0.135);
  head.add(mouth);

  const leftJaw = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), stubbleMat);
  leftJaw.scale.set(1.4, 0.7, 0.8);
  leftJaw.position.set(-0.095, -0.08, 0.08);
  leftJaw.rotation.y = 0.6;
  head.add(leftJaw);
  const rightJaw = leftJaw.clone();
  rightJaw.position.x = 0.095;
  rightJaw.rotation.y = -0.6;
  head.add(rightJaw);

  // Backwards baseball cap: crown sits high on the head, brim juts out over
  // the back of the neck (-Z, opposite the face) instead of over the
  // forehead. The rim needs real clearance above the eyes (y=0.02) and
  // brows (y=0.05) -- a near-zero margin here previously (in an earlier
  // beanie version of this rig) left the eyes rendering as if trapped
  // inside the cap, since the eyeballs barely poked past its surface.
  const capMat = toonMat(CAP);
  const capCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.174, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
    capMat
  );
  capCrown.position.y = 0.133;
  addOutline(capCrown, 0.045);
  head.add(capCrown);

  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.016, 0.09), capMat);
  capBrim.position.set(0, 0.078, -0.14);
  capBrim.rotation.x = -0.2;
  addOutline(capBrim, 0.06);
  head.add(capBrim);

  const capPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.075, 0.03),
    new THREE.MeshBasicMaterial({ map: buildCapPatchTexture(), transparent: true })
  );
  capPatch.position.set(0, 0.075, 0.176);
  head.add(capPatch);

  const leftEyeSocket = new THREE.Group();
  leftEyeSocket.name = 'leftEyeSocket';
  leftEyeSocket.position.set(-0.06, 0.02, 0.145);
  head.add(leftEyeSocket);
  const leftEye = buildEye('left');
  leftEyeSocket.add(leftEye);

  const rightEyeSocket = new THREE.Group();
  rightEyeSocket.name = 'rightEyeSocket';
  rightEyeSocket.position.set(0.06, 0.02, 0.145);
  head.add(rightEyeSocket);
  const rightEye = buildEye('right');
  rightEyeSocket.add(rightEye);

  // White wayfarer-style frame with dark lenses, matched to the reference
  // photo -- grouped as one "Sunglasses" node so the toggle still hides/
  // shows it as a unit.
  const sunglasses = new THREE.Group();
  sunglasses.name = 'Sunglasses';
  sunglasses.position.set(0, 0.02, 0.16);
  sunglasses.visible = false;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.018), toonMat(CAP));
  sunglasses.add(frame);

  const lensMat = toonMat(0x111111);
  const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.032, 0.014), lensMat);
  leftLens.position.set(-0.045, 0, 0.004);
  sunglasses.add(leftLens);
  const rightLens = leftLens.clone();
  rightLens.position.x = 0.045;
  sunglasses.add(rightLens);

  head.add(sunglasses);

  return wireRig(mattRoot, { head, leftEye, rightEye, logoNotch, sunglasses });
}

export function buildMatt({ scale = 1 } = {}) {
  if (mattTemplate) {
    try {
      const rig = buildFromTemplate(scale);
      if (rig) return rig;
    } catch (err) {
      console.warn('[wim] failed to build Matt from matt.glb, using the placeholder Matt instead', err);
    }
  }
  return buildProceduralMatt(scale);
}
