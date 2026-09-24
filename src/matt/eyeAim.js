import * as THREE from 'three';

const _worldPos = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _lookMatrix = new THREE.Matrix4();
const _worldQuat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Computes the LOCAL quaternion `node` would need so that its +Z axis aims
 * at `worldTargetPos`, expressed relative to node.parent (so it composes
 * correctly under whatever the parent chain -- torso -> neck -> head -> eye
 * socket -- is already rotated to). This is the one building block that
 * makes "head faces one thing, left eye faces another, right eye faces a
 * third" just three calls with three different target points.
 */
export function computeLocalAimQuaternion(node, worldTargetPos) {
  node.getWorldPosition(_worldPos);
  _lookMatrix.lookAt(_worldPos, worldTargetPos, _up);
  _worldQuat.setFromRotationMatrix(_lookMatrix);

  node.parent.getWorldQuaternion(_parentWorldQuat);
  const localQuat = _parentWorldQuat.clone().invert().multiply(_worldQuat);
  return localQuat;
}

/**
 * Slerps `node` toward aiming at `worldTargetPos`, clamped to a cone
 * (maxConeDeg) around the node's rest/neutral local quaternion so eyes and
 * head don't spin past anatomically-plausible limits. `speed` controls how
 * fast the slerp catches up per second (eyes: fast/tight cone, head:
 * slower/wider cone -- this difference alone is what sells "eyes dart,
 * head turns").
 */
export function updateAim(node, worldTargetPos, restLocalQuat, maxConeDeg, speed, dt) {
  const desired = computeLocalAimQuaternion(node, worldTargetPos);
  const maxRad = THREE.MathUtils.degToRad(maxConeDeg);
  const angle = restLocalQuat.angleTo(desired);
  const clamped = angle > maxRad ? restLocalQuat.clone().slerp(desired, maxRad / angle) : desired;
  node.quaternion.slerp(clamped, Math.min(1, speed * dt));
}
