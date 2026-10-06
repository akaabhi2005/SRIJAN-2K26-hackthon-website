// Reward settle: the text "Rewards worth ₹1.5 Lakh+" is in the page from the first byte and never changes. When the reward frame
// becomes the active one, the fixed text settles into place with a spring on transform (scale) + opacity. No digits are cycled, so
// no other figure is ever shown. Interruptible: re-entering the frame mid-settle restarts from the current scale/opacity.
// Reduced motion / no JS: no animation at all, the text is simply there. Layout never moves (transform + opacity only, CLS 0).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('[data-prize]');
const fx = root?.querySelector<HTMLElement>('.prize-fx');
if (root && fx && !reduce) {
  const n = 26, zeta = 0.45, w = 12, wd = w * Math.sqrt(1 - zeta * zeta);
  const S = Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 1.0;
    return i === n ? 1 : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  });
  let primed = true; // first run starts a little small and dim; later runs start from wherever the text currently is
  const settle = () => {
    let s = 0.93, o = 0.55;
    if (!primed) {
      const m = new DOMMatrixReadOnly(getComputedStyle(fx).transform);
      s = m.a || 1; o = +getComputedStyle(fx).opacity;
    }
    primed = false;
    fx.getAnimations().forEach((a) => a.cancel());
    fx.animate(S.map((p) => ({ transform: `scale(${(s + (1 - s) * p).toFixed(4)})`, opacity: +(o + (1 - o) * Math.min(1, p * 1.6)).toFixed(3) })), { duration: 720, easing: 'linear' });
  };
  fx.style.transformOrigin = '0 50%';
  const frame = root.closest<HTMLElement>('.frame');
  let active = false;
  const set = (on: boolean) => { if (on && !active) settle(); active = on; };
  if (frame && getComputedStyle(frame.parentElement as Element).position === 'sticky') {
    // pinned story: the frame is always "intersecting"; it is active when its scroll window is reached and its opacity is up
    // (sampled in rAF: scroll-driven animations only update after the scroll event, before animation-frame callbacks)
    const story = frame.closest<HTMLElement>('.story');
    let q = 0;
    const inWindow = () => {
      if (!story) return true;
      const F = (story.offsetHeight - (frame.parentElement as HTMLElement).offsetHeight) / 6;
      const fi = +(frame.style.getPropertyValue('--fi') || 0);
      return scrollY > story.getBoundingClientRect().top + scrollY + (fi + 0.1) * F;
    };
    const check = () => { q = 0; set(inWindow() && +getComputedStyle(frame).opacity > 0.7); };
    addEventListener('scroll', () => { if (!q) q = requestAnimationFrame(check); }, { passive: true });
    check();
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => set(e.isIntersecting)), { threshold: 0.35 }).observe(root);
  }
}
