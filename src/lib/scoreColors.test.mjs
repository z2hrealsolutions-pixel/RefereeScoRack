import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Dark turquoise (the logo's #0097b2) means one thing on a score: this match is finished.
// A live score is plain white, the LIVE tag carries the colour. These are text checks on the
// stylesheets, the colours themselves were checked on screen in a real browser.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const read = (f) => readFileSync(join(root, f), 'utf8');
const pub = read('public.css'), app = read('app.css'), tv = read('tv.css');

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

const body = (css, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(^|\\n)${esc}\\s*\\{([^}]*)\\}`).exec(css);
  return m ? m[2] : null;
};
const colour = (css, selector) => { const b = body(css, selector); const m = b && /(^|[\s;])color:\s*var\(--([a-z-]+)\)/.exec(b); return m ? m[2] : null; };

check('a finished public match card: the winner\'s score is dark turquoise', colour(pub, '.pm-card.pm-final .pm-win .pm-score') === 'lamp-score');
check('...and the other score is the same light grey as its team\'s name', colour(pub, '.pm-card.pm-final .pm-score') === 'mist' && colour(pub, '.pm-name') === 'mist');
check('a live public match card shows its score in white', colour(pub, '.pm-live .pm-score') === 'paper');
check('a finished bracket match: only the winner\'s score is dark turquoise, the other has no colour of its own so it matches its team', colour(pub, '.bk-match.bk-final .bk-win .bk-score') === 'lamp-small' && colour(pub, '.bk-match.bk-final .bk-score') === null);
check('a live bracket match shows its score in white', colour(pub, '.bk-live .bk-score') === 'paper');
check('a finished score in the referee screens is turquoise (list, final panel, rubbers), in the small-text shade so it reads in both themes', colour(app, '.score-final') === 'lamp-small');
check('a live score in the referee list is white, only the LIVE tag is coloured', colour(app, '.live-score') === 'paper' && colour(app, '.live') === 'lamp-text');
check('on the TV board only the winner\'s score is dark turquoise', colour(tv, '.tv-res-score.tv-win-score') === 'lamp');
check('...and the losing team\'s name and score are the same light grey', colour(tv, '.tv-res-team.tv-lose,\n.tv-res-score.tv-lose') === 'mist');
check('the TV results table has the four columns: type, stage, team, score', ['.tv-res-type', '.tv-res-stage', '.tv-res-team', '.tv-res-score'].every((c) => body(tv, c) !== null || tv.includes(c)));

const order = (css, first, second) => css.indexOf(first) !== -1 && css.indexOf(first) < css.indexOf(second);
check('the finished-score rule comes after the winner highlight, so it wins (3 classes beat 2 anyway)', order(pub, '.pm-win .pm-score', '.pm-card.pm-final .pm-score'));
check('no score is drawn in the lighter accent any more', !/\.(pm|bk)-(score|live \.pm-score|live \.bk-score)[^{]*\{[^}]*lamp-text/.test(pub));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
