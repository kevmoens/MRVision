import * as THREE from 'three';
import { OBJECT_REGISTRY, buildObject } from '../objects/registry.js';
import { placeInWorld } from '../engine/sphericalPlacement.js';
import { SelectableRegistry, screenToNDC } from '../engine/raycastSelect.js';
import { ConfettiBurst } from '../engine/confetti.js';
import { sfx } from '../engine/audio.js';
import { wrongTierForRoundIndex } from './selectRound.js';
import { angularDist } from './placement.js';

const ROUND_TIMEOUT_MS = 7500;
// The camera sits at the player's eye height (see engine/sphericalPlacement.js);
// elevationDeg here is the angle DOWN to Matt's root (his feet), not to his
// face, since his rig is built feet-up from mattRoot's own origin -- a
// negative angle is what brings his face/torso into the default view
// instead of pushing his head above the top of frame.
const MATT_START_SPHERICAL = { azimuthDeg: 0, elevationDeg: -24, distanceM: 2.3 };

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPick(selectable, camera, canvas, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    function finish(instanceId, timedOut) {
      if (done) return;
      done = true;
      canvas.removeEventListener('pointerdown', onPointerDown);
      clearTimeout(timer);
      resolve({ instanceId, timedOut });
    }
    function onPointerDown(e) {
      const { x, y } = screenToNDC(e.clientX, e.clientY, canvas);
      const id = selectable.pick(camera, x, y);
      if (id) finish(id, false);
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    const timer = setTimeout(() => {
      const ids = Array.from(selectable.entries.keys());
      const randomId = ids.length ? ids[Math.floor(Math.random() * ids.length)] : null;
      finish(randomId, true);
    }, timeoutMs);
  });
}

function classifyProximity(setup, pickedInstanceId) {
  const picked = setup.placements.find((p) => p.instanceId === pickedInstanceId);
  const punchlineInst = setup.placements.find((p) => p.objectId === setup.punchlineTarget.id);
  if (!picked || !punchlineInst) return 'far';
  return angularDist(picked.spherical.azimuthDeg, punchlineInst.spherical.azimuthDeg) < 60 ? 'close' : 'far';
}

const CLOSING_LINES = [
  '10 rounds. Zero answers. Maybe just listen to him instead.',
  "Still confused? Good. You're ready for the Matt Ramage Show.",
  "Nobody knows what Matt is looking at. We do know what he's talking about.",
  "You went 0 for 10. That's basically expert level.",
];

/**
 * Owns the full round-to-round lifecycle: spawns each round's objects,
 * drives Matt's (and any secondary Matt's) gaze, waits for the player's
 * tap (or an auto-pick timeout), runs the reveal beat, and threads through
 * the halftime checkpoint and finale. This is the conductor described in
 * the plan's "game/roundRunner.js" -- it consumes the object registry and
 * Matt rig but owns no game-content decisions itself (those all come from
 * gameSession.beginRound() / selectRound.js).
 */
