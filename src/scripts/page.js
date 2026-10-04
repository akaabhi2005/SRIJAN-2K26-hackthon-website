document.documentElement.classList.add('js');
      (function () {
        var els = document.querySelectorAll('[data-reveal],[data-stagger]');
        if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); }
        else {
          var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
          }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
          els.forEach(function (e) { io.observe(e); });
        }
        var m = document.querySelector('.menu');
        if (m) {
          var ms = m.querySelector('summary');
          m.addEventListener('toggle', function () { ms.setAttribute('aria-expanded', m.open ? 'true' : 'false'); });
          m.addEventListener('click', function (e) { if (e.target.closest('a')) m.removeAttribute('open'); });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.open) { m.removeAttribute('open'); m.querySelector('summary').focus(); } });
          document.addEventListener('click', function (e) { if (m.open && !m.contains(e.target)) m.removeAttribute('open'); });
        }
        var pinned = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (pinned) {
          // Pinned story: frames are scroll positions, so jump to the frame's scroll offset (CSS drives the dock + frames).
          document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[data-f]');
            if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            window.scrollTo({ top: Math.round((+a.dataset.f + 0.5) * 0.9 * innerHeight), behavior: 'smooth' });
          });
        }
        var dock = document.getElementById('dock');
        if (dock && 'IntersectionObserver' in window) {
          var seen = new Set();
          var dio = new IntersectionObserver(function (es) {
            es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
            dock.classList.toggle('show', seen.size === 0);
          });
          document.querySelectorAll('[data-register]').forEach(function (e) { dio.observe(e); });
        } else if (dock) { dock.classList.add('show'); }
        var d = document.getElementById('days');
        if (d) {
          var t = new Date(d.dataset.start), end = new Date(d.dataset.end), now = new Date();
          var n = Math.ceil((t - now) / 864e5);
          if (n > 1) { d.innerHTML = '<b>' + n + '</b> days to go'; d.hidden = false; }
          else if (n === 1) { d.innerHTML = '<b>Tomorrow</b>'; d.hidden = false; }
          else if (now <= end) { d.innerHTML = '<b>Happening now</b>'; d.hidden = false; }
        }
      })();
