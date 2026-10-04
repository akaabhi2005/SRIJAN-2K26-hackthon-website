# SRIJAN audit — 4 October 2026

## Fixed
- Header exceeded narrow mobile screens; compact header keeps Menu accessible.
- Short-screen hero spacing clipped content; compact spacing now fits the tested 320×568 viewport.
- Invalid SVG height generated browser errors.
- Google Fonts requests were blocked by production CSP. Removed blocked requests; existing local fonts/fallbacks remain.
- Moved page initialization into a bundled same-origin script and removed inline-script hashes. Content no longer gets hidden by an early inline script before the reveal module loads.
- Partners navigation now targets sponsors instead of About; initial fragment and history navigation reveal pinned story frames.
- Clock flight used six frame units while layout uses five; corrected geometry.
- Registration dock observed a removed contact CTA; now observes current registration CTAs.
- Removed nonfunctional sound control and generic social homepage links (no verified organizer profile destinations were supplied).
- Five team photos resized to 160×160 WebP, lazy loaded: 739,355 bytes to 32,092 bytes, approximately 96% smaller. Source photos preserved.
- Added team-image cache rules for the configured hosting platforms.
- Coarse-pointer background uses fewer particles and capped rendering frequency; hidden-tab countdown timer pauses, offscreen digits do not animate.

## Verification
- Production build and security header checks pass.
- Chrome with production security headers: 320×568, 390×844, 768×1024, 1366×768, 1920×1080. No document overflow, frame overflow, missing internal anchor targets, browser console errors or runtime exceptions. FAQ and schedule interactions pass.
- Reduced-motion check: zero running animations. JavaScript-disabled content/asset smoke check passes.
- Deadline simulated at 11 October 2026, 12:00:01 PM IST: all four registration links disabled.
- Mobile menu navigation to Domains and Partners and direct #reward navigation pass.
- Local static-server smoke test: 200 requests, 20 concurrent workers, zero failures. This is not a production capacity benchmark.
- Mobile screenshot inspected visually.

## Limits
No deployment performed. Production hosting quotas, CDN behavior, physical low-end devices, Safari/Firefox, and external Google Forms/payment flows were not verified. High-traffic crash-free operation cannot be guaranteed from local checks. Existing static output and fingerprinted-asset caching were retained; there is no application server or database in this repository to scale.

Regression scripts: scripts/audit-check.mjs, audit-states.mjs, audit-links.mjs and audit-load.mjs (local preview at port 4321; installed Chrome required for browser checks). scripts/audit-images.mjs regenerates optimized team images.
