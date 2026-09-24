import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import beerRelated from './defs/beerRelated.js';
import tailgateFood from './defs/tailgateFood.js';
import sportsFanGear from './defs/sportsFanGear.js';
import wildlife from './defs/wildlife.js';
import tailgateFixture from './defs/tailgateFixture.js';
import tailgateGear from './defs/tailgateGear.js';
import people from './defs/people.js';
import mattVariant from './defs/mattVariant.js';
import meta from './defs/meta.js';

const ALL_DEFS = [
  ...beerRelated,
  ...tailgateFood,
  ...sportsFanGear,
  ...wildlife,
  ...tailgateFixture,
  ...tailgateGear,
  ...people,
  ...mattVariant,
  ...meta,
];

// "another-matt" / "tiny-matt" already get their real-model upgrade for
// free via matt.glb (buildMatt.js) since they spawn a full second Matt rig
// -- they don't need their own dropped-in file. "nothing" is a floating
// text label, not a placeable prop -- no model makes sense for it either.
const SKIP_MODEL_LOOKUP = new Set(['another-matt', 'tiny-matt', 'nothing']);

/**
 * id -> { build(): THREE.Group, colliderRadius, animHint }. This is the
 * primitive/placeholder registry -- kept as the fallback and as the
 * "reference size" every dropped-in .glb is auto-fit against (see
 * preloadObjectModels). Round/game logic should call buildObject(id), not
 * this map's build() directly, so it always gets whichever version (real
 * model or placeholder) is currently available.
 */
export const OBJECT_REGISTRY = new Map(ALL_DEFS.map((def) => [def.id, def]));

// id -> { scene, height } for every object whose assets/models/<id>.glb
// loaded successfully. Populated once by preloadObjectModels(); buildObject
// reads from this synchronously (same pattern as buildMatt.js's
// preloadMattModel/mattTemplate) so per-round object spawning never blocks
// on a network request.
const modelTemplates = new Map();

function measureHeight(object3D) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size.y;
}

/**
 * Scales `object3D` so its height matches `targetHeight`, then re-centers
 * it horizontally and drops it so its base sits at local y=0 -- this is
 * what lets a dropped-in .glb work regardless of what scale or pivot it
 * was exported with, rather than requiring the file be authored at exact
 * real-world scale with its origin already at its feet.
 */
function autoFitToReference(object3D, targetHeight) {
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(object3D).getSize(size);
  if (size.y > 1e-6 && targetHeight > 0) {
    object3D.scale.multiplyScalar(targetHeight / size.y);
  }
  const box = new THREE.Box3().setFromObject(object3D);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object3D.position.x -= center.x;
  object3D.position.z -= center.z;
  object3D.position.y -= box.min.y;
}

/**
 * Drop a real model at assets/models/<object-id>.glb (e.g.
 * assets/models/beer.glb) to replace that object's placeholder everywhere
 * in the game -- no code or content-JSON changes needed. Call once, before
 * any buildObject() calls (main.js does this alongside preloadMattModel()
 * during the "Finding Matt..." loading step).
 *
 * Unlike Matt, ordinary objects have NO required named sub-parts -- nothing
 * here animates a part of them independently (that's only Matt's eyes/head/
 * shirt-notch). The only real constraint is scale/pivot, and this function
 * fixes that automatically: whatever height and pivot the file was
 * exported with, it gets rescaled to match the placeholder's own size and
 * re-grounded so its base sits at the object's local origin.
 */
export async function preloadObjectModels() {
  const loader = new GLTFLoader();
  const ids = Array.from(OBJECT_REGISTRY.keys()).filter((id) => !SKIP_MODEL_LOOKUP.has(id));

  await Promise.all(
    ids.map(async (id) => {
      try {
        const gltf = await loader.loadAsync(`./assets/models/${id}.glb`);
        const def = OBJECT_REGISTRY.get(id);
        const referenceHeight = measureHeight(def.build());
        autoFitToReference(gltf.scene, referenceHeight || 0.3);
        modelTemplates.set(id, gltf.scene);
        console.log(`[wim] loaded custom model for "${id}"`);
      } catch {
        // No file dropped in for this id yet (or it failed to load) --
        // buildObject() below just keeps using the placeholder.
      }
    })
  );
}

/**
 * Returns a fresh instance for this round's placements to use -- a clone
 * of the dropped-in model if one loaded, otherwise the placeholder
 * primitive factory. This is what roundRunner.js should call, not
 * OBJECT_REGISTRY.get(id).build() directly.
 */
export function buildObject(id) {
  const template = modelTemplates.get(id);
  if (template) return template.clone(true);
  const def = OBJECT_REGISTRY.get(id);
  return def ? def.build() : null;
}
