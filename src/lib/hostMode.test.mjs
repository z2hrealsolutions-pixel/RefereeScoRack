import { hostModeOf } from './hostMode.js';

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

check('reff.<domain> is the referee address', hostModeOf('reff.scoreit.today') === 'referee');
check('display.<domain> is the TV address', hostModeOf('display.scoreit.today') === 'tv');
check('live.<domain> is the spectator address', hostModeOf('live.scoreit.today') === 'public');
check('the bare domain, a vercel address and localhost are all the spectator address', hostModeOf('scoreit.today') === 'public' && hostModeOf('main-user-sco-rack.vercel.app') === 'public' && hostModeOf('localhost') === 'public');
check('capitals do not matter', hostModeOf('REFF.ScoreIt.Today') === 'referee' && hostModeOf('Display.scoreit.today') === 'tv');
check('only the first part counts: a name that merely contains reff or display is not enough', hostModeOf('myreff.scoreit.today') === 'public' && hostModeOf('live.reff.today') === 'public' && hostModeOf('reffs.scoreit.today') === 'public' && hostModeOf('display-board.scoreit.today') === 'public');
check('it works the same on another domain, and on a local test name', hostModeOf('reff.example.com') === 'referee' && hostModeOf('display.example.com') === 'tv' && hostModeOf('reff.localhost') === 'referee');
check('an IP address, an empty name and nothing at all are the spectator address', hostModeOf('192.168.1.20') === 'public' && hostModeOf('') === 'public' && hostModeOf(undefined) === 'public' && hostModeOf(null) === 'public');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
