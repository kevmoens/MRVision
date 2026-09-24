import { createRenderer, createScene, watchResize } from './engine/renderer.js';
import { selectTier } from './engine/tierSelect.js';
import { unlock as unlockAudio } from './engine/audio.js';
import { buildMatt, preloadMattModel } from './matt/buildMatt.js';
import { preloadObjectModels } from './objects/registry.js';
import { loadContent } from './game/contentLoader.js';
import { createGameContent } from './game/selectRound.js';
import { GameSession } from './game/gameSession.js';
import { createRoundRunner } from './game/roundRunner.js';
import { createHud } from './ui/hud.js';
import { loadPersistedHistory, savePersistedHistory, beginNewSession } from './game/history.js';

function captureShareImage(renderer) {
  try {
    const src = renderer.domElement;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, out.height - 90, out.width, 90);
    ctx.fillStyle = '#f4d35e';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WHAT IS MATT LOOKING AT?', out.width / 2, out.height - 40);
    return out.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function main() {
  const canvas = document.getElementById('app-canvas');
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const hud = createHud();

  hud.showStartScreen({
    onStart: async (playerCount) => {
      try {
        hud.clearStart();

        // AR/motion/camera permission requests happen inside selectTier,
        // and MUST stay as close to this click-gesture as possible -- see
        // engine/tierSelect.js.
        const driver = await selectTier(renderer, canvas);
        await unlockAudio();

        scene.add(driver.worldRoot);
        watchResize(renderer, driver.camera);

        hud.showLoading('Finding Matt...');
        const { objectsData, jokesData } = await loadContent();
        const persistedHistory = loadPersistedHistory();
        beginNewSession(persistedHistory);
        const content = createGameContent({ objectsData, jokesData, persistedHistory });

        await Promise.all([preloadMattModel(), preloadObjectModels()]);
        const mattRig = buildMatt({ scale: 1 });

        const roundRunner = createRoundRunner({
          worldRoot: driver.worldRoot,
          camera: driver.camera,
          canvas,
          mattRig,
          hud,
          captureShareImage: () => captureShareImage(renderer),
        });

        const gameSession = new GameSession({ content, persistedHistory, playerCount });

        driver.start(renderer, scene, (dt) => {
          roundRunner.update(dt);
        });

        hud.clearStart();
        await roundRunner.playGame(gameSession);

        savePersistedHistory(persistedHistory);
      } catch (err) {
        console.error('[wim] fatal error', err);
        hud.showLoading('Something went wrong. Please reload and try again.');
      }
    },
  });
}

main();
