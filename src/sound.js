let ctx = null;
let lastPlayed = 0;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function playChime({ cooldownMs = 1200 } = {}) {
  const now = Date.now();
  if (now - lastPlayed < cooldownMs) return;
  lastPlayed = now;

  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
  master.connect(ac.destination);

  const partials = [
    { freq: 880, gain: 1.0 },
    { freq: 1320, gain: 0.35 },
  ];
  for (const p of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.freq, t0);
    g.gain.setValueAtTime(p.gain, t0);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + 1.5);
  }
}
