// Registration countdown clock. Bundled by Astro as an external module (no inline script, CSP unchanged).
// Source of truth: registration.closes in event.json, an ISO string with an explicit +05:30 offset, so Date.parse is timezone-proof.
// Every tick recomputes from Date.now(); seconds round up, so the clock never reads 00 : 00 : 00 : 00 or goes negative: at the close
// it is replaced by the closed text. Ticking digits are aria-hidden; screen readers get one line, rewritten at most once a minute.
import { jump } from './scroller';
import { initChip } from './clock-fly';
const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-reg-closes]'));
const closes = lines.length ? Date.parse(lines[0].dataset.regCloses || '') : NaN;
const { lead = '', compact = '', closed = '', units = '' } = lines[0]?.dataset ?? {};

// After the close: Register buttons become an honest, disabled-looking "Registration closed" (no navigation) and the FAQ answer goes past tense.
function markClosed() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-reg-btn]').forEach((a) => {
    if (a.getAttribute('aria-disabled') === 'true') return;
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('role', 'link');
    a.removeAttribute('href'); a.removeAttribute('target'); a.removeAttribute('rel'); a.removeAttribute('data-register');
    a.textContent = closed;
  });
  document.querySelectorAll<HTMLElement>('[data-reg-faq],[data-reg-copy],[data-reg-past]').forEach((p) => { if (p.dataset.closedText) p.textContent = p.dataset.closedText; });
  document.documentElement.classList.add('reg-closed'); // CSS: hides the phone dock, the duplicate hero line and (fading, height kept) the fee block
  // The faded fee block keeps its height so nothing moves at the close. Collapse it only while it is entirely below the viewport (nothing visible can shift).
  const fee = document.querySelector<HTMLElement>('.fee');
  if (fee && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting && e.boundingClientRect.top > 0) { fee.classList.add('gone'); io.disconnect(); } });
    io.observe(fee);
  }
}

if (lines.length && !Number.isNaN(closes)) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [uDay, uHour, uMin] = units.split(',').map((u) => u.toLowerCase());
  const count = (n: number, u: string) => `${n} ${n === 1 && u.endsWith('s') ? u.slice(0, -1) : u}`;
  const pad = (n: number) => String(n).padStart(2, '0');
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') => Object.assign(document.createElement(tag), { className: cls, textContent: text });

  const views = lines.map((line) => {
    const stat = line.querySelector<HTMLElement>('.rl-static')!;
    const clock = line.querySelector<HTMLElement>('.rl-clock')!;
    const sr = el('span', 'sr');
    sr.setAttribute('role', 'timer');
    sr.setAttribute('aria-live', line.hasAttribute('data-live') ? 'polite' : 'off');
    sr.setAttribute('aria-atomic', 'true');
    stat.setAttribute('aria-hidden', 'true');
    return { line, stat, clock, sr, nums: Array.from(clock.querySelectorAll<HTMLElement>('.rl-num')) };
  });

  // Corner chip: created by JS only (none without JS or under reduced motion), aria-hidden. Same clock, compact.
  const chip = reduce ? null : document.body.appendChild(el('div', 'reg-chip'));
  const chipNums: HTMLElement[] = [];
  if (chip) {
    chip.setAttribute('aria-hidden', 'true');
    const t = el('span', 'rc-t');
    for (let i = 0; i < 4; i++) {
      if (i) t.append(el('span', 'rc-c', ':'));
      chipNums.push(t.appendChild(el('span', 'rl-num')));
    }
    chip.append(el('span', 'rc-lead', compact), ' ', t);
  }

  // Fixed-width digit boxes: each digit is its own .rl-d span, so the clock never changes width.
  const setNum = (num: HTMLElement, v: string, animate: boolean) => {
    while (num.children.length < v.length) num.prepend(el('span', 'rl-d'));
    Array.from(num.children).forEach((d, i) => {
      if (d.textContent === v[i]) return;
      d.textContent = v[i];
      if (animate) (d as HTMLElement).animate([{ opacity: 0.2, transform: 'translateY(-0.22em)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
    });
  };

  let srText = '', srAt = -Infinity, timer = 0, done = false, first = true;
  const close = () => {
    done = true; clearTimeout(timer);
    for (const v of views) { v.clock.hidden = true; v.stat.textContent = closed; v.stat.hidden = false; v.sr.textContent = closed; v.line.dataset.state = 'closed'; if (!v.sr.isConnected) v.line.append(v.sr); }
    if (chip) {
      if (chip.dataset.state === 'open') chip.style.width = `${chip.getBoundingClientRect().width}px`; // closing keeps the chip's box: the text swaps, nothing moves (CLS 0)
      chip.textContent = closed; chip.dataset.state = 'closed';
    }
    markClosed();
  };
  const tick = () => {
    const now = Date.now(), ms = closes - now;
    if (ms <= 0) { close(); return; }
    const s = Math.ceil(ms / 1000);
    const vals = [pad(Math.floor(s / 86400)), pad(Math.floor((s % 86400) / 3600)), pad(Math.floor((s % 3600) / 60)), pad(s % 60)];
    const animate = !reduce && !first && !document.hidden;
    for (const v of views) vals.forEach((x, i) => setNum(v.nums[i], x, animate && v.line.getBoundingClientRect().bottom > 0 && v.line.getBoundingClientRect().top < innerHeight));
    if (chip) { vals.forEach((x, i) => setNum(chipNums[i], x, false)); chip.dataset.state = 'open'; }
    const mins = Math.max(1, Math.ceil(ms / 60000)), D = Math.floor(mins / 1440), H = Math.floor((mins % 1440) / 60), M = mins % 60;
    const text = `${lead} ${D ? count(D, uDay) + (H ? ' ' + count(H, uHour) : '') : H ? count(H, uHour) + (M ? ' ' + count(M, uMin) : '') : count(M, uMin)}`;
    if (text !== srText && now - srAt >= 60000) { srText = text; srAt = now; for (const v of views) v.sr.textContent = text; }
    // first tick: the live line goes in with its text already set, so nothing is announced on page load
    if (first) for (const v of views) { v.stat.hidden = true; v.clock.hidden = false; v.line.dataset.state = 'open'; v.line.append(v.sr); }
    first = false;
  };
  // Re-arm on each displayed-second boundary (seconds round up, so the value changes when ms crosses a multiple of 1000).
  const loop = () => { tick(); if (!done) timer = window.setTimeout(loop, ((closes - Date.now()) % 1000) + 5); };
  loop();
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden && !done) loop(); });
}

// Keyboard: in the pinned story, frames 3, 4 and 6 are opacity-0 (still focusable) until scrolled to.
// Focusing a link inside one scrolls the page to that frame, so the focused control is always on screen.
if (window.CSS?.supports?.('animation-timeline: scroll()') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('focusin', (e) => {
    if (!(e.target as Element | null)?.matches?.(':focus-visible')) return; // mouse/touch press must never jump the page
    const f = (e.target as Element | null)?.closest?.('.frame') as HTMLElement | null;
    if (!f || getComputedStyle(f.parentElement as Element).position !== 'sticky') return;
    const i = Number(f.style.getPropertyValue('--fi'));
    const F = 0.9 * innerHeight, y = scrollY;
    if (y >= (i + 0.12) * F && y <= (i + 0.88) * F) return; // frame already active
    jump(Math.round((i + (i === 0 ? 0.02 : 0.55)) * F));
  });
}

// Chip placement, visibility and the hero-clock flight live in clock-fly.ts (pure function of scroll position).
initChip();
