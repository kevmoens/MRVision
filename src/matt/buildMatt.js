import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildShirtLogo, updateLogoNotch } from './logo.js';
import { updateAim } from './eyeAim.js';

const SKIN = 0xe0a878;
const SHIRT = 0x2f6b3e;
const HAIR = 0x4a3527;

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

  const socketWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  eyeGroup.add(socketWhite);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  pupil.position.set(0, 0, 0.022); // offset toward local +Z so rotating the group visibly re-aims the pupil
  eyeGroup.add(pupil);

  return eyeGroup;
}

/**
 * Wraps a rig's named nodes (head/eyes/logoNotch/sunglasses, wherever they
 * came from -- procedural or a loaded .glb) with the shared aim/update API
 * the round runner drives every frame.
 */
function wireRig(root, { head, leftEye, rightEye, logoNotch, sunglasses }) {
  const restHeadQuat = head.quaternion.clone();
  const restLeftQuat = leftEye.quaternion.clone();
  const restRightQuat = rightEye.quaternion.clone();

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

  function update(dt) {
    if (state.headTarget) updateAim(head, state.headTarget, restHeadQuat, 75, 1.6, dt);
    if (state.leftEyeTarget) updateAim(leftEye, state.leftEyeTarget, restLeftQuat, 38, 4.0, dt);
    if (state.rightEyeTarget) updateAim(rightEye, state.rightEyeTarget, restRightQuat, 38, 4.0, dt);
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
 *            -> neck -> head -> leftEyeSocket -> leftEye (rotates)
 *                            -> rightEyeSocket -> rightEye (rotates)
 *                            -> sunglasses (hidden by default)
 */
function buildProceduralMatt(scale) {
  const mattRoot = new THREE.Group();
  mattRoot.name = 'mattRoot';
  mattRoot.scale.setScalar(scale);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 8, 12),
    new THREE.MeshStandardMaterial({ color: SHIRT })
  );
  torso.position.y = 0.9;
  mattRoot.add(torso);

  const { group: shirtLogoGroup, logoNotch } = buildShirtLogo();
  // Chest height, in torso-LOCAL space (the capsule geometry spans roughly
  // -0.5..+0.5 locally before torso's own y=0.9 world offset is applied).
  shirtLogoGroup.position.set(0, 0.15, 0.225);
  torso.add(shirtLogoGroup);

  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.y = 1.28;
  mattRoot.add(neck);

  const head = new THREE.Group();
  head.name = 'head';
  neck.add(head);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 16),
    new THREE.MeshStandardMaterial({ color: SKIN })
  );
  head.add(headMesh);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: HAIR })
  );
  hair.position.y = 0.02;
  head.add(hair);

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

  const sunglasses = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.04, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  sunglasses.position.set(0, 0.02, 0.16);
  sunglasses.visible = false;
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
