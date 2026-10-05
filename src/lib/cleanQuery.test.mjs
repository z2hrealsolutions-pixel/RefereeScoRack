import { cleanQuery, searchable } from './cleanQuery.js';
let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

check('spaces are trimmed and squeezed', cleanQuery('  Colombo    Open ') === 'Colombo Open');
check('wildcard characters cannot be used to list everything', cleanQuery('%') === '' && cleanQuery('%%%') === '' && cleanQuery('_') === '' && cleanQuery('*') === '' && cleanQuery('a%b') === 'a b');
check('a backslash is removed too', cleanQuery('a\\b') === 'a b' && cleanQuery('\\') === '');
check('too long is cut', cleanQuery('x'.repeat(200)).length === 60);
check('nothing, null and numbers are all fine', cleanQuery() === '' && cleanQuery(null) === '' && cleanQuery(undefined) === '' && cleanQuery(42) === '42');
check('letters of any language are kept', cleanQuery('கொழும்பு ஓபன்') === 'கொழும்பு ஓபன்' && cleanQuery('කොළඹ විවෘත') === 'කොළඹ විවෘත');
check('quotes and punctuation are kept, the database handles those safely', cleanQuery("Men's Open (A)") === "Men's Open (A)");
check('it takes two characters to search', !searchable('') && !searchable('a') && !searchable(' a ') && searchable('ab') && searchable('Co'));
check('only wildcards is not a search', !searchable('%%') && !searchable('__') && !searchable('% %'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
