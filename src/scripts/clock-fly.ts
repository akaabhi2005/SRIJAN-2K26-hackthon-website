import { storyLayout } from './story-layout';
// Hero clock -> corner chip. FLIP-style, scroll-linked: while the pinned hero scrolls, the REAL hero clock (.f1 .rl-clock) is moved with
// transform + opacity only, from its natural position to the chip's rect; the chip crossfades in as it arrives. Everything is a pure
// function of scrollY (no timers, no tween): scrolling back to 0 puts the clock exactly back (inline styles removed), however fast you jump.
// The hero clock keeps its layout box, so nothing reflows (CLS 0). Digits are written once per second by reg-countdown.ts into both the
// hero clock and the chip, so they can never disagree. Without the scroll timeline (or in the closed state) the chip just appears when the
// hero line has left the screen, as before. Reduced motion: reg-countdown.ts creates no chip, so there is no flight at all.
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const FLY = 0.7; // flight completes after this many hero-frame lengths (F = 0.9 * viewport height) of scrolling

export function initChip() {
  const chip = document.querySelector<HTMLElement>('.reg-chip');
  const story = document.querySelector<HTMLElement>('.story');
  if (!chip || !story) return;
  const stage = story.querySelector<HTMLElement>('.stage');
  const clock = document.querySelector<HTMLElement>('.f1 .regline .rl-clock');
  const regs = [...document.querySelectorAll<HTMLElement>('[data-reg-btn]')].filter((a) => !a.closest('.top, .dock, .story'));
  const lastReg = story.querySelector<HTMLElement>('.f6 [data-reg-btn]'); // the last frame's button: only a real target once the pinned story is over (its frame is hidden before that)
  let pinned = false;
  let canFly = false;

  let F = 0.9 * innerHeight;
  let g: { dx: number; dy: number; s: number } | null = null;
  // Geometry from layout offsets (immune to the transform we apply) + the chip's fixed rect. Recomputed on resize, font load, size changes.
  const measure = () => {
    const layout = storyLayout();
    pinned = !!layout;
    canFly = pinned && !!stage && !!clock;
    F = layout?.step || 0.9 * innerHeight;
    if (!canFly || !stage || !clock) { g = null; return; }
    let x = 0, y = 0, e: HTMLElement | null = clock;
    for (; e && e !== stage; e = e.offsetParent as HTMLElement | null) { x += e.offsetLeft; y += e.offsetTop; }
    const w = clock.offsetWidth, h = clock.offsetHeight;
    if (e !== stage || !w || !h) { g = null; return; }
    const c = chip.getBoundingClientRect();
    if (!c.width) { g = null; return; }
    const left = stage.getBoundingClientRect().left, top = parseFloat(getComputedStyle(stage).top) || 0;
    g = { dx: c.left + c.width / 2 - (left + x + w / 2), dy: c.top + c.height / 2 - (top + y + h / 2), s: Math.min(1, (c.width * 0.9) / w) };
  };

  const resetClock = () => { if (clock?.style.transform || clock?.style.opacity) { clock.style.transform = ''; clock.style.opacity = ''; clock.style.willChange = ''; } };
  // text/links the chip must not sit on while scrolling past them (fee labels, partner/contact links, FAQ rows, footer contact cards)
  const avoid = [...document.querySelectorAll<HTMLElement>('.fee li, .sp-row a, .faq-more a, details>summary, footer .person')].filter((a) => !a.closest('.top'));
  const overlaps = (r: DOMRect, c: DOMRect, m: number) => r.width > 0 && r.bottom > c.top - m && r.top < c.bottom + m && r.right > c.left - m && r.left < c.right + m;

  let raf = 0;
  const update = () => {
    raf = 0;
    const y = scrollY, vh = innerHeight;
    const open = chip.dataset.state === 'open';
    const flying = canFly && open && g;
    // where the chip must stay away: the last frame (has its own line) and any lower Register button passing under it
    let allowedHere = true;
    if (pinned) { const end = story.offsetTop + story.offsetHeight - vh; allowedHere = !(y > 4.9 * F && y < end + 0.35 * vh); }
    const gate = () => {
      const c = chip.getBoundingClientRect();
      if (regs.some((a) => overlaps(a.getBoundingClientRect(), c, 8))) return false;
      if (lastReg && (!pinned || y > 4.9 * F) && overlaps(lastReg.getBoundingClientRect(), c, 8)) return false;
      if (avoid.some((a) => overlaps(a.getBoundingClientRect(), c, 4))) return false;
      const a = document.activeElement as HTMLElement | null;
      return !(a && a !== document.body && a !== chip && overlaps(a.getBoundingClientRect(), c, 4)); // never cover the focused control
    };
    if (flying && g) {
      const p = clamp01(y / (FLY * F));
      const e = smooth(p), cf = smooth((p - 0.8) / 0.2);
      if (p <= 0) resetClock();
      else {
        clock!.style.willChange = 'transform, opacity';
        clock!.style.transform = `translate3d(${(g.dx * e).toFixed(2)}px, ${(g.dy * e).toFixed(2)}px, 0) scale(${(1 + (g.s - 1) * e).toFixed(4)})`;
        clock!.style.opacity = (1 - cf).toFixed(3);
      }
      const amt = cf > 0 && allowedHere && gate() ? cf : 0;
      chip.classList.add('fly');
      chip.style.setProperty('--cf', amt.toFixed(3));
      chip.classList.toggle('on', amt > 0.5);
      return;
    }
    resetClock();
    chip.classList.remove('fly'); chip.style.removeProperty('--cf');
    let show: boolean;
    if (pinned) show = y > 0.97 * F && allowedHere;
    else { const on = (r?: DOMRect) => !!r && r.bottom > 64 && r.top < vh; show = !on(document.querySelector('.f1 .regline')?.getBoundingClientRect()) && !on(document.querySelector('.f6 .regline')?.getBoundingClientRect()); }
    chip.classList.toggle('on', show && gate());
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  let measurement = 0;
  const remeasure = () => { if (!measurement) measurement = requestAnimationFrame(() => { measurement = 0; measure(); req(); }); };

  measure(); update();
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', remeasure);
  addEventListener('storylayoutchange', remeasure);
  addEventListener('pageshow', remeasure);
  addEventListener('focusin', req); addEventListener('focusout', req);
  document.fonts?.ready.then(remeasure);
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(remeasure); ro.observe(chip); if (clock) ro.observe(clock); }
  // the first digits / the closed text change the chip's width: refresh once the countdown module has settled
  new MutationObserver(remeasure).observe(chip, { childList: true, attributes: true, attributeFilter: ['data-state'] });
}
