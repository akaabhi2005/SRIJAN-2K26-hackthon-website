// Magnetic Register/Partner buttons, FAQ height panels, schedule day tabs (labels from the page).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const live = (el: HTMLElement) => el.getAttribute('aria-disabled') !== 'true' && el.hasAttribute('href');

if (fine && !reduce) {
  const btns = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
  btns.forEach((b) => b.classList.add('btn-laser'));
  const RADIUS = 40;
  const distToBox = (x: number, y: number, r: DOMRect) => {
    const cx = Math.min(Math.max(x, r.left), r.right);
    const cy = Math.min(Math.max(y, r.top), r.bottom);
    return Math.hypot(x - cx, y - cy);
  };
  let pressed = false;
  addEventListener('pointerdown', () => { pressed = true; }, { passive: true });
  addEventListener('pointerup', () => { pressed = false; }, { passive: true });
  addEventListener('pointercancel', () => { pressed = false; }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (pressed) return; // hold position while a press is in progress so the click target never slides
    for (const b of btns) {
      if (!live(b)) { b.style.transform = ''; continue; }
      const r = b.getBoundingClientRect();
      const d = distToBox(e.clientX, e.clientY, r);
      if (d > RADIUS) { b.style.transform = ''; continue; }
      const mx = r.left + r.width / 2, my = r.top + r.height / 2;
      const k = (1 - d / RADIUS) * 0.28;
      b.style.transform = `translate3d(${((e.clientX - mx) * k).toFixed(1)}px, ${((e.clientY - my) * k).toFixed(1)}px, 0)`;
    }
  }, { passive: true });
}

document.querySelectorAll<HTMLDetailsElement>('[data-faq]').forEach((d) => {
  const sum = d.querySelector('summary');
  const panel = d.querySelector<HTMLElement>('.faq-panel');
  const sync = () => {
    sum?.setAttribute('aria-expanded', d.open ? 'true' : 'false');
    if (panel) {
      if (d.open) panel.removeAttribute('inert');
      else panel.setAttribute('inert', '');
    }
  };
  d.addEventListener('toggle', sync);
  sync();
  if (!reduce && sum) {
    // Animate closing too: <details> hides its content the instant `open` is removed, so let the panel collapse first.
    sum.addEventListener('click', (e) => {
      if (!d.open) return;
      e.preventDefault();
      if (d.classList.contains('closing')) return;
      d.classList.add('closing');
      sum.setAttribute('aria-expanded', 'false');
      panel?.setAttribute('inert', '');
      setTimeout(() => { d.open = false; d.classList.remove('closing'); }, 300);
    });
  }
});

const grid = document.querySelector<HTMLElement>('[data-schedule-tabs]');
if (grid) {
  const days = Array.from(grid.querySelectorAll<HTMLDetailsElement>('.day'));
  const bar = document.createElement('div');
  bar.className = 'day-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Schedule');
  const tabs: HTMLButtonElement[] = [];
  const select = (i: number) => {
    days.forEach((day, j) => {
      const on = j === i;
      day.open = true;
      day.toggleAttribute('hidden', !on);
      if (on) day.removeAttribute('inert');
      else day.setAttribute('inert', '');
      const t = tabs[j];
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
  };
  days.forEach((day, i) => {
    const label = (day.querySelector('.date')?.textContent || '').replace(/\s+/g, ' ').trim();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-tab';
    btn.id = `sch-tab-${i}`;
    btn.setAttribute('role', 'tab');
    btn.textContent = label;
    const pid = day.id || `sch-panel-${i}`;
    day.id = pid;
    day.setAttribute('role', 'tabpanel');
    day.setAttribute('aria-labelledby', btn.id);
    btn.setAttribute('aria-controls', pid);
    const sum = day.querySelector('summary');
    if (sum) { sum.setAttribute('aria-hidden', 'true'); sum.tabIndex = -1; }
    btn.addEventListener('click', () => select(i));
    bar.appendChild(btn);
    tabs.push(btn);
  });
  grid.prepend(bar);
  bar.addEventListener('keydown', (e) => {
    const n = tabs.length;
    let i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault();
    tabs[i].focus();
    select(i);
  });
  select(0);
}
