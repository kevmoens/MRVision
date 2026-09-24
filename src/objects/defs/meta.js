import * as THREE from 'three';

function buildNothingLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOTHING', 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.9, 0.22, 1);
  const g = new THREE.Group();
  g.add(sprite);
  return g;
}

export default [{ id: 'nothing', build: buildNothingLabel, colliderRadius: 0.2, animHint: 'none' }];
