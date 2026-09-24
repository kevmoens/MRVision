import { buildMatt } from '../../matt/buildMatt.js';

/**
 * "another-matt" and "tiny-matt" are special-cased: rather than a static
 * primitive prop, build() spawns a second full rigged Matt (buildMatt),
 * with the rig's control API stashed on userData.mattRig so the round
 * runner can drive its own independent gaze/compass -- see objects.json's
 * isMattRig flag, which is what tells game/render code to look here.
 */
function buildAnotherMatt() {
  const rig = buildMatt({ scale: 1 });
  rig.root.userData.mattRig = rig;
  return rig.root;
}

function buildTinyMatt() {
  const rig = buildMatt({ scale: 0.22 });
  rig.root.userData.mattRig = rig;
  return rig.root;
}

export default [
  { id: 'another-matt', build: buildAnotherMatt, colliderRadius: 0.45, animHint: 'none' },
  { id: 'tiny-matt', build: buildTinyMatt, colliderRadius: 0.18, animHint: 'none' },
];
