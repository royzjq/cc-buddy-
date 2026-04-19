import { ANIMALS, loadAnimal } from './sprite.js';
import { playChime } from './sound.js';

const SPRITES_BASE = '/sprites';
const CELL_SIZE = 140;
const BOB_PX = 3;

const ANIMAL_NAMES = {
  orange_cat:  '\u6a58\u732b',
  tuxedo_cat:  '\u5976\u725b\u732b',
  chipmunk:    '\u82b1\u6817\u9f20',
  beagle:      '\u53ef\u7231\u6bd4\u683c',
  evil_beagle: '\u90aa\u6076\u6bd4\u683c',
  hamster:     '\u91d1\u4ed3\u9f20',
  red_panda:   '\u5c0f\u718a\u732b',
};

const CWD_MAP_KEY = 'cc-buddy:animalByCwd';

function loadCwdMap() {
  try {
    const raw = localStorage.getItem(CWD_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveCwdMap(map) {
  try { localStorage.setItem(CWD_MAP_KEY, JSON.stringify(map)); } catch {}
}

const STATE_FRAMES = {
  idle:       ['idle'],
  working:    ['typing_a', 'typing_c', 'typing_b', 'typing_c'],
  question:   ['alert'],
  done:       ['celebrate'],
  reactAlert: ['alert'],
};
const FRAME_MS = { idle: 600, working: 160, question: 600, done: 600, reactAlert: 600 };

const BLINK_MIN_MS = 4000;
const BLINK_MAX_MS = 8000;
const BLINK_HOLD_MS = 160;
const REACT_MS = 1200;
const DONE_MS = 2800;

class Buddy {
  constructor(sessionId, sprites, animalKind, terminalNumber, cwd, ppid) {
    this.sessionId = sessionId;
    this.sprites = sprites;
    this.animalKind = animalKind;
    this.terminalNumber = terminalNumber;
    this.cwd = cwd || null;
    this.ppid = ppid ?? null;
    this.state = 'idle';
    this.prevState = 'idle';
    this.frameIdx = 0;
    this.frameTimer = 0;
    this._reactTimer = 0;
    this._doneTimer = 0;
    this._blinkUntil = 0;
    this._nextBlinkAt = performance.now() + BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
    this._facing = 1;
    this._speechT = null;

    this.el = document.createElement('div');
    this.el.className = 'buddy-slot';

    this.bubble = document.createElement('div');
    this.bubble.className = 'buddy-bubble hidden';
    this.el.appendChild(this.bubble);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CELL_SIZE;
    this.canvas.height = CELL_SIZE + BOB_PX * 2;
    this.canvas.className = 'buddy-canvas';
    this.el.appendChild(this.canvas);

    this.label = document.createElement('div');
    this.label.className = 'buddy-label';
    this.label.textContent = `T${terminalNumber}`;
    this.el.appendChild(this.label);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  setAnimal(kind, sprites) {
    this.animalKind = kind;
    this.sprites = sprites;
  }

  setState(state) {
    if (this.state === state) return;
    this.prevState = this.state;
    this.state = state;
    this.frameIdx = 0;
    this.frameTimer = 0;
    if (state === 'question') this._setBubble('?', 'question');
    else if (state !== 'done') this._hideBubble();
  }

  triggerReact(facing) {
    if (this.state !== 'reactAlert') this.prevState = this.state;
    this.state = 'reactAlert';
    this.frameIdx = 0;
    this.frameTimer = 0;
    this._facing = facing;
    this._reactTimer = REACT_MS;
  }

  triggerDone() {
    this.showSpeech('\u5b8c\u6210\u5566\uff01', DONE_MS);
    this.state = 'done';
    this.frameIdx = 0;
    this.frameTimer = 0;
    this._doneTimer = DONE_MS;
  }

  showSpeech(text, timeout = 2800) {
    this._setBubble(text, 'speech');
    if (this._speechT) clearTimeout(this._speechT);
    this._speechT = setTimeout(() => {
      if (this.state === 'question') this._setBubble('?', 'question');
      else this._hideBubble();
    }, timeout);
  }

  _setBubble(html, kind) {
    this.bubble.className = `buddy-bubble ${kind}`;
    this.bubble.innerHTML = html;
  }
  _hideBubble() {
    this.bubble.className = 'buddy-bubble hidden';
    this.bubble.innerHTML = '';
  }

  tick(dt) {
    const frames = STATE_FRAMES[this.state] || STATE_FRAMES.idle;
    const frameMs = FRAME_MS[this.state] || 600;
    this.frameTimer += dt;
    if (this.frameTimer >= frameMs) {
      this.frameTimer = 0;
      this.frameIdx = (this.frameIdx + 1) % frames.length;
    }

    if (this.state === 'reactAlert') {
      this._reactTimer -= dt;
      if (this._reactTimer <= 0) {
        this.state = this.prevState;
        this._facing = 1;
        this.frameIdx = 0;
      }
    } else if (this.state === 'done') {
      this._doneTimer -= dt;
      if (this._doneTimer <= 0) {
        this.state = 'idle';
        this.frameIdx = 0;
      }
    }

    const now = performance.now();
    let blinking = false;
    if (this.state === 'idle') {
      if (now < this._blinkUntil) {
        blinking = true;
      } else if (now >= this._nextBlinkAt) {
        this._blinkUntil = now + BLINK_HOLD_MS;
        this._nextBlinkAt = now + BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
        blinking = true;
      }
    }

    this._draw(blinking);
  }

  _draw(blinking) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const frames = STATE_FRAMES[this.state] || STATE_FRAMES.idle;
    let pose = frames[this.frameIdx % frames.length];
    if (blinking) pose = 'blink';
    const img = this.sprites[pose] || this.sprites.idle;
    if (!img) return;

    const t = performance.now() * 0.002;
    const bob = Math.round(Math.sin(t) * BOB_PX);
    const scale = Math.min(CELL_SIZE / img.width, CELL_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (CELL_SIZE - w) / 2;
    const y = (CELL_SIZE - h) / 2 + BOB_PX + bob;

    if (this._facing === -1) {
      ctx.save();
      ctx.translate(CELL_SIZE, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
  }

  dispose() {
    if (this._speechT) clearTimeout(this._speechT);
    this.el.remove();
  }
}

export class Playground {
  constructor(container) {
    this.container = container;
    this.buddies = new Map();
    this.spritesByAnimal = {};
    this.usedAnimals = new Set();
    this._nextTerminal = 1;
    this._menuEl = null;
    this.ready = this._preload();
    this._lastT = performance.now();
    requestAnimationFrame(this._tick);
    document.addEventListener('click', () => this._closeMenu());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this._closeMenu(); });
  }

  async _preload() {
    const entries = await Promise.all(
      ANIMALS.map(async (a) => [a, await loadAnimal(SPRITES_BASE, a)])
    );
    this.spritesByAnimal = Object.fromEntries(entries);
  }

  _pickAnimal() {
    const free = ANIMALS.filter((a) => !this.usedAnimals.has(a));
    const pool = free.length ? free : ANIMALS.slice();
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.usedAnimals.add(pick);
    return pick;
  }

  async addBuddy(sessionId, cwd = null, ppid = null) {
    await this.ready;
    if (this.buddies.has(sessionId)) return this.buddies.get(sessionId);
    const saved = cwd ? loadCwdMap()[cwd] : null;
    const animal = saved && this.spritesByAnimal[saved] ? saved : this._pickAnimal();
    if (saved) this.usedAnimals.add(animal);
    const buddy = new Buddy(sessionId, this.spritesByAnimal[animal], animal, this._nextTerminal++, cwd, ppid);
    this.buddies.set(sessionId, buddy);
    buddy.el.addEventListener('click', () => this._onBuddyClick(sessionId));
    buddy.el.addEventListener('contextmenu', (e) => this._onBuddyContext(e, sessionId));
    buddy.el.addEventListener('mousedown', async (e) => {
      if (e.button !== 0) return;
      if (!(window.__TAURI__ || window.__TAURI_INTERNALS__)) return;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().startDragging();
      } catch {}
    });
    this.container.appendChild(buddy.el);
    return buddy;
  }

  _onBuddyContext(e, sid) {
    e.preventDefault();
    e.stopPropagation();
    const buddy = this.buddies.get(sid);
    if (!buddy) return;
    this._closeMenu();
    const menu = document.createElement('div');
    menu.className = 'animal-menu';
    for (const kind of ANIMALS) {
      const item = document.createElement('button');
      item.className = 'animal-menu-item';
      if (kind === buddy.animalKind) item.classList.add('current');
      const thumb = document.createElement('img');
      thumb.src = `${SPRITES_BASE}/${kind}_idle.png`;
      thumb.alt = '';
      const name = document.createElement('span');
      name.textContent = ANIMAL_NAMES[kind] || kind;
      item.appendChild(thumb);
      item.appendChild(name);
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._pickAnimalFor(sid, kind);
        this._closeMenu();
      });
      menu.appendChild(item);
    }
    const sep = document.createElement('div');
    sep.className = 'animal-menu-sep';
    menu.appendChild(sep);
    const del = document.createElement('button');
    del.className = 'animal-menu-item animal-menu-delete';
    del.textContent = '删除';
    del.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeBuddy(sid);
      this._closeMenu();
    });
    menu.appendChild(del);
    const quit = document.createElement('button');
    quit.className = 'animal-menu-item animal-menu-delete';
    quit.textContent = '退出程序';
    quit.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      this._closeMenu();
      try {
        if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
          return;
        }
      } catch {}
      window.close();
    });
    menu.appendChild(quit);
    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const x = Math.min(e.clientX, vw - rect.width - 6);
    const y = Math.min(e.clientY, vh - rect.height - 6);
    menu.style.left = `${Math.max(4, x)}px`;
    menu.style.top = `${Math.max(4, y)}px`;
    menu.style.visibility = 'visible';
    this._menuEl = menu;
  }

  _closeMenu() {
    if (this._menuEl) {
      this._menuEl.remove();
      this._menuEl = null;
    }
  }

  _pickAnimalFor(sid, kind) {
    const buddy = this.buddies.get(sid);
    if (!buddy) return;
    if (buddy.animalKind === kind) return;
    const sprites = this.spritesByAnimal[kind];
    if (!sprites) return;
    this.usedAnimals.delete(buddy.animalKind);
    this.usedAnimals.add(kind);
    buddy.setAnimal(kind, sprites);
    if (buddy.cwd) {
      const m = loadCwdMap();
      m[buddy.cwd] = kind;
      saveCwdMap(m);
    }
  }

  _onBuddyClick(clickedSid) {
    const clicked = this.buddies.get(clickedSid);
    if (!clicked) return;
    const rect = clicked.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    for (const [sid, b] of this.buddies) {
      if (sid === clickedSid) continue;
      const r = b.el.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      const facing = cx < mx ? -1 : 1;
      b.triggerReact(facing);
    }
  }

  removeBuddy(sessionId) {
    const b = this.buddies.get(sessionId);
    if (!b) return;
    this.usedAnimals.delete(b.animalKind);
    b.dispose();
    this.buddies.delete(sessionId);
    if (this.buddies.size === 0) this._nextTerminal = 1;
  }

  setState(sessionId, state) {
    const b = this.buddies.get(sessionId);
    if (!b) return;
    if (state === 'done') {
      b.triggerDone();
      return;
    }
    const prev = b.state;
    b.setState(state);
    if (state === 'question' && prev !== 'question') {
      playChime();
    }
  }

  _tick = (t) => {
    const dt = t - this._lastT;
    this._lastT = t;
    for (const b of this.buddies.values()) b.tick(dt);
    requestAnimationFrame(this._tick);
  };
}
