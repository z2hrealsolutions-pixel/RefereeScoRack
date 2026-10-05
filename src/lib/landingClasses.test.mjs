import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every lp- class the landing page uses has to exist in its stylesheet, and the page must not use
// a class from the rest of the app. Otherwise part of the page quietly loses its styling.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsx = readFileSync(join(root, 'pages/Landing.jsx'), 'utf8');
const css = readFileSync(join(root, 'styles/landing.css'), 'utf8');

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

const used = new Set();
for (const m of jsx.matchAll(/className="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => used.add(c));
const defined = new Set([...css.matchAll(/\.(lp-[\w-]+)/g)].map((m) => m[1]));

const strangers = [...used].filter((c) => !c.startsWith('lp-') && c !== 'lp');
check('the page uses only its own classes (none from the rest of the app)', strangers.length === 0, strangers.join(', '));
const missing = [...used].filter((c) => c.startsWith('lp-') && !defined.has(c));
check('every class the page uses has a style', missing.length === 0, missing.join(', '));
check('the stylesheet is scoped: every rule starts with .lp (or is an at-rule, a keyframe step or a media query)',
  css.split('\n').filter((l) => /^\.[a-z]/.test(l) && !l.startsWith('.lp')).length === 0);
check('no comment has been folded into a selector, and every at-rule starts a line', !/\.lp\s*\/\*/.test(css) && css.split('\n').filter((l) => l.includes('@media') || l.includes('@keyframes')).every((l) => /^\s*@(media|keyframes)/.test(l)));
check('no rule styles a bare element or the page itself outside .lp', !/^(body|html|h1|a|img|\*)\s*[{,]/m.test(css));
check('the animations are renamed so they cannot clash', !/animation:\s*(draw|slam|marquee)\b/.test(css) && /@keyframes lp-draw/.test(css) && /@keyframes lp-slam/.test(css) && /@keyframes lp-marquee/.test(css));
check('the page respects a request for less motion', /prefers-reduced-motion: reduce/.test(css));
check('only the landing styles load the display font, and they load only its two weights', /big-shoulders-display\/latin-800/.test(css) && /big-shoulders-display\/latin-900/.test(css) && !/big-shoulders/.test(readFileSync(join(root, 'styles/global.css'), 'utf8')));

// the contact
check('the contact is WhatsApp only: no email link on the page', !/mailto:/i.test(jsx) && !/Email us/i.test(jsx) && /whatsappLink/.test(jsx));
check('no phone number is written into the page, it comes from the contact settings', !/\d{2}\s?\d{3}\s?\d{4}/.test(jsx) && !/94717/.test(jsx));
check('no domain is written into the page', !/scoreit\.today/i.test(jsx));
check('the page has one main heading', (jsx.match(/<h1\b/g) || []).length === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
