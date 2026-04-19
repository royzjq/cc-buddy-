// Tiny on-screen log overlay so we can see errors without DevTools.
// Captures console.{log,info,warn,error} + window error/unhandledrejection.

const MAX = 60;

let panel = null;
let lines = [];

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'devlog';
  panel.style.cssText = [
    'position:fixed', 'left:4px', 'bottom:60px', 'right:4px', 'max-height:50vh',
    'overflow:auto', 'z-index:99999',
    'background:rgba(0,0,0,0.78)', 'color:#cfd3df',
    'font:10px/1.35 ui-monospace,Menlo,Consolas,monospace',
    'padding:6px 8px', 'border-radius:6px',
    'pointer-events:auto', 'white-space:pre-wrap', 'word-break:break-all',
  ].join(';');
  document.body.appendChild(panel);

  // Toggle with backtick
  window.addEventListener('keydown', (e) => {
    if (e.key === '`') panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  return panel;
}

function append(level, args) {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const text = args.map(a => {
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
  const color = { error: '#ff7e7e', warn: '#ffd479', info: '#9bdcff', log: '#cfd3df' }[level] || '#cfd3df';
  lines.push(`<span style="color:#666">${time}</span> <span style="color:${color}">[${level}]</span> ${escape(text)}`);
  if (lines.length > MAX) lines = lines.slice(-MAX);
  const p = ensurePanel();
  p.innerHTML = lines.join('<br>');
  p.scrollTop = p.scrollHeight;
}

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function installDevLog() {
  ensurePanel();
  for (const level of ['log', 'info', 'warn', 'error']) {
    const orig = console[level].bind(console);
    console[level] = (...args) => { append(level, args); orig(...args); };
  }
  window.addEventListener('error', (e) => append('error', [`window.error: ${e.message}`, `${e.filename}:${e.lineno}:${e.colno}`]));
  window.addEventListener('unhandledrejection', (e) => append('error', ['unhandledrejection:', e.reason]));
  append('info', ['devlog ready — backtick (`) to toggle']);
}
