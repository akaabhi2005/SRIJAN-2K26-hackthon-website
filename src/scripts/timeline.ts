// Scroll-linked SVG draw on [data-timeline]. Path is fully drawn without JS / reduced motion.
const lists = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Track = { root: HTMLElement; path: SVGPathElement; nodes: HTMLElement[]; len: number };
const tracks: Track[] = [];

const layout = (root: HTMLElement): Track | null => {
  const svg = root.querySelector<SVGSVGElement>('.tl-svg');
  const path = root.querySelector<SVGPathElement>('.tl-path');
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('.dot, .num'));
  if (!svg || !path || nodes.length < 2) return null;
  // Layout (offset) geometry, not getBoundingClientRect: reveal transforms (translateY) on the steps must not shift the path.
  const rw = root.offsetWidth, rh = root.offsetHeight;
  svg.setAttribute('viewBox', `0 0 ${Math.max(1, rw)} ${Math.max(1, rh)}`);
  svg.setAttribute('width', String(rw));
  svg.setAttribute('height', String(rh));
  const pts = nodes.map((n) => {
    let x = n.offsetWidth / 2, y = n.offsetHeight / 2;
    for (let e: HTMLElement | null = n; e && e !== root; e = e.offsetParent as HTMLElement | null) { x += e.offsetLeft; y += e.offsetTop; }
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  path.setAttribute('d', `M${pts.join(' L')}`);
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = reduce ? '0' : String(len);
  return { root, path, nodes, len };
};

// Pinned story frame: the section never moves on screen, so progress follows the story's own scroll range
// (same window as the CSS-driven .st reveals: frame index + .1 → + .46 of one frame length F).
const pinned = (root: HTMLElement) => {
  const frame = root.closest<HTMLElement>('.frame');
  const story = root.closest<HTMLElement>('.story');
  if (!frame || !story || getComputedStyle(frame).position !== 'absolute') return null;
  const stage = frame.parentElement as HTMLElement;
  const F = (story.offsetHeight - stage.offsetHeight) / 5;
  const fi = +(frame.style.getPropertyValue('--fi') || 0);
  const top = story.getBoundingClientRect().top + scrollY;
  return { a: top + (fi + 0.1) * F, len: 0.36 * F };
};

const paint = () => {
  for (const t of tracks) {
    const pin = pinned(t.root);
    let raw: number;
    if (pin) raw = (scrollY - pin.a) / Math.max(1, pin.len);
    else {
      const rr = t.root.getBoundingClientRect();
      const vh = innerHeight || 1;
      const start = vh * 0.82;
      const end = vh * 0.22;
      raw = (start - rr.top) / Math.max(1, rr.height + (start - end));
    }
    const p = Math.max(0, Math.min(1, raw));
    if (!reduce) t.path.style.strokeDashoffset = String(t.len * (1 - p));
    t.nodes.forEach((n, i) => {
      const on = reduce || p >= (i + 0.15) / t.nodes.length;
      n.parentElement?.classList.toggle('tl-on', on);
    });
  }
};

let ticking = 0;
const req = () => { if (!ticking) ticking = requestAnimationFrame(() => { ticking = 0; paint(); }); };

for (const root of lists) {
  const t = layout(root);
  if (t) tracks.push(t);
}
if (tracks.length) {
  const relayout = () => {
    tracks.splice(0, tracks.length);
    for (const root of lists) {
      const t = layout(root);
      if (t) tracks.push(t);
    }
    paint();
  };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', relayout, { passive: true });
  document.fonts?.ready.then(relayout);
  paint();
}
