# SRIJAN performance and responsive audit — 6 October 2026

Audited the latest main branch beginning at `18b82dd`. Event dates, fees, registration URLs, WhatsApp links, prize content, team information and the visual identity were preserved.

## Fixes

- Removed Lenis and its perpetual animation loop. Wheel/touch input now uses native browser scrolling; section links retain smooth navigation, keyboard focus and history behavior.
- Fixed duplicate `reward` IDs and the obsolete frame mapping so Prizes opens the new Cash Prizes section.
- Fixed story headings accidentally sharing the sticky header's `top` class.
- Replaced blocked Google Fonts requests with the existing design's Chakra Petch and Syne fonts served locally. Removed unused font families/network connections.
- Made phones, tablets, landscape/short screens use natural-height sections instead of clipping content inside a fixed stage. Desktop pinning falls back to document flow if content does not fit.
- Made team/timeline grids shrink and wrap at enlarged text sizes; removed narrow-screen card overflow. Kept all event content reachable with JavaScript disabled.
- Removed global mousemove measurements that moved registration buttons under the pointer. CSS hover feedback remains.
- Mobile canvas paints once instead of continuously; desktop canvas pauses below the story, in hidden tabs and when reduced motion is enabled. Offscreen decorative animations pause. Removed the continuously repainting prize shadow animation.
- Removed the redundant floating countdown on touch devices and the duplicate bottom registration bar in landscape phones where the sticky header already contains Register.
- Countdown geometry reads are batched, the chip no longer remeasures every second, and resize/clock geometry follows the actual pinned/static layout.
- Lowered reveal observer threshold so tall sections can appear on short viewports.
- Extracted styles into fingerprinted cacheable assets. Kept scroll-timeline declarations compatible during CSS minification; verified story frames do not overlap.
- Updated vulnerable build dependencies to Astro 7.3.6 and patched transitive dependencies. Declared Node >=22.12; tested with Node 24.12. Static hosting output is retained.
- Added a self-contained regression suite using production security headers; corrected stale deadline tests to read the current event data.

## Measurements

- Client JavaScript: approximately 44.6 KB before, 23.55 KB after (uncompressed; about 47% smaller).
- Mobile idle sample after settling: zero JavaScript requestAnimationFrame callbacks scheduled over two seconds. This is not a frame-rate benchmark.
- Dependency audit: four production dependency findings before; zero reported after updates.
- Local static request smoke test: 200 requests with 20 concurrent workers, zero failed requests. This is not a production capacity benchmark.

## Verification

The audit suite covers 320×568, 360×640, 390×844, 412×915, 768×1024, 820×1180, 844×390, 1024×600, 1366×768, 1920×1080 and 2560×1440 in Chrome, plus phone/landscape/laptop sizes in Firefox and WebKit. It checks page and frame overflow, duplicate IDs, missing anchors, runtime/CSP/HTTP errors, prize navigation, menu closing, schedule keyboard controls, FAQ/problem statement toggles, team reveals, back-to-top, direct story links, resize/orientation transitions, 200% text, registration expiry, reduced motion and JavaScript-disabled content. Screenshots were inspected, including the desktop pinned story and landscape phone layout.

Run `npm run build`, `npm run test:audit` and `npm audit --omit=dev`. Cross-browser setup is documented in README. Generated screenshots and temporary browser files stay in ignored `.audit/`.

## Limits

Browser emulation does not certify every physical phone/GPU. Production hosting quotas, real traffic capacity and external Google Forms/WhatsApp availability were not load-tested. No content/features were added. Git push can trigger an existing hosting integration; deployment success must be confirmed separately.

Dependency migration references: [Astro 6 guide](https://docs.astro.build/en/guides/upgrade-to/v6/) and [Astro 7 guide](https://docs.astro.build/en/guides/upgrade-to/v7/).
