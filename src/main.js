import { Playground } from './playground.js';
import { startUsagePolling, updateUsage } from './usage.js';

const playgroundEl = document.getElementById('playground');
const playground = new Playground(playgroundEl);

async function ensureBuddy(e) {
  if (!e.session_id) return;
  if (!playground.buddies.has(e.session_id)) {
    await playground.addBuddy(e.session_id, e.cwd || null, e.ppid ?? null);
  }
}

async function dispatch(e) {
  if (!e || typeof e !== 'object') return;
  switch (e.type) {
    case 'session_start':
      await playground.addBuddy(e.session_id, e.cwd || null, e.ppid ?? null);
      break;
    case 'notification':
      await ensureBuddy(e);
      playground.setState(e.session_id, 'question');
      break;
    case 'thinking':
      await ensureBuddy(e);
      playground.setState(e.session_id, 'working');
      break;
    case 'stop':
      await ensureBuddy(e);
      playground.setState(e.session_id, 'done');
      break;
    case 'done':
      await ensureBuddy(e);
      playground.setState(e.session_id, 'idle');
      break;
    case 'session_end':
      playground.removeBuddy(e.session_id);
      break;
    case 'usage':
      if (e.payload) updateUsage(e.payload);
      break;
  }
}

async function wireTransport() {
  const isTauri = !!(window.__TAURI__ || window.__TAURI_INTERNALS__);
  if (isTauri) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      await listen('hook-event', (event) => {
        const payload = event.payload;
        if (Array.isArray(payload)) payload.forEach(dispatch);
        else dispatch(payload);
      });
      console.info('[cc-buddy] subscribed to Tauri hook-event');
      return;
    } catch (e) {
      console.warn('[cc-buddy] Tauri event subscribe failed, falling back to WS', e);
    }
  }
  connectWs();
}

function connectWs() {
  let backoff = 1000;
  const open = () => {
    const ws = new WebSocket('ws://127.0.0.1:19444');
    ws.onopen = () => { backoff = 1000; console.info('[cc-buddy] WS connected'); };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (Array.isArray(data)) data.forEach(dispatch);
        else dispatch(data);
      } catch {
        console.warn('[cc-buddy] bad WS payload', ev.data);
      }
    };
    ws.onclose = () => {
      setTimeout(open, backoff);
      backoff = Math.min(backoff * 2, 15000);
    };
    ws.onerror = () => ws.close();
  };
  open();
}

wireTransport();

async function setupClickThrough() {
  if (!(window.__TAURI__ || window.__TAURI_INTERNALS__)) return;
  let invoke;
  try {
    ({ invoke } = await import('@tauri-apps/api/core'));
  } catch { return; }

  const push = () => {
    const rects = [];
    document.querySelectorAll('.buddy-slot').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) rects.push([r.left, r.top, r.width, r.height]);
    });
    const menu = document.querySelector('.animal-menu');
    if (menu) {
      const r = menu.getBoundingClientRect();
      rects.push([r.left, r.top, r.width, r.height]);
    }
    invoke('set_hot_regions', { rects }).catch(() => {});
  };

  setInterval(push, 150);
  push();
}
setupClickThrough();

startUsagePolling(async () => {
  if (!(window.__TAURI__ || window.__TAURI_INTERNALS__)) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const snap = await invoke('get_usage');
    if (snap?.error) {
      console.warn('[cc-buddy] ccusage:', snap.error);
      return null;
    }
    return {
      fiveHour: snap?.five_hour?.percent || 0,
      weekly: snap?.weekly?.percent || 0,
    };
  } catch (e) {
    console.warn('[cc-buddy] get_usage failed', e);
    return null;
  }
});

// Demo spawn when no live session connects shortly after boot. Dev-only.
if (import.meta.env.DEV) {
  setTimeout(() => {
    if (playground.buddies.size === 0) {
      console.info('[cc-buddy] no live sessions \u2014 spawning demo');
      dispatch({ type: 'session_start', session_id: 'demo-1' });
      setTimeout(() => dispatch({ type: 'thinking', session_id: 'demo-1' }), 1800);
      setTimeout(() => dispatch({ type: 'notification', session_id: 'demo-1' }), 6000);
      setTimeout(() => dispatch({ type: 'stop', session_id: 'demo-1' }), 11000);
    }
  }, 1500);
}
