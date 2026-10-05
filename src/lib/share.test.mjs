import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// What a link to this site looks like when it is pasted into WhatsApp, Facebook or Google.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const cfg = readFileSync(join(root, 'vite.config.js'), 'utf8');
const meta = (key) => { const m = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html); return m ? m[1] : null; };

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

check('there is a description to search engines, and it says what ScoreIt is', /tournament manager built in Sri Lanka/.test(meta('description') || ''));
check('the share card has a title, a description, a type and a name', meta('og:title') && meta('og:description') && meta('og:type') === 'website' && meta('og:site_name') === 'ScoreIt');
check('the share image is a full address that comes from one setting, not a path', meta('og:image') === '__SITE__/og-image.png' && meta('og:url') === '__SITE__/');
check('the setting is replaced when the site is built, and has a fallback', /VITE_SITE_URL/.test(cfg) && /replaceAll\('__SITE__'/.test(cfg));
check('the large image card is asked for, with its size and a description', meta('twitter:card') === 'summary_large_image' && meta('og:image:width') === '1200' && meta('og:image:height') === '630' && /ScoreIt/.test(meta('og:image:alt') || ''));
const img = join(root, 'public', 'og-image.png');
check('the share image is in the app', existsSync(img));
const size = existsSync(img) ? statSync(img).size : 0;
check(`it is small enough for WhatsApp to show (under 300 KB, it is ${Math.round(size / 1024)} KB)`, size > 5000 && size < 300 * 1024);
const png = existsSync(img) ? readFileSync(img) : Buffer.alloc(0);
check('it is a 1200 by 630 picture', png.length > 24 && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630);
check('no domain is written into the page, only the placeholder', !/scoreit\.today/i.test(html));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
