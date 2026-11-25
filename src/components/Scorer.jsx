import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createScoreSync } from '../lib/scoreSync';
import { describeApiError } from '../lib/errors';
import { scoreEnds, ruleText } from '../lib/gameRules';

const SYNC_TEXT = {
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Not saved yet, retrying. Keep scoring, nothing is lost.',
  fatal: 'Stopped',
};

export default function Scorer({
  matchupId,
  code,
  subId,
  teamA,
  teamB,
  initialA,
  initialB,
  title,
  isKnockout,
  rule = null,
  setNumber = null,
  setsNow = null,
  onFinished,
  onFatal,
  onActivity,
}) {
  const hasInitial =
    initialA !== null && initialA !== undefined && initialB !== null && initialB !== undefined;
  const startA = hasInitial ? initialA : 0;
  const startB = hasInitial ? initialB : 0;

  // a and b are the real numbers. The texts are what is in the boxes, which can
  // briefly be empty while someone is typing a new score over an old one.
  const [a, setA] = useState(startA);
  const [b, setB] = useState(startB);
  const [aText, setAText] = useState(String(startA));
  const [bText, setBText] = useState(String(startB));
  const [sync, setSync] = useState('saved');
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');

  const current = useRef({ a: startA, b: startB });
  const subIdRef = useRef(subId);
  const frozenRef = useRef(false);
  const engineRef = useRef(null);
  const onFatalRef = useRef(onFatal);
  onFatalRef.current = onFatal;
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  // a set of a best-of match goes to its own function, a single game to the old one
  function callScore(sa, sb, finish) {
    if (setNumber) {
      return supabase.rpc('submit_set_score', {
        p_matchup_id: matchupId,
        p_otp: code,
        p_set_number: setNumber,
        p_team_a_score: sa,
        p_team_b_score: sb,
        p_finish: finish,
      });
    }
    return supabase.rpc('submit_score', {
      p_matchup_id: matchupId,
      p_otp: code,
      p_sub_match_id: subIdRef.current,
      p_team_a_score: sa,
      p_team_b_score: sb,
      p_finish: finish,
    });
  }

  useEffect(() => {
    const engine = createScoreSync({
      initial: hasInitial ? { a: initialA, b: initialB } : null,
      onState: (state, detail) => {
        setSync(state);
        if (state === 'fatal' && onFatalRef.current) onFatalRef.current(detail);
      },
      send: async ({ a: sa, b: sb }) => {
        if (frozenRef.current) return { ok: true };
        const { data, error } = await callScore(sa, sb, false);
        if (error) {
          const d = describeApiError(error);
          if (d.setup) return { ok: false, fatal: true, error: 'server', message: d.message };
          return { ok: false, message: d.message };
        }
        if (data && data.ok) {
          if (data.sub_match) subIdRef.current = data.sub_match.id;
          return { ok: true };
        }
        return { ok: false, fatal: true, ...(data || {}) };
      },
    });
    engineRef.current = engine;
    return () => engine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchupId, code, subId]);

  useEffect(() => {
    if (sync === 'saved') return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [sync]);

  function setText(team, value) {
    if (team === 'a') setAText(value);
    else setBText(value);
  }

  function apply(team, value) {
    const next = { a: current.current.a, b: current.current.b };
    next[team] = value;
    if (next.a === current.current.a && next.b === current.current.b) return;
    current.current = next;
    setA(next.a);
    setB(next.b);
    if (engineRef.current) engineRef.current.update(next.a, next.b);
    if (onActivityRef.current) onActivityRef.current();
  }

  function change(team, delta) {
    const value = Math.max(0, current.current[team] + delta);
    setText(team, String(value));
    apply(team, value);
  }

  function typed(team, raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    setText(team, digits);
    if (digits !== '') apply(team, Number(digits));
  }

  function settle(team) {
    const shown = team === 'a' ? aText : bText;
    if (shown === '') setText(team, String(current.current[team]));
  }

  async function finish() {
    setFinishing(true);
    setFinishError('');
    frozenRef.current = true;
    const { data, error } = await callScore(current.current.a, current.current.b, true);
    setFinishing(false);

    if (error) {
      frozenRef.current = false;
      const d = describeApiError(error);
      if (d.setup) {
        setConfirming(false);
        if (onFatalRef.current) onFatalRef.current({ error: 'server', message: d.message });
        return;
      }
      setFinishError('No connection. Nothing is final yet, check your signal and try again.');
      return;
    }
    if (data && data.ok) {
      onFinished({ a: current.current.a, b: current.current.b, data });
      return;
    }

    frozenRef.current = false;
    setConfirming(false);
    const reason = data && data.error;
    if (reason === 'match_finished' || reason === 'set_finished') {
      onFinished({ already: true });
    } else if (reason === 'game_not_over') {
      setFinishError(`That score is not a finished ${setNumber ? 'set' : 'game'} yet. ${ruleText(data.rule || rule)}`);
    } else if (reason === 'next_round_started') {
      setFinishError('The next match in the bracket has already started, so this result can no longer be changed here. Ask an admin.');
    } else if (reason === 'scores_tied') {
      setFinishError('The scores are level, a match needs a winner.');
    } else if (reason === 'invalid_code' || reason === 'locked' || reason === 'tenant_inactive') {
      if (onFatalRef.current) onFatalRef.current(data);
    } else {
      setFinishError('Something went wrong. Try again.');
    }
  }

  const winnerName = a > b ? teamA : teamB;
  const level = a === b;
  const incomplete = aText === '' || bText === '';
  const unit = setNumber ? 'set' : 'match';
  const over = scoreEnds(a, b, rule);
  const notOver = !level && !incomplete && !over;
  const lastSet = setsNow ? (a > b ? setsNow.a : setsNow.b) + 1 >= setsNow.need : !setNumber;

  return (
    <div className="scorer">
      {title && <p className="scorer-title">{title}</p>}
      {rule && ruleText(rule) && <p className="muted small scorer-rule">{ruleText(rule)}</p>}

      {[
        { key: 'a', name: teamA, score: a, text: aText },
        { key: 'b', name: teamB, score: b, text: bText },
      ].map((team) => (
        <div key={team.key} className="team-card">
          <div className="team-name">{team.name}</div>
          <input
            className="team-score-input mono"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label={`${team.name} score`}
            value={team.text}
            onChange={(event) => typed(team.key, event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={() => settle(team.key)}
          />
          <div className="team-buttons">
            <button
              type="button"
              className="tap tap-minus"
              aria-label={`Take a point off ${team.name}`}
              onClick={() => change(team.key, -1)}
              disabled={team.score === 0}
            >
              −1
            </button>
            <button
              type="button"
              className="tap tap-plus"
              aria-label={`Add a point to ${team.name}`}
              onClick={() => change(team.key, 1)}
            >
              +1
            </button>
          </div>
        </div>
      ))}

      <p className={`sync-line mono sync-${sync}`}>{SYNC_TEXT[sync]}</p>
      <p className="muted small scorer-hint">
        Tap the buttons as the game goes, or type the final score. It saves by itself.
      </p>

      {finishError && <div className="callout-error">{finishError}</div>}

      <button
        type="button"
        className="btn-primary btn-big"
        disabled={level || finishing || incomplete || (Boolean(rule) && !over)}
        onClick={() => setConfirming(true)}
      >
        {setNumber ? `Finish set ${setNumber}` : 'Finish match'}
      </button>
      {level && !incomplete && (
        <p className="muted small">Scores are level. A {unit} needs a winner before it can finish.</p>
      )}
      {notOver && (
        <p className="muted small">Not finished yet. {ruleText(rule)}</p>
      )}

      {confirming && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true">
            <h2 className="sheet-title">{setNumber ? `Finish set ${setNumber}?` : 'Finish this match?'}</h2>
            <p className="sheet-score mono">
              {teamA} {a} - {b} {teamB}
            </p>
            <p className="sheet-text">
              {setNumber ? (
                lastSet ? (
                  <>
                    <strong>{winnerName}</strong> wins the set and the match.
                    {isKnockout ? ' They move on to the next round.' : ''} Once finished, only an admin can
                    change it.
                  </>
                ) : (
                  <>
                    <strong>{winnerName}</strong> wins this set. The next set starts after this.
                  </>
                )
              ) : (
                <>
                  <strong>{winnerName}</strong> wins.
                  {isKnockout ? ' They move on to the next round.' : ''} Once finished, only an admin can
                  change it.
                </>
              )}
            </p>
            {finishError && <div className="callout-error">{finishError}</div>}
            <button type="button" className="btn-primary btn-big" disabled={finishing} onClick={finish}>
              {finishing ? 'Finishing…' : setNumber ? `Yes, finish set ${setNumber}` : 'Yes, finish the match'}
            </button>
            <button
              type="button"
              className="btn-ghost btn-big"
              disabled={finishing}
              onClick={() => {
                setConfirming(false);
                setFinishError('');
              }}
            >
              Keep scoring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
