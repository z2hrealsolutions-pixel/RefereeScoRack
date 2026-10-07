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

// force-dark is the one shared class: it gives the TV board in the hero the dark settings from tokens.css
const strangers = [...used].filter((c) => !c.startsWith('lp-') && c !== 'lp' && c !== 'force-dark');
check('the page uses only its own classes (none from the rest of the app)', strangers.length === 0, strangers.join(', '));
const missing = [...used].filter((c) => c.startsWith('lp-') && !defined.has(c));
check('every class the page uses has a style', missing.length === 0, missing.join(', '));
check('the stylesheet is scoped: every rule starts with .lp (or is an at-rule, a keyframe step or a media query)',
  css.split('\n').filter((l) => /^\.[a-z]/.test(l) && !l.startsWith('.lp')).length === 0);
check('no comment has been folded into a selector, and every at-rule starts a line', !/\.lp\s*\/\*/.test(css) && css.split('\n').filter((l) => l.includes('@media') || l.includes('@keyframes')).every((l) => /^\s*@(media|keyframes)/.test(l)));
check('nothing hides the name of who the page is by, on any screen size: no display none on the brand text',
  !/\.lp-brand span\s*\{[^}]*display:\s*none/.test(css) && /\.lp footer \.lp-brand span/.test(css) && /\.lp \.lp-bar \.lp-brand span/.test(css));
check('the menu says Venue access, not Venue sign in', !/Venue sign in/.test(jsx) && (jsx.match(/Venue access/g) || []).length === 2);
check('no rule styles a bare element or the page itself outside .lp', !/^(body|html|h1|a|img|\*)\s*[{,]/m.test(css));
check('the animations are renamed so they cannot clash', !/animation:\s*(rise|marquee)\b/.test(css) && /@keyframes lp-rise/.test(css) && /@keyframes lp-marquee/.test(css));
check('the page respects a request for less motion', /prefers-reduced-motion: reduce/.test(css));
check('the landing page uses the same fonts as the rest of the app: it loads no font of its own', !/@import/.test(css) && !/big-shoulders/.test(css));

// the contact
check('the contact is WhatsApp only: no email link on the page', !/mailto:/i.test(jsx) && !/Email us/i.test(jsx) && /whatsappLink/.test(jsx));
check('no phone number is written into the page, it comes from the contact settings', !/\d{2}\s?\d{3}\s?\d{4}/.test(jsx) && !/94717/.test(jsx));
check('no domain is written into the page', !/scoreit\.today/i.test(jsx));
check('the page has one main heading', (jsx.match(/<h1\b/g) || []).length === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
