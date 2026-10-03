import { useEffect, useState } from 'react';
import { minutesSeconds } from '../lib/format';

export default function CodeEntry({ scopeLabel, checking, problem: reported, onSubmit }) {
  const [value, setValue] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  // the fifth wrong guess locks the group on the server at that moment for ten
  // minutes, so "no tries left" is already a lock, not a warning
  const problem =
    reported && reported.error === 'invalid_code' && reported.attempts_left === 0
      ? { error: 'locked', retry_after_seconds: 600 }
      : reported;

  useEffect(() => {
    if (problem?.error === 'locked') setSecondsLeft(problem.retry_after_seconds ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reported]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  const locked = problem?.error === 'locked' && secondsLeft > 0;

  let message = '';
  if (problem?.error === 'invalid_code') {
    message = `That code isn't right. ${problem.attempts_left} ${
      problem.attempts_left === 1 ? 'try' : 'tries'
    } left before ${scopeLabel} locks for 10 minutes.`;
  } else if (problem?.error === 'locked') {
    message =
      secondsLeft > 0
        ? `${scopeLabel} is locked after too many wrong codes. Try again in ${minutesSeconds(secondsLeft)}, or ask an admin for a new code.`
        : 'You can try again now.';
  } else if (problem?.error === 'code_changed') {
    message = `The code for ${scopeLabel} has changed. Enter the new one.`;
  } else if (problem?.error === 'tenant_inactive') {
    message = 'This tournament is not taking scores right now.';
  } else if (problem?.error === 'network') {
    message = 'No connection. Check your signal and try again.';
  } else if (problem?.error === 'server') {
    message = `The scoring service isn't set up properly yet (${problem.message}). This isn't a signal problem, tell an admin.`;
  } else if (problem) {
    message = 'Something went wrong. Try again.';
  }

  return (
    <form
      className="code-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!locked && value.length >= 4) onSubmit(value);
      }}
    >
      <label className="field-label" htmlFor="refCode">
        Code for {scopeLabel}
      </label>
      <input
        id="refCode"
        className="text-input code-input mono"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus
        maxLength={8}
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
        placeholder="------"
      />
      {message && <div className="callout-error">{message}</div>}
      <button type="submit" className="btn-primary btn-big" disabled={checking || locked || value.length < 4}>
        {checking ? 'Checking…' : 'Unlock scoring'}
      </button>
      <p className="muted small">
        One code opens every match in {scopeLabel}, and stays unlocked on this phone until you close the tab. Your admin has it, it's on the referee sheet.
      </p>
    </form>
  );
}
