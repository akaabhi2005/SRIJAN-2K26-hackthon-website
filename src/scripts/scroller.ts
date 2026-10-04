// Smooth, inertial scrolling (Lenis) layered on top of native scrolling. Lenis drives window.scrollTo, so the CSS scroll-driven
// pinned story keeps working. Off under prefers-reduced-motion; touch keeps native momentum (syncTouch: false).
import Lenis from 'lenis';

export let lenis: Lenis | null = null;
/** Instant jump that is safe with or without Lenis. */
export const jump = (y: number) => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo({ top: y, behavior: 'instant' }));

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pinned = !!window.CSS?.supports?.('animation-timeline: scroll()') && !reduce;

// A fragment opened directly (or restored with Back/Forward) must reveal its pinned frame.
const restoreFrame = () => {
  if (!pinned || !location.hash) return;
  let id: string;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const frame = document.getElementById(id)?.closest<HTMLElement>('.frame');
  const story = document.querySelector<HTMLElement>('.story');
  const stage = story?.querySelector<HTMLElement>('.stage');
  if (!frame || !story || !stage) return;
  const F = (story.offsetHeight - stage.offsetHeight) / 5;
  const i = Number(frame.style.getPropertyValue('--fi'));
  jump(Math.round((i + (i ? .55 : 0)) * F));
};
addEventListener('hashchange', restoreFrame);
addEventListener('popstate', restoreFrame);
const start = () => {
  if (reduce || lenis) return;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, syncTouch: false, autoRaf: false, anchors: false });
  // own rAF loop so it pauses with the tab (like the ember canvas)
  let id = 0;
  const loop = (t: number) => { lenis?.raf(t); id = requestAnimationFrame(loop); };
  const run = () => { if (!id && !document.hidden) id = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(id); id = 0; } else run(); });
  run();
  restoreFrame();
  // In-page links: scroll through Lenis (native smooth-scroll would fight it) and keep focus management for the skip link.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!a || !lenis) return;
    const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
    const t = id ? document.getElementById(id) : document.documentElement;
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    document.querySelector('.menu[open]')?.removeAttribute('open'); // the menu's own click handler no longer sees this event
    const story = document.querySelector<HTMLElement>('.story');
    const stage = story?.querySelector<HTMLElement>('.stage');
    const F = story && stage ? (story.offsetHeight - stage.offsetHeight) / 5 : 0.9 * innerHeight, frame = t.closest<HTMLElement>('.frame');
    let y: number;
    if (a.dataset.f !== undefined && pinned) y = Math.round((+a.dataset.f + 0.5) * F);
    else if (frame && pinned) y = Math.round((Number(frame.style.getPropertyValue('--fi')) + (frame.classList.contains('f1') ? 0 : 0.55)) * F);
    else y = Math.round(t.getBoundingClientRect().top + scrollY - (t === document.documentElement ? 0 : 80));
    lenis.scrollTo(Math.max(0, y), { duration: 1.1, onComplete: () => { if (!frame && t !== document.documentElement) { if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } } });
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  }, true);
};
'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 300);
