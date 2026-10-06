// Runs after `npm run build` (npm "postbuild"). The CSP in vercel.json and public/_headers allow-lists the
// two inline scripts by SHA-256. If someone edits those scripts the hashes go stale, the browser blocks them,
// and (because content is hidden until JS adds .in) the page would look blank. Fail the build instead.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => 'sha256-' + createHash('sha256').update(m[1]).digest('base64'));
const files = ['../vercel.json', '../public/_headers'];
let bad = false;
for (const f of files) {
  const txt = readFileSync(new URL(f, import.meta.url), 'utf8');
  for (const h of hashes) if (!txt.includes(`'${h}'`)) { console.error(`✗ ${f.slice(3)}: CSP is missing '${h}' — update script-src with the hashes printed below`); bad = true; }
}
if (bad) { console.error('Current inline-script hashes:\n' + hashes.map((h) => `  '${h}'`).join('\n')); process.exit(1); }
console.log(`✓ CSP hashes in vercel.json and public/_headers match ${hashes.length} inline scripts`);
