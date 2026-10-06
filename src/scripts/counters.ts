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
  let queued = 0;
  const check = () => {
    queued = 0;
    const rect = root.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < innerHeight;
    set(visible && (!frame || +getComputedStyle(frame).opacity > .7));
  };
  const requestCheck = () => { if (!queued) queued = requestAnimationFrame(check); };
  addEventListener('scroll', requestCheck, { passive: true });
  addEventListener('resize', requestCheck, { passive: true });
  addEventListener('storylayoutchange', requestCheck);
  check();
}