export function createRoundRunner({ worldRoot, camera, canvas, mattRig, hud, captureShareImage }) {
  let liveInstances = [];
  const secondMattRigs = new Map();
  const confetti = new ConfettiBurst(50);
  worldRoot.add(confetti.group);

  let mattPlaced = false;

  function clearRoundVisuals() {
    for (const inst of liveInstances) {
      worldRoot.remove(inst.group);
      selectable.unregister(inst.instanceId);
    }
    liveInstances = [];
    secondMattRigs.clear();
  }

  const selectable = new SelectableRegistry();

  function spawnPlacements(placements) {
    for (const p of placements) {
      const def = OBJECT_REGISTRY.get(p.objectId);
      if (!def) continue;
      const group = buildObject(p.objectId);
      if (p.isGiant) group.scale.multiplyScalar(5);
      placeInWorld(worldRoot, group, p.spherical);
      const radius = def.colliderRadius * (p.isGiant ? 2.5 : 1);
      selectable.register(p.instanceId, group, Math.max(radius, 0.18));
      liveInstances.push({ instanceId: p.instanceId, objectId: p.objectId, group });
      if (group.userData.mattRig) secondMattRigs.set(p.instanceId, group.userData.mattRig);
    }
  }

  function worldPosOfObjectId(objectId) {
    const inst = liveInstances.find((i) => i.objectId === objectId);
    return inst ? inst.group.getWorldPosition(new THREE.Vector3()) : mattRig.root.getWorldPosition(new THREE.Vector3());
  }

  function worldPosOfInstance(instanceId) {
    const inst = liveInstances.find((i) => i.instanceId === instanceId);
    return inst ? inst.group.getWorldPosition(new THREE.Vector3()) : null;
  }

  function displayNameOf(objectDef) {
    return objectDef.displayName || objectDef.id;
  }

  async function runOneRound(gameSession) {
    const roundTypeDef = gameSession.currentRoundTypeDef;
    const record = gameSession.beginRound();
    const setup = record.setup;

    clearRoundVisuals();
    spawnPlacements(setup.placements);

    mattRig.setSunglasses(setup.specialEvent === 'sunglassesMode');

    let leftPos = worldPosOfObjectId(setup.leftEyeTargetId);
    let rightPos = worldPosOfObjectId(setup.rightEyeTargetId);
    let headPos = worldPosOfObjectId(setup.headTargetId);
    const cluePos = worldPosOfObjectId(setup.clueTarget.id);
    mattRig.setClueTarget(cluePos);

    if (secondMattRigs.size > 0) {
      const mainMattPos = mattRig.root.getWorldPosition(new THREE.Vector3());
      for (const [instanceId, rig] of secondMattRigs) {
        const rigPos = worldPosOfInstance(instanceId);
        if (setup.specialEvent === 'ramageception') {
          headPos = rigPos;
          rig.setGazeTargets({ headWorldPos: mainMattPos, leftEyeWorldPos: mainMattPos, rightEyeWorldPos: mainMattPos });
        } else if (setup.specialEvent === 'miniMatt') {
          headPos = rigPos;
          const other = liveInstances.find((i) => i.instanceId !== instanceId && !secondMattRigs.has(i.instanceId));
          const otherPos = other ? other.group.getWorldPosition(new THREE.Vector3()) : mainMattPos;
          rig.setGazeTargets({ headWorldPos: otherPos, leftEyeWorldPos: otherPos, rightEyeWorldPos: otherPos });
        } else {
          const other = liveInstances.find((i) => i.instanceId !== instanceId);
          const otherPos = other ? other.group.getWorldPosition(new THREE.Vector3()) : mainMattPos;
          rig.setGazeTargets({ headWorldPos: otherPos, leftEyeWorldPos: otherPos, rightEyeWorldPos: otherPos });
        }
        rig.setClueTarget(cluePos);
      }
    }

    mattRig.setGazeTargets({ headWorldPos: headPos, leftEyeWorldPos: leftPos, rightEyeWorldPos: rightPos });

    hud.showRoundHeader({
      roundNumber: gameSession.roundIndex + 1,
      roundTypeId: roundTypeDef.id,
      playerIndex: gameSession.currentPlayerIndex,
      playerCount: gameSession.playerCount,
      flavorText: setup.roundFlavor ? setup.roundFlavor.text : null,
    });

    let retargetTimer = null;
    if (setup.midRoundRetarget) {
      retargetTimer = setTimeout(() => {
        const pos = worldPosOfObjectId(setup.midRoundRetarget.newTargetId);
        if (setup.midRoundRetarget.part === 'leftEye') {
          mattRig.setGazeTargets({ headWorldPos: headPos, leftEyeWorldPos: pos, rightEyeWorldPos: rightPos });
        } else if (setup.midRoundRetarget.part === 'rightEye') {
          mattRig.setGazeTargets({ headWorldPos: headPos, leftEyeWorldPos: leftPos, rightEyeWorldPos: pos });
        }
      }, setup.midRoundRetarget.delaySec * 1000);
    }

    const pickResult = await waitForPick(selectable, camera, canvas, ROUND_TIMEOUT_MS);
    if (retargetTimer) clearTimeout(retargetTimer);
    sfx.tapSelect();

    const rec = gameSession.submitPick(pickResult.instanceId);
    await runReveal(gameSession, rec, setup, pickResult.timedOut, worldPosOfObjectId, displayNameOf);

    if (gameSession.isHalftimeSeam) {
      await runHalftime(gameSession);
    }

    gameSession.advanceRound();
  }

  async function runReveal(gameSession, record, setup, timedOut, worldPosOfObjectIdFn, displayNameOfFn) {
    const content = gameSession.content;

    if (record.outcome === 'correct-then-invalidated') {
      const stage1 = content.drawCorrectStage1();
      hud.showResultHeadline(stage1.text);
      sfx.revealCorrectStage1();
      confetti.burst(worldPosOfObjectIdFn(setup.clueTarget.id));
      await delay(500);
      confetti.freeze();
      sfx.scratchStop();
      const stage2 = content.drawCorrectStage2();
      hud.showResultHeadline(stage2.text);
      await delay(700);
      confetti.clear();
    } else {
      sfx.revealWrong();
    }

    const punchlinePos = worldPosOfObjectIdFn(setup.punchlineTarget.id);
    mattRig.setGazeTargets({ headWorldPos: punchlinePos, leftEyeWorldPos: punchlinePos, rightEyeWorldPos: punchlinePos });
    mattRig.setClueTarget(punchlinePos);

    const proximity = record.outcome === 'wrong' && !timedOut ? classifyProximity(setup, record.playerPickInstanceId) : null;

    const lines = [];
    if (record.outcome === 'wrong') {
      lines.push(content.drawWrong(wrongTierForRoundIndex(gameSession.roundIndex)).text);
    }
    if (proximity) lines.push(content.drawProximity(proximity).text);
    lines.push(`He was looking at the ${displayNameOfFn(setup.punchlineTarget)}.`);
    lines.push(setup.joke.text);
    if (setup.eventFlavor) lines.push(setup.eventFlavor.text);

    hud.showResultHeadline(record.outcome === 'wrong' ? 'WRONG.' : 'WELL... YOU WERE.');
    hud.showResultBody(lines);
    await delay(2200);

    if (setup.fakeHint) {
      hud.showFakeHint(setup.fakeHint.text);
      await delay(1600);
    }
    hud.clearResult();
  }

  async function runHalftime(gameSession) {
    const scoreText = gameSession.playerCount > 1 ? '0/5 PER PLAYER' : '0/5';
    hud.showHalftime(scoreText);
    sfx.halftimeWhistle();
    await delay(2600);
    hud.clearHalftime();
  }

  async function runFinale(gameSession) {
    sfx.finaleSting();
    hud.showFinaleHeader('THE MATT RAMAGE SHOW');
    const finalPos = mattRig.root.getWorldPosition(new THREE.Vector3());
    mattRig.setGazeTargets({ headWorldPos: finalPos, leftEyeWorldPos: finalPos, rightEyeWorldPos: finalPos });
    await delay(1600);

    const verdictText = gameSession.playerCount > 1
      ? gameSession.content.drawMultiplayerVerdict().text
      : 'PERFECT.';
    const closingLine = CLOSING_LINES[Math.floor(Math.random() * CLOSING_LINES.length)];
    const shareDataUrl = typeof captureShareImage === 'function' ? captureShareImage() : null;

    hud.showEndScreen({
      scoreText: gameSession.playerCount > 1 ? 'TEAM SCORE: 0/10' : '0/10',
      verdictText,
      closingLine,
      shareDataUrl,
    });
  }

  async function playGame(gameSession) {
    if (!mattPlaced) {
      placeInWorld(worldRoot, mattRig.root, MATT_START_SPHERICAL);
      mattPlaced = true;
    }
    for (let i = 0; i < 10; i++) {
      await runOneRound(gameSession);
    }
    await runFinale(gameSession);
  }

  function update(dt) {
    mattRig.update(dt);
    for (const rig of secondMattRigs.values()) rig.update(dt);
    confetti.update(dt);
  }

  return { playGame, update };
}
