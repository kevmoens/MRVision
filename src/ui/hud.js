const ROUND_LABELS = {
  'simple-misdirection': 'Round 1',
  'object-behind-you': 'Round 2 — The Object Behind You',
  'object-moves': 'Round 3 — The Object Moves',
  'too-many-of-them': 'Round 4 — Too Many Of Them',
  'ramage-compass-tease': 'Round 5',
  'object-invades-real-space': 'Round 6',
  'another-matt': 'Round 7 — Another Matt',
  'fake-easy-round': 'Round 8',
  'total-chaos': 'Round 9 — Total Chaos',
  'impossible-finale': 'Round 10 — For Everything',
};

/**
 * Vanilla-DOM HUD layered over the canvas (#hud-root). No framework --
 * this is a handful of overlay cards shown/hidden across a short (1-2 min)
 * scripted experience, not a real UI tree that needs virtual-DOM diffing.
 */
export function createHud() {
  const root = document.getElementById('hud-root');

  const top = document.createElement('div');
  top.className = 'wim-overlay-top';
  const center = document.createElement('div');
  center.className = 'wim-overlay-center';
  const bottom = document.createElement('div');
  bottom.className = 'wim-overlay-bottom';
  root.append(top, center, bottom);

  function clearZone(zone) {
    zone.innerHTML = '';
  }

  function showStartScreen({ onStart }) {
    clearZone(center);
    let playerCount = 1;
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `
      <div class="wim-title">WHAT IS MATT LOOKING AT?</div>
      <div class="wim-subtitle">A Matt Ramage mixed-reality experience</div>
      <div class="wim-subtitle">How many are playing?</div>
    `;
    const select = document.createElement('div');
    select.className = 'wim-player-select';
    [1, 2, 3, 4].forEach((n) => {
      const btn = document.createElement('button');
      btn.textContent = n === 1 ? 'Solo' : `${n}`;
      if (n === 1) btn.classList.add('active');
      btn.addEventListener('click', () => {
        playerCount = n;
        select.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      select.appendChild(btn);
    });
    card.appendChild(select);
    const startBtn = document.createElement('button');
    startBtn.className = 'wim-btn';
    startBtn.textContent = 'TAP TO START';
    startBtn.addEventListener('click', () => onStart(playerCount), { once: true });
    card.appendChild(startBtn);
    center.appendChild(card);
  }

  function showLoading(text) {
    clearZone(center);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `<div class="wim-subtitle">${text}</div>`;
    center.appendChild(card);
  }

  function clearStart() {
    clearZone(center);
  }

  function showRoundHeader({ roundNumber, roundTypeId, playerIndex, playerCount, flavorText }) {
    clearZone(top);
    const card = document.createElement('div');
    card.className = 'wim-card';
    const label = ROUND_LABELS[roundTypeId] || `Round ${roundNumber}`;
    let turnHtml = '';
    if (playerCount > 1) {
      turnHtml = `<div class="wim-turn">Player ${playerIndex + 1}'s turn</div>`;
    }
    card.innerHTML = `
      <div class="wim-round-badge">${label}</div>
      ${flavorText ? `<div class="wim-subtitle">${flavorText}</div>` : ''}
      ${turnHtml}
    `;
    top.appendChild(card);
  }

  function showResultHeadline(text) {
    clearZone(center);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `<div class="wim-headline">${text}</div>`;
    center.appendChild(card);
  }

  function showResultBody(lines) {
    clearZone(center);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = lines.map((l) => `<div class="wim-body-line">${l}</div>`).join('');
    center.appendChild(card);
  }

  function showFakeHint(text) {
    clearZone(bottom);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `<div class="wim-fake-hint">${text}</div>`;
    bottom.appendChild(card);
  }

  function clearResult() {
    clearZone(center);
    clearZone(bottom);
    clearZone(top);
  }

  function showHalftime(scoreText) {
    clearZone(center);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `
      <div class="wim-round-badge">HALFTIME REPORT</div>
      <div class="wim-headline">${scoreText}</div>
      <div class="wim-subtitle">Nobody has gotten it right. This is going about as expected.</div>
    `;
    center.appendChild(card);
  }

  function clearHalftime() {
    clearZone(center);
  }

  function showFinaleHeader(text) {
    clearZone(top);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `<div class="wim-headline">${text}</div>`;
    top.appendChild(card);
  }

  function showEndScreen({ scoreText, verdictText, closingLine, shareDataUrl }) {
    clearZone(top);
    clearZone(bottom);
    clearZone(center);
    const card = document.createElement('div');
    card.className = 'wim-card';
    card.innerHTML = `
      <div class="wim-round-badge">FINAL SCORE</div>
      <div class="wim-headline">${scoreText}</div>
      <div class="wim-subtitle">${verdictText}</div>
      <div class="wim-body-line">${closingLine}</div>
    `;
    if (shareDataUrl) {
      const img = document.createElement('img');
      img.className = 'wim-share-img';
      img.src = shareDataUrl;
      card.appendChild(img);
    }
    const shareBtn = document.createElement('button');
    shareBtn.className = 'wim-btn';
    shareBtn.textContent = shareDataUrl ? 'SHARE' : 'PLAY AGAIN';
    shareBtn.addEventListener('click', async () => {
      if (shareDataUrl && navigator.share) {
        try {
          const blob = await (await fetch(shareDataUrl)).blob();
          const file = new File([blob], 'matt-looking-at.png', { type: 'image/png' });
          await navigator.share({ files: [file], title: 'What Is Matt Looking At?', text: closingLine });
        } catch {
          // user cancelled or share unsupported for files -- silently fall through
        }
      } else {
        window.location.reload();
      }
    });
    card.appendChild(shareBtn);

    if (shareDataUrl) {
      const again = document.createElement('button');
      again.className = 'wim-btn';
      again.style.marginLeft = '8px';
      again.textContent = 'PLAY AGAIN';
      again.addEventListener('click', () => window.location.reload());
      card.appendChild(again);
    }

    center.appendChild(card);
  }

  return {
    showStartScreen,
    showLoading,
    clearStart,
    showRoundHeader,
    showResultHeadline,
    showResultBody,
    showFakeHint,
    clearResult,
    showHalftime,
    clearHalftime,
    showFinaleHeader,
    showEndScreen,
  };
}
