import { describeApiError } from './errors.js';

let passed = 0, failed = 0;
function check(label, ok) { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label); } }

check('a function missing from the schema cache is a setup problem',
  describeApiError({ code: 'PGRST202', message: 'Could not find the function public.verify_referee_code' }).setup === true);
check('a missing column is a setup problem', describeApiError({ code: 'PGRST204', message: 'x' }).setup === true);
check('an undefined function is a setup problem', describeApiError({ code: '42883', message: 'x' }).setup === true);
check('a missing permission is a setup problem', describeApiError({ code: '42501', message: 'x' }).setup === true);
check('a failed fetch (no code) is a connection problem', describeApiError({ message: 'TypeError: Failed to fetch' }).setup === false);
check('a statement timeout is a connection style problem, retried', describeApiError({ code: '57014', message: 'canceling statement due to statement timeout' }).setup === false);
check('a gateway error is retried', describeApiError({ code: '', message: 'Bad Gateway' }).setup === false);
check('the original message is kept', describeApiError({ code: 'PGRST202', message: 'abc' }).message === 'abc');
check('a missing error object does not crash', describeApiError(undefined).setup === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
