const bar5h = document.getElementById('bar5h');
const barWeek = document.getElementById('barWeek');
const pct5h = document.getElementById('pct5h');
const pctWeek = document.getElementById('pctWeek');

function setBar(fill, pctEl, value) {
  const v = Math.max(0, Math.min(100, value));
  fill.style.width = `${v}%`;
  pctEl.textContent = `${Math.round(v)}%`;
}

export function updateUsage({ fiveHour, weekly } = {}) {
  if (typeof fiveHour === 'number') setBar(bar5h, pct5h, fiveHour);
  if (typeof weekly === 'number') setBar(barWeek, pctWeek, weekly);
}

export function startUsagePolling(getStats) {
  let backoffUntil = 0;
  const tick = async () => {
    if (Date.now() < backoffUntil) return;
    try {
      const stats = await getStats();
      if (stats) updateUsage(stats);
      else backoffUntil = Date.now() + 5 * 60_000;
    } catch {
      backoffUntil = Date.now() + 5 * 60_000;
    }
  };
  tick();
  setInterval(tick, 60_000);
}
