// Pause decoration when it cannot be seen. Content and controls remain unchanged.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.toggleAttribute('data-motion-paused', !entry.isIntersecting);
  });
  document.querySelectorAll('.story, .ticker, .prize-card').forEach(el => observer.observe(el));
}
const visibility = () => document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
document.addEventListener('visibilitychange', visibility);
visibility();

// Text zoom and font changes can make a fixed stage too small. Fall back to normal flow.
const root = document.documentElement;
const frames = [...document.querySelectorAll<HTMLElement>('.frame')];
let queued = 0;
const fit = () => {
  queued = 0;
  const wasOverflowing = root.classList.contains('story-overflow');
  root.classList.remove('story-overflow');
  if (frames.some(frame => getComputedStyle(frame).position === 'absolute' && frame.scrollHeight > frame.clientHeight + 4)) {
    root.classList.add('story-overflow');
  }
  if (wasOverflowing !== root.classList.contains('story-overflow')) dispatchEvent(new Event('storylayoutchange'));
};
const requestFit = () => { if (!queued) queued = requestAnimationFrame(fit); };
addEventListener('resize', requestFit, { passive: true });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', requestFit);
document.fonts.ready.then(requestFit);
