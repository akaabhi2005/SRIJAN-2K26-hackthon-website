// Procedural ember background. Plain canvas 2D, no libraries. Starts after first paint/idle so LCP is unaffected.
// Layers: (1) pre-rendered faint grid + slow scan band + pulse, (2) 80 neon-orange (#FF6B00) sparks: rise, sine-drift,
// fade in/out, respawn at the bottom; the pointer pulls nearby sparks (capped, distance falloff) and they relax back.
const canvas = document.querySelector<HTMLCanvasElement>('canvas.ember');
const ctx = canvas?.getContext('2d', { alpha: false });
if (canvas && ctx) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) <= 600;
  const COUNT = coarse ? 32 : 80, PEAK = 0.34, RANGE = 170, PULL = 260; // PULL = max px/s^2 toward the pointer
  const BG = '#0a0a0a';
  let W = 0, H = 0, dpr = 1;
  const grid = document.createElement('canvas'); // static grid, redrawn only on resize
  const spr = document.createElement('canvas'); // ember glow sprite
  spr.width = spr.height = 32;
  { const g = spr.getContext('2d')!; const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(.18, 'rgba(255,107,0,.95)'); r.addColorStop(.5, 'rgba(255,107,0,.22)'); r.addColorStop(1, 'rgba(255,107,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32); }
  const scan = document.createElement('canvas'); scan.width = 1; scan.height = 64; // vertical gradient for the scan band
  { const g = scan.getContext('2d')!; const r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, 'rgba(255,107,0,0)'); r.addColorStop(.7, 'rgba(255,107,0,.05)'); r.addColorStop(1, 'rgba(255,107,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 1, 64); }

  type P = { x: number; y: number; vx: number; vy: number; s: number; rise: number; amp: number; fr: number; ph: number; age: number; life: number };
  const ps: P[] = [];
  const spawn = (p: P | null, initial: boolean): P => {
    const o = p || ({} as P);
    o.x = Math.random() * W; o.y = initial ? Math.random() * H : H + 8 + Math.random() * 40;
    o.s = 5 + Math.random() * 9; o.rise = 22 + Math.random() * 38; o.vx = 0; o.vy = -o.rise;
    o.amp = 8 + Math.random() * 26; o.fr = .4 + Math.random() * .9; o.ph = Math.random() * 6.283;
    o.life = 7 + Math.random() * 9; o.age = initial ? Math.random() * o.life : 0;
    return o;
  };
  const drawGrid = () => {
    grid.width = Math.ceil(W * dpr); grid.height = Math.ceil(H * dpr);
    const g = grid.getContext('2d')!; g.scale(dpr, dpr);
    const step = W < 600 ? 36 : 48;
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.035)'; g.beginPath();
    for (let x = .5; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = .5; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.fillStyle = 'rgba(255,107,0,.16)'; // faint node dots at intersections
    for (let x = 0; x < W; x += step) for (let y = 0; y < H; y += step) g.fillRect(x - .5, y - .5, 2, 2);
  };
  const size = () => {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
    canvas.width = Math.ceil(W * dpr); canvas.height = Math.ceil(H * dpr);
    drawGrid();
    for (const p of ps) { if (p.x > W) p.x = Math.random() * W; if (p.y > H + 60) p.y = H + 8; }
  };
  const ember = (p: P, a: number) => {
    const d = p.s * 2.4; ctx.globalAlpha = a; ctx.drawImage(spr, p.x - d / 2, p.y - d / 2, d, d);
  };
  const alphaOf = (p: P) => { const k = p.age / p.life; return PEAK * Math.min(1, k * 8) * (1 - k) ** 1.4; };
  const frame = (t: number) => { // t in seconds
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .75 + .25 * Math.sin(t * .6); // slow pulse of the grid
    ctx.drawImage(grid, 0, 0);
    ctx.globalAlpha = 1; ctx.scale(dpr, dpr);
    const sy = ((t * 38) % (H + 200)) - 100; // slow scan band
    ctx.drawImage(scan, 0, 0, 1, 64, 0, sy, W, 160);
    ctx.globalCompositeOperation = 'lighter';
  };

  if (reduce || coarse) {
    // one static frame: grid + a few seeded embers; no loop, no pointer listeners
    const paint = () => { size(); frame(0); let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 10; i++) { const p = { x: rnd() * W, y: H * (.35 + .6 * rnd()), s: 5 + rnd() * 7 } as P; ember(p, .3); } ctx.globalAlpha = 1; };
    const go = () => { paint(); addEventListener('resize', paint); };
    'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1000 }) : setTimeout(go, 200);
  } else {
    let px = -1e4, py = -1e4, pActive = false, last = 0, raf = 0, t = 0, rt = 0, tid = 0;
    const setP = (x: number, y: number) => { px = x; py = y; pActive = true; };
    addEventListener('pointermove', (e) => setP(e.clientX, e.clientY), { passive: true });
    addEventListener('touchmove', (e) => { const c = e.touches[0]; if (c) setP(c.clientX, c.clientY); }, { passive: true });
    addEventListener('touchstart', (e) => { const c = e.touches[0]; if (c) setP(c.clientX, c.clientY); }, { passive: true });
    const clear = () => { pActive = false; px = py = -1e4; };
    addEventListener('touchend', () => setTimeout(clear, 500), { passive: true });
    addEventListener('pointercancel', clear); document.documentElement.addEventListener('mouseleave', clear);
    addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(size, 150); });
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      if (coarse && ms - last < 1000 / 30) return;
      const dt = Math.min(.05, (ms - last) / 1000 || .016); last = ms; t += dt; // delta-time clamp
      frame(t);
      for (const p of ps) {
        p.age += dt;
        if (p.age >= p.life || p.y < -20) { spawn(p, false); }
        // relax toward the base rise speed / zero sideways velocity (exponential), then apply the pointer pull
        const k = 1 - Math.exp(-dt * 1.8); p.vy += (-p.rise - p.vy) * k; p.vx += (0 - p.vx) * k;
        if (pActive) {
          const dx = px - p.x, dy = py - p.y, d2 = dx * dx + dy * dy;
          if (d2 < RANGE * RANGE && d2 > 1) { const d = Math.sqrt(d2), f = Math.min(PULL, PULL * (1 - d / RANGE) ** 2 * 1.6) * (d < 28 ? d / 28 : 1); p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        }
        p.x += (p.vx + Math.cos(t * p.fr + p.ph) * p.amp) * dt; p.y += p.vy * dt; // sine drift wave
        ember(p, alphaOf(p));
      }
      ctx.globalAlpha = 1;
    };
    let visible = true;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const run = () => { if (!raf && visible && !document.hidden && !motion.matches) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const start = () => {
      size(); for (let i = 0; i < COUNT; i++) ps.push(spawn(null, true)); run();
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
      motion.addEventListener('change', () => motion.matches ? stop() : run());
      const story = document.querySelector('.story');
      if (story && 'IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting; visible ? run() : stop();
      }).observe(story);
    };
    'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : (tid = window.setTimeout(start, 300));
  }
}
