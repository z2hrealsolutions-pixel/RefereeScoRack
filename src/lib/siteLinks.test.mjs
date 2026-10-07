import { bareDomain, landingUrlOf, siteLinksOf } from './siteLinks.js';
let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check('on the bare domain the links are live. and rent. of that domain', eq(siteLinksOf('scoreit.today'), { live: 'https://live.scoreit.today', rent: 'https://rent.scoreit.today' }));
check('www in front makes no difference', eq(siteLinksOf('www.scoreit.today'), { live: 'https://live.scoreit.today', rent: 'https://rent.scoreit.today' }) && bareDomain('www.scoreit.today') === 'scoreit.today' && bareDomain('scoreit.today') === 'scoreit.today');
check('another domain gives its own links, nothing is written into the code', eq(siteLinksOf('example.co.lk'), { live: 'https://live.example.co.lk', rent: 'https://rent.example.co.lk' }));
check('localhost, a test name, a vercel address and an IP give no links, rather than wrong ones', ['localhost', 'a.localhost', 'x-y.vercel.app', '192.168.1.5', '', undefined].every((h) => eq(siteLinksOf(h), { live: '', rent: '' })));
check('an address set by hand wins, with https added and the slash removed', eq(siteLinksOf('localhost', { live: 'live.example.org/', rent: 'https://rent.example.org' }), { live: 'https://live.example.org', rent: 'https://rent.example.org' }));
check('one set by hand and one derived mix properly', eq(siteLinksOf('scoreit.today', { live: 'https://watch.example.org' }), { live: 'https://watch.example.org', rent: 'https://rent.scoreit.today' }));

check('from live., ref. or display. the way back to the bare domain', landingUrlOf('live.scoreit.today') === 'https://scoreit.today' && landingUrlOf('ref.scoreit.today') === 'https://scoreit.today' && landingUrlOf('display.scoreit.today') === 'https://scoreit.today' && landingUrlOf('www.scoreit.today') === 'https://scoreit.today');
check('from anywhere else there is none to offer', ['scoreit.today', 'localhost', 'main-x.vercel.app', 'venue.scoreit.today', '', null].every((h) => landingUrlOf(h) === ''));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
