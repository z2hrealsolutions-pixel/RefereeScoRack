import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createScoreSync } from '../lib/scoreSync';

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
  onFinished,
  onFatal,
}) {
  const hasInitial =
    initialA !== null && initialA !== undefined && initialB !== null && initialB !== undefined;
  const startA = hasInitial ? initialA : 0;
  const startB = hasInitial ? initialB : 0;

  const [a, setA] = useState(startA);
  const [b, setB] = useState(startB);
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

  useEffect(() => {
    const engine = createScoreSync({
      initial: hasInitial ? { a: initialA, b: initialB } : null,
      onState: (state, detail) => {
        setSync(state);
        if (state === 'fatal' && onFatalRef.current) onFatalRef.current(detail);
      },
      send: async ({ a: sa, b: sb }) => {
        if (frozenRef.current) return { ok: true };
        const { data, error } = await supabase.rpc('submit_score', {
          p_matchup_id: matchupId,
          p_otp: code,
          p_sub_match_id: subIdRef.current,
          p_team_a_score: sa,
          p_team_b_score: sb,
          p_finish: false,
        });
        if (error) return { ok: false, message: error.message };
        if (data && data.ok) {
          subIdRef.current = data.sub_match.id;
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

  function change(team, delta) {
    const next = { a: current.current.a, b: current.current.b };
    next[team] = Math.max(0, next[team] + delta);
    if (next.a === current.current.a && next.b === current.current.b) return;
    current.current = next;
    setA(next.a);
    setB(next.b);
    if (engineRef.current) engineRef.current.update(next.a, next.b);
  }

  async function finish() {
    setFinishing(true);
    setFinishError('');
    frozenRef.current = true;
    const { data, error } = await supabase.rpc('submit_score', {
      p_matchup_id: matchupId,
      p_otp: code,
      p_sub_match_id: subIdRef.current,
      p_team_a_score: current.current.a,
      p_team_b_score: current.current.b,
      p_finish: true,
    });
    setFinishing(false);

    if (error) {
      frozenRef.current = false;
      setFinishError("No connection. Nothing is final yet, check your signal and try again.");
      return;
    }
    if (data && data.ok) {
      onFinished({ a: current.current.a, b: current.current.b, data });
      return;
    }

    frozenRef.current = false;
    setConfirming(false);
    const reason = data && data.error;
    if (reason === 'match_finished') {
      onFinished({ already: true });
    } else if (reason === 'next_round_started') {
      setFinishError('The next match in the bracket has already started, so this result can no longer be changed here. Ask an admin.');
    } else if (reason === 'scores_tied') {
      setFinishError("The scores are level, a match needs a winner.");
    } else if (reason === 'invalid_code' || reason === 'locked' || reason === 'tenant_inactive') {
      if (onFatalRef.current) onFatalRef.current(data);
    } else {
      setFinishError('Something went wrong. Try again.');
    }
  }

  const winnerName = a > b ? teamA : teamB;
  const level = a === b;

  return (
    <div className="scorer">
      {title && <p className="scorer-title">{title}</p>}

      {[
        { key: 'a', name: teamA, score: a },
        { key: 'b', name: teamB, score: b },
      ].map((team) => (
        <div key={team.key} className="team-card">
          <div className="team-name">{team.name}</div>
          <div className="team-score mono" aria-live="polite">
            {team.score}
          </div>
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

      {finishError && <div className="callout-error">{finishError}</div>}

      <button
        type="button"
        className="btn-primary btn-big"
        disabled={level || finishing}
        onClick={() => setConfirming(true)}
      >
        Finish match
      </button>
      {level && <p className="muted small">Scores are level. A match needs a winner before it can finish.</p>}

      {confirming && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true">
            <h2 className="sheet-title">Finish this match?</h2>
            <p className="sheet-score mono">
              {teamA} {a} - {b} {teamB}
            </p>
            <p className="sheet-text">
              <strong>{winnerName}</strong> wins.
              {isKnockout ? ' They move on to the next round.' : ''} Once finished, only an admin can
              change it.
            </p>
            {finishError && <div className="callout-error">{finishError}</div>}
            <button type="button" className="btn-primary btn-big" disabled={finishing} onClick={finish}>
              {finishing ? 'Finishing…' : 'Yes, finish the match'}
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
