import { useEffect, useState } from 'react';
import { minutesSeconds } from '../lib/format';

export default function CodeEntry({ scopeLabel, checking, problem, onSubmit }) {
  const [value, setValue] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (problem?.error === 'locked') setSecondsLeft(problem.retry_after_seconds ?? 0);
  }, [problem]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  const locked = problem?.error === 'locked' && secondsLeft > 0;

  let message = '';
  if (problem?.error === 'invalid_code') {
    message =
      problem.attempts_left > 0
        ? `That code isn't right. ${problem.attempts_left} ${
            problem.attempts_left === 1 ? 'try' : 'tries'
          } left before ${scopeLabel} locks for 10 minutes.`
        : `Too many wrong codes. ${scopeLabel} is locked for 10 minutes.`;
  } else if (problem?.error === 'locked') {
    message =
      secondsLeft > 0
        ? `${scopeLabel} is locked after too many wrong codes. Try again in ${minutesSeconds(secondsLeft)}, or ask an admin for a new code.`
        : 'You can try again now.';
  } else if (problem?.error === 'tenant_inactive') {
    message = 'This tournament is not taking scores right now.';
  } else if (problem?.error === 'network') {
    message = `No connection. ${problem.message ?? ''}`;
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
        One code covers every match in {scopeLabel}. Your admin has it, it's on the referee sheet.
      </p>
    </form>
  );
}
