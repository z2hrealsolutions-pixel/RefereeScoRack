import { hostModeOf } from './hostMode.js';

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

check('ref.<domain> is the referee address', hostModeOf('ref.scoreit.today') === 'referee');
check('display.<domain> is the TV address', hostModeOf('display.scoreit.today') === 'tv');
check('live.<domain> is the spectator address', hostModeOf('live.scoreit.today') === 'public');
check('the bare domain, and www in front of it, is the landing address', hostModeOf('scoreit.today') === 'landing' && hostModeOf('www.scoreit.today') === 'landing' && hostModeOf('example.com') === 'landing');
check('a vercel address, localhost and a test name are not, they are the spectator address', hostModeOf('main-user-sco-rack.vercel.app') === 'public' && hostModeOf('localhost') === 'public' && hostModeOf('venue.localhost') === 'public');
check('capitals do not matter', hostModeOf('REF.ScoreIt.Today') === 'referee' && hostModeOf('Display.scoreit.today') === 'tv' && hostModeOf('ScoreIt.Today') === 'landing');
check('only the first part counts: a name that merely contains ref or display is not enough', hostModeOf('myref.scoreit.today') === 'public' && hostModeOf('live.ref.today') === 'public' && hostModeOf('refs.scoreit.today') === 'public' && hostModeOf('display-board.scoreit.today') === 'public');
check('it works the same on another domain, and on a local test name', hostModeOf('ref.example.com') === 'referee' && hostModeOf('display.example.com') === 'tv' && hostModeOf('ref.localhost') === 'referee');
check('an IP address, an empty name and nothing at all are the spectator address', hostModeOf('192.168.1.20') === 'public' && hostModeOf('') === 'public' && hostModeOf(undefined) === 'public' && hostModeOf(null) === 'public');

// ---- the landing address ----
check('other parts in front of the domain are not the landing address (live., ref., display., anything)', hostModeOf('live.scoreit.today') === 'public' && hostModeOf('admin.scoreit.today') === 'public' && hostModeOf('a.b.scoreit.today') === 'public');
check('only www counts as a front for the bare domain', hostModeOf('www.scoreit.today') === 'landing' && hostModeOf('web.scoreit.today') === 'public');
check('a three part domain such as scoreit.co.lk needs to be named, then it works, www too',
  hostModeOf('scoreit.co.lk') === 'public' && hostModeOf('scoreit.co.lk', 'scoreit.co.lk,www.scoreit.co.lk') === 'landing' && hostModeOf('www.scoreit.co.lk', 'scoreit.co.lk,www.scoreit.co.lk') === 'landing');
check('a named list replaces the rule: an address not on it is not the landing address', hostModeOf('scoreit.today', 'scoreit.co.lk') === 'public' && hostModeOf('localhost', 'localhost') === 'landing');
check('the list ignores spaces and capitals, an empty list means the rule', hostModeOf('ScoreIt.Today', '  SCOREIT.today , x.y ') === 'landing' && hostModeOf('scoreit.today', ' , ') === 'landing');
check('ref. and display. win over everything, even a list', hostModeOf('ref.scoreit.today', 'ref.scoreit.today') === 'referee' && hostModeOf('display.example.com', 'display.example.com') === 'tv');
check('IP addresses, a trailing dot, empty parts and nothing are never the landing address', ['192.168.1.20', '10.0.0.5', '127.0.0.1', 'scoreit.today.', '.today', 'a..b', '', null, undefined].every((h) => hostModeOf(h) === 'public'));
check('two numbers are not a domain', hostModeOf('10.5') === 'public');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
