import { storyLayout } from './story-layout';

// Native wheel/touch momentum: no permanent animation loop or scroll hijacking.
export const jump = (y: number) => window.scrollTo({ top: y, behavior: 'instant' });
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const targetFromHash = (hash: string) => {
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
  catch { return null; }
};
const targetY = (target: HTMLElement) => {
  const layout = storyLayout();
  const frame = target.closest<HTMLElement>('.frame');
  if (layout && frame) {
    const i = Number(frame.style.getPropertyValue('--fi'));
    return (i + (i ? .55 : 0)) * layout.step;
  }
  if (target.id === 'top') return 0;
  const header = document.querySelector('.top')?.getBoundingClientRect().height ?? 72;
  return Math.max(0, target.getBoundingClientRect().top + scrollY - header - 16);
};
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
  const target = targetFromHash(a.hash);
  if (!target) return;
  e.preventDefault();
  document.querySelector('.menu[open]')?.removeAttribute('open');
  const y = targetY(target);
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  window.scrollTo({ top: y, behavior: reduce.matches ? 'instant' : 'smooth' });
  if (location.hash !== a.hash) history.pushState(null, '', a.hash);
});
const restoreFrame = () => {
  const target = targetFromHash(location.hash);
  if (target && storyLayout() && target.closest('.frame')) jump(targetY(target));
};
addEventListener('hashchange', restoreFrame);
addEventListener('popstate', restoreFrame);
addEventListener('pageshow', restoreFrame);
document.fonts.ready.then(restoreFrame);
