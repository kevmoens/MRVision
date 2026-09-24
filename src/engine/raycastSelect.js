import * as THREE from 'three';

/**
 * Object selection is a ray-vs-padded-bounding-sphere test against a
 * lightweight registry of {instanceId, object3D, colliderRadius} entries,
 * NOT a mesh-precision raycast -- AR taps are imprecise, and this approach
 * is tier-agnostic: it only needs the active camera's current matrix, so it
 * works identically whether the camera's rotation came from real 6DoF
 * (Tier A), gyro-only rotation (Tier B), or mouse-drag orbit (Tier C).
 */
export class SelectableRegistry {
  constructor() {
    this.entries = new Map(); // instanceId -> { object3D, colliderRadius }
    this.raycaster = new THREE.Raycaster();
    this._worldPos = new THREE.Vector3();
  }

  register(instanceId, object3D, colliderRadius) {
    this.entries.set(instanceId, { object3D, colliderRadius });
  }

  unregister(instanceId) {
    this.entries.delete(instanceId);
  }

  clear() {
    this.entries.clear();
  }

  /** ndcX/ndcY in [-1, 1] normalized device coordinates. Returns instanceId or null. */
  pick(camera, ndcX, ndcY) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    let closestId = null;
    let closestDist = Infinity;
    for (const [instanceId, { object3D, colliderRadius }] of this.entries) {
      object3D.getWorldPosition(this._worldPos);
      const sphere = new THREE.Sphere(this._worldPos, colliderRadius);
      const hitPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectSphere(sphere, hitPoint)) {
        const dist = this.raycaster.ray.origin.distanceTo(hitPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = instanceId;
        }
      }
    }
    return closestId;
  }
}

export function screenToNDC(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}
