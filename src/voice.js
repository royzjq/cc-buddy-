// Browser SpeechSynthesis wrapper. Works unchanged inside the Tauri webview.
let enabled = true;
const lastSpoke = new Map();

export function setVoiceEnabled(v) { enabled = !!v; }

export function speak(text, { key = null, cooldown = 3000, lang = 'zh-CN', rate = 1.1, volume = 1 } = {}) {
  if (!enabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (key) {
    const now = Date.now();
    const last = lastSpoke.get(key) || 0;
    if (now - last < cooldown) return;
    lastSpoke.set(key, now);
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.volume = volume;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('[voice] speak failed', e);
  }
}
