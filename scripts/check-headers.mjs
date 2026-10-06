// Enforce production CSP for executable inline scripts (including scripts with attributes).
// The current site uses only same-origin external scripts and locally hosted fonts.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !/\bsrc\s*=/.test(m[1]) && !/type=["']application\/(?:ld\+)?json["']/.test(m[1]))
  .map(m => 'sha256-' + createHash('sha256').update(m[2]).digest('base64'));
const files = ['../vercel.json', '../public/_headers'];
let bad = false;
if (/https:\/\/fonts\.(?:googleapis|gstatic)\.com/.test(html)) {
  console.error('External font requests violate the same-origin production policy. Host fonts locally.'); bad = true;
}
for (const f of files) {
  const txt = readFileSync(new URL(f, import.meta.url), 'utf8');
  for (const h of hashes) if (!txt.includes(`'${h}'`)) { console.error(`✗ ${f.slice(3)}: CSP is missing '${h}' — update script-src with the hashes printed below`); bad = true; }
}
if (bad) { console.error('Current inline-script hashes:\n' + hashes.map((h) => `  '${h}'`).join('\n')); process.exit(1); }
console.log(`✓ CSP hashes in vercel.json and public/_headers match ${hashes.length} inline scripts`);
