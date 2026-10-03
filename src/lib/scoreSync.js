// Keeps a live score in step with the server, on bad wifi. No React in
// here on purpose, so it can be tested on its own.
//
// update(a, b) is called on every tap. Taps are batched, so ten quick
// taps send once, with the final numbers. If a send fails it retries
// by itself until it gets through, and a score changed while a send is
// in flight is sent as soon as that one lands. A send can also report
// a fatal answer (wrong code, match already finished), which stops the
// engine so it doesn't keep hammering the server.
//
// send({ a, b }) must resolve to one of:
//   { ok: true }
//   { ok: false, fatal: true, ... }   stop, nothing will fix this by retrying
//   { ok: false, ... }                try again shortly
export function createScoreSync({
  send,
  onState,
  initial = null,
  debounceMs = 400,
  retryMs = 3000,
  timers = { set: setTimeout, clear: clearTimeout },
}) {
  let latest = initial;
  let confirmed = initial;
  let debounceTimer = null;
  let retryTimer = null;
  let sending = false;
  let stopped = false;
  let state = 'saved';

  const same = (x, y) => Boolean(x && y && x.a === y.a && x.b === y.b);

  function setState(next, detail) {
    state = next;
    if (onState) onState(next, detail);
  }

  async function flush() {
    if (stopped || sending) return;
    if (!latest || same(latest, confirmed)) {
      setState('saved');
      return;
    }
    const target = { a: latest.a, b: latest.b };
    sending = true;
    setState('saving');
    let result;
    try {
      result = await send(target);
    } catch (error) {
      result = { ok: false, message: String(error) };
    }
    sending = false;
    if (stopped) return;

    if (result && result.ok) {
      confirmed = target;
      if (!same(latest, confirmed)) {
        flush();
        return;
      }
      setState('saved', result);
      return;
    }
    if (result && result.fatal) {
      stopped = true;
      setState('fatal', result);
      return;
    }
    setState('error', result);
    retryTimer = timers.set(flush, retryMs);
  }

  function update(a, b) {
    if (stopped) return;
    latest = { a, b };
    timers.clear(debounceTimer);
    timers.clear(retryTimer);
    if (!same(latest, confirmed)) setState('saving');
    debounceTimer = timers.set(flush, debounceMs);
  }

  function flushNow() {
    timers.clear(debounceTimer);
    timers.clear(retryTimer);
    return flush();
  }

  function stop() {
    stopped = true;
    timers.clear(debounceTimer);
    timers.clear(retryTimer);
  }

  return { update, flushNow, stop, getState: () => state };
}
