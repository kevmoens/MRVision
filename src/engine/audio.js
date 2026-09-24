/**
 * Lightweight synthesized SFX bank (oscillators/noise via WebAudio) so the
 * game ships with zero external audio asset dependencies for v1. Every cue
 * here is decorative timing support only -- see Timeline usage in
 * roundRunner.js, which always pairs an audio cue with a visual beat so the
 * comedy still lands muted (tailgate/public settings are often silent).
 *
 * AudioContext starts suspended in most browsers; `unlock()` MUST be called
 * synchronously inside the same user-gesture handler as the Tap-to-Start
 * button, alongside any AR/motion permission requests.
 */
let ctx = null;
let unlocked = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export async function unlock() {
  const c = getCtx();
  if (c.state === 'suspended') {
    await c.resume().catch(() => {});
  }
  // Play a near-silent buffer to fully unlock on stricter mobile browsers.
  const buffer = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start(0);
  unlocked = true;
}

function envGain(c, startGain, endGain, duration) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(startGain, c.currentTime);
  gain.gain.linearRampToValueAtTime(endGain, c.currentTime + duration);
  return gain;
}

function tone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.25, sweepTo = null } = {}) {
  if (!unlocked) return;
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (sweepTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), c.currentTime + duration);
  }
  const g = envGain(c, gain, 0.0001, duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function noiseBurst({ duration = 0.2, gain = 0.3, lowpass = 4000 } = {}) {
  if (!unlocked) return;
  const c = getCtx();
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = envGain(c, gain, 0.0001, duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  return src;
}

export const sfx = {
  confettiPop() {
    tone({ freq: 900, type: 'square', duration: 0.08, gain: 0.15 });
    tone({ freq: 1400, type: 'square', duration: 0.06, gain: 0.1 });
  },
  scratchStop() {
    // Fast descending noise + tone sweep to read as a "record scratch".
    noiseBurst({ duration: 0.25, gain: 0.35, lowpass: 2500 });
    tone({ freq: 600, sweepTo: 60, type: 'sawtooth', duration: 0.22, gain: 0.2 });
  },
  revealWrong() {
    tone({ freq: 220, sweepTo: 110, type: 'square', duration: 0.3, gain: 0.18 });
  },
  revealCorrectStage1() {
    tone({ freq: 660, type: 'sine', duration: 0.12, gain: 0.2 });
    setTimeout(() => tone({ freq: 990, type: 'sine', duration: 0.15, gain: 0.2 }), 90);
  },
  halftimeWhistle() {
    tone({ freq: 1800, type: 'square', duration: 0.4, gain: 0.15 });
  },
  tapSelect() {
    tone({ freq: 500, type: 'triangle', duration: 0.05, gain: 0.15 });
  },
  finaleSting() {
    tone({ freq: 200, sweepTo: 900, type: 'sawtooth', duration: 0.6, gain: 0.12 });
  },
};

export function isUnlocked() {
  return unlocked;
}
