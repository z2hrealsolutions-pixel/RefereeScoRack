import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The rules of the three looks that were agreed, kept true: Arena Glass for spectators and referees (glass only on
// bars and pop-ups), Broadcast Bold for the TV. These are text checks on the stylesheets, the look itself was checked
// in a real browser, both themes.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const arena = readFileSync(join(root, 'arena.css'), 'utf8');
const broadcast = readFileSync(join(root, 'broadcast.css'), 'utf8');
const main = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'main.jsx'), 'utf8');

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
const rules = (css) => [...strip(css).matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const glass = rules(arena).filter((r) => /backdrop-filter/.test(r.body));
const glassSelectors = [...new Set(glass.flatMap((r) => r.sel.split(',').map((s) => s.trim())))];
check('glass (blur) is used only on the top bar and the pop-up sheet, never behind scores or lists', glassSelectors.every((s) => ['.topbar', '.sheet', '.sheet-backdrop'].includes(s)), glassSelectors.join(', '));
check('glass has a solid fallback for a device that cannot do it', /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)[\s\S]*?\.topbar\s*\{\s*background: var\(--ink\)/.test(arena));
check('glass has a solid fallback for a person who asked for less transparency', /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?\.topbar\s*\{[^}]*background: var\(--ink\)[^}]*backdrop-filter: none/.test(arena));
check('the pop-up sheet is solid in both of those cases too', (arena.match(/\.sheet\s*\{\s*background: var\(--panel-raised\)/g) || []).length >= 2);
check('the live pulse stops for a person who asked for less motion', /prefers-reduced-motion: reduce\)[\s\S]*?\.pm-tag-live::before\s*\{\s*animation: none/.test(arena));
check('the page glow comes from the theme settings, so it differs in light and dark', /var\(--page-glow-a\)/.test(arena) && /var\(--page-glow-b\)/.test(arena));
check('scores in tiles use an ordinary heavy numeral, so 11 never reads as II', /\.pm-score\s*\{[^}]*font-weight:\s*700[^}]*tabular-nums/.test(arena) && !/\.pm-score\s*\{[^}]*Big Shoulders/.test(arena));
check('the finish button floats over the bottom of the screen, with room reserved under the last card', /\.btn-big\s*\{[^}]*position:\s*sticky/.test(arena) && /\.scorer\s*\{[^}]*padding-bottom:\s*76px/.test(arena));
check('on a phone a team name gets a whole line, so it is not cut in the middle of a word', /@media \(max-width: 520px\)[\s\S]*?'name name'[\s\S]*?\.team-name\s*\{[^}]*overflow-wrap:\s*break-word/.test(arena));
check('the venue page is a 12 column bento from 1000 pixels, with the live tile the biggest', /@media \(min-width: 1000px\)[\s\S]*?repeat\(12, minmax\(0, 1fr\)\)/.test(arena) && /\.home-section:nth-child\(1\)\s*\{\s*grid-column:\s*span 8/.test(arena));

check('the TV look is scoped to the TV board: every rule starts with .tv', rules(broadcast).filter((r) => !/^--|^\s*$/.test(r.sel)).every((r) => r.sel.split(',').every((s) => s.trim().startsWith('.tv'))));
check('the TV board scores use the condensed numeral only at a size where it reads (44 pixels and up)', /\.tv \.tv-score\s*\{[^}]*Big Shoulders|\.tv \.tv-score\s*\{[^}]*var\(--broadcast\)[^}]*clamp\(44px/.test(broadcast.replace(/\n/g, ' ')) || /\.tv \.tv-score\s*\{\s*font-family: var\(--broadcast\);\s*font-size: clamp\(44px/.test(broadcast));
check('the small scores in the TV results table use a plain numeral, so 11 never reads as II', /\.tv \.tv-res-score\s*\{[^}]*font-weight:\s*700[^}]*tabular-nums/.test(broadcast) && !/\.tv-res-score\s*\{[^}]*var\(--broadcast\)/.test(broadcast));
check('TV names are not cut in the middle of a word', /\.tv \.tv-name\s*\{[^}]*word-break:\s*normal/.test(broadcast));
check('the TV look loads the display font in only the two weights it uses', /latin-800'/.test(broadcast) && /latin-900'/.test(broadcast) && !/latin-400|latin-700/.test(broadcast));
check('arena.css is loaded after the other stylesheets, so it can restyle them', main.indexOf("arena.css") > main.indexOf("public.css") && main.indexOf("arena.css") > main.indexOf("app.css"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
