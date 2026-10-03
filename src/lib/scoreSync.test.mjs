import { createScoreSync } from './scoreSync.js';

let passed = 0;
let failed = 0;
function check(label, condition, extra) {
  if (condition) { passed++; console.log('PASS:', label); }
  else { failed++; console.log('FAIL:', label, extra ?? ''); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fast = { debounceMs: 10, retryMs: 25 };

{
  const sent = [];
  const sync = createScoreSync({ ...fast, initial: null, send: async (v) => { sent.push(v); return { ok: true }; } });
  for (let i = 1; i <= 10; i++) sync.update(i, 0);
  await wait(60);
  check('quick taps are batched into one send with the final score', sent.length === 1 && sent[0].a === 10 && sent[0].b === 0, JSON.stringify(sent));
  check('state ends as saved', sync.getState() === 'saved');
  sync.stop();
}

{
  const states = [];
  let calls = 0;
  const sync = createScoreSync({
    ...fast, initial: null,
    onState: (s) => states.push(s),
    send: async () => { calls++; return calls === 1 ? { ok: false } : { ok: true }; },
  });
  sync.update(3, 2);
  await wait(120);
  check('a failed send is retried automatically', calls === 2 && sync.getState() === 'saved', `calls=${calls} state=${sync.getState()}`);
  check('the failure was visible as an error state', states.includes('error'), states.join(','));
  sync.stop();
}

{
  let calls = 0;
  const sync = createScoreSync({
    ...fast, initial: null,
    send: async () => { calls++; if (calls < 3) throw new Error('offline'); return { ok: true }; },
  });
  sync.update(1, 1);
  await wait(200);
  check('network errors are retried until they succeed', calls === 3 && sync.getState() === 'saved', `calls=${calls}`);
  sync.stop();
}

{
  const sent = [];
  const sync = createScoreSync({
    ...fast, initial: null,
    send: async (v) => { sent.push(v); await wait(60); return { ok: true }; },
  });
  sync.update(1, 0);
  await wait(30);
  sync.update(2, 0);
  await wait(250);
  check('a change made mid send is sent afterwards, nothing is lost', sent.length === 2 && sent[1].a === 2, JSON.stringify(sent));
  check('and it ends saved', sync.getState() === 'saved');
  sync.stop();
}

{
  let calls = 0;
  const states = [];
  const sync = createScoreSync({
    ...fast, initial: null,
    onState: (s) => states.push(s),
    send: async () => { calls++; return { ok: false, fatal: true, error: 'locked' }; },
  });
  sync.update(1, 0);
  await wait(60);
  sync.update(2, 0);
  await wait(80);
  check('a fatal answer stops retries and later updates', calls === 1 && states.includes('fatal'), `calls=${calls}`);
  sync.stop();
}

{
  let calls = 0;
  const sync = createScoreSync({ ...fast, initial: { a: 3, b: 2 }, send: async () => { calls++; return { ok: true }; } });
  sync.update(3, 2);
  await wait(50);
  check('an unchanged score is not sent again', calls === 0 && sync.getState() === 'saved');
  sync.stop();
}

{
  let calls = 0;
  const sync = createScoreSync({ ...fast, initial: { a: 5, b: 5 }, send: async () => { calls++; return { ok: true }; } });
  sync.update(6, 5);
  sync.update(5, 5);
  await wait(50);
  check('a tap and its undo send nothing', calls === 0);
  sync.stop();
}

{
  let calls = 0;
  const sync = createScoreSync({ ...fast, initial: null, send: async () => { calls++; return { ok: true }; } });
  sync.update(1, 0);
  sync.stop();
  await wait(60);
  check('stop() prevents any pending send', calls === 0);
}

{
  const sent = [];
  const sync = createScoreSync({ debounceMs: 5000, retryMs: 25, initial: null, send: async (v) => { sent.push(v); return { ok: true }; } });
  sync.update(4, 4);
  await sync.flushNow();
  check('flushNow sends right away', sent.length === 1 && sent[0].a === 4);
  sync.stop();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
