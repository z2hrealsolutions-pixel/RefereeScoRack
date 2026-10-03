import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import CodeEntry from '../components/CodeEntry';
import Scorer from '../components/Scorer';
import { rubberLabel } from '../lib/matchTypes';
import { whenLabel } from '../lib/format';

function readStored(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key, value) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* private mode, the code just isn't remembered */
  }
}

export default function RefereeMatch() {
  const { tenant } = useOutletContext();
  const { divisionId, matchupId } = useParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState(null);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState(null);
  const [activeRubber, setActiveRubber] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const matchRes = await supabase
      .from('matchups')
      .select('id, division_id, group_id, stage, status, team_a_id, team_b_id, court, scheduled_date, scheduled_time')
      .eq('id', matchupId)
      .maybeSingle();
    if (matchRes.error) {
      setLoadError(matchRes.error.message);
      return null;
    }
    const m = matchRes.data;
    if (!m) {
      setLoadError('That match could not be found.');
      return null;
    }
    const [divRes, teamsRes, subsRes, groupRes] = await Promise.all([
      supabase.from('divisions').select('id, name, category').eq('id', m.division_id).maybeSingle(),
      supabase
        .from('teams')
        .select('id, name')
        .in('id', [m.team_a_id, m.team_b_id].filter(Boolean)),
      supabase
        .from('sub_matches')
        .select('id, match_type, slot_number, points_value, team_a_score, team_b_score, winner_team_id, done')
        .eq('matchup_id', matchupId)
        .order('slot_number'),
      m.group_id
        ? supabase.from('groups').select('name').eq('id', m.group_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const err = divRes.error || teamsRes.error || subsRes.error || groupRes.error;
    if (err) {
      setLoadError(err.message);
      return null;
    }
    const names = {};
    teamsRes.data.forEach((t) => {
      names[t.id] = t.name;
    });
    const next = {
      matchup: m,
      division: divRes.data,
      names,
      subs: subsRes.data,
      scopeLabel: m.group_id ? groupRes.data?.name ?? 'this group' : 'the knockout stage',
    };
    setData(next);
    return next;
  }, [matchupId]);

  const storageKey = data
    ? `scorack-code:${data.matchup.division_id}:${data.matchup.group_id ?? 'knockout'}`
    : null;

  async function verify(candidate, key) {
    setChecking(true);
    setProblem(null);
    const { data: result, error } = await supabase.rpc('verify_referee_code', {
      p_matchup_id: matchupId,
      p_otp: candidate,
    });
    setChecking(false);
    if (error) {
      setProblem({ error: 'network', message: error.message });
      return false;
    }
    if (result && result.ok) {
      writeStored(key, candidate);
      setCode(candidate);
      return true;
    }
    writeStored(key, null);
    setProblem(result || { error: 'unknown' });
    return false;
  }

  useEffect(() => {
    load();
  }, [load]);

  // a code already accepted for this group, on this phone, is tried again quietly
  useEffect(() => {
    if (!data || code) return;
    const status = data.matchup.status;
    if (status === 'complete' || status === 'bye') return;
    const stored = readStored(storageKey);
    if (stored) verify(stored, storageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function handleFatal(detail) {
    const reason = detail && detail.error;
    if (reason === 'match_finished') {
      load();
      return;
    }
    writeStored(storageKey, null);
    setCode(null);
    setActiveRubber(null);
    setProblem(detail || { error: 'unknown' });
  }

  async function handleFinished(result) {
    setActiveRubber(null);
    if (result && result.already) {
      setNotice('This match was already finished.');
    }
    await load();
  }

  if (loadError) {
    return (
      <div>
        <Link to={`/${tenant.slug}/referee/${divisionId}`} className="back-link mono">
          ← Matches
        </Link>
        <div className="callout-error">{loadError}</div>
      </div>
    );
  }

  if (!data) return <p className="mono muted">Loading…</p>;

  const { matchup, division, names, subs, scopeLabel } = data;
  const nameA = names[matchup.team_a_id] ?? 'TBD';
  const nameB = names[matchup.team_b_id] ?? 'TBD';
  const isLeague = division.category === 'league';
  const isKnockout = matchup.group_id === null;
  const back = (
    <Link to={`/${tenant.slug}/referee/${divisionId}`} className="back-link mono">
      ← {division.name}
    </Link>
  );
  const header = (
    <>
      {back}
      <h1 className="page-title">
        {nameA} <span className="muted">vs</span> {nameB}
      </h1>
      <p className="page-sub mono">
        {isKnockout ? `${matchup.stage} · ` : ''}
        {whenLabel(matchup) || 'No court set yet'}
      </p>
    </>
  );

  if (matchup.status === 'bye') {
    return (
      <div>
        {header}
        <p className="page-sub">This is a bye, there is nothing to score.</p>
      </div>
    );
  }

  if (!matchup.team_a_id || !matchup.team_b_id) {
    return (
      <div>
        {header}
        <p className="page-sub">
          This match is waiting for the winners of the matches before it. Come back once both teams
          are known.
        </p>
      </div>
    );
  }

  if (matchup.status === 'complete') {
    return (
      <div>
        {header}
        {notice && <div className="callout-ok">{notice}</div>}
        <div className="final-panel">
          <p className="final-label mono">FINAL</p>
          {isLeague ? (
            <div className="rubber-list">
              {subs.map((s) => (
                <div key={s.id} className="rubber-item rubber-item-static">
                  <span>{rubberLabel(s.match_type)}</span>
                  <span className="mono">
                    {s.team_a_score !== null ? `${s.team_a_score}-${s.team_b_score}` : 'not played'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            subs[0] &&
            subs[0].team_a_score !== null && (
              <>
                <p className="final-score mono">
                  {nameA} {subs[0].team_a_score} - {subs[0].team_b_score} {nameB}
                </p>
                <p className="muted">
                  {names[subs[0].winner_team_id] ?? ''} won.
                </p>
              </>
            )
          )}
        </div>
        <p className="muted small">
          A finished match can only be changed by an admin. Tell them if something is wrong.
        </p>
      </div>
    );
  }

  if (!code) {
    return (
      <div>
        {header}
        <CodeEntry
          scopeLabel={scopeLabel}
          checking={checking}
          problem={problem}
          onSubmit={(value) => verify(value, storageKey)}
        />
      </div>
    );
  }

  if (isLeague) {
    const rubber = subs.find((s) => s.id === activeRubber);
    if (rubber) {
      return (
        <div>
          {header}
          <button type="button" className="back-link mono link-button" onClick={() => setActiveRubber(null)}>
            ← All rubbers
          </button>
          <Scorer
            key={rubber.id}
            matchupId={matchupId}
            code={code}
            subId={rubber.id}
            teamA={nameA}
            teamB={nameB}
            initialA={rubber.team_a_score}
            initialB={rubber.team_b_score}
            title={`${rubberLabel(rubber.match_type)} · worth ${rubber.points_value} point${rubber.points_value === 1 ? '' : 's'}`}
            isKnockout={false}
            onFinished={handleFinished}
            onFatal={handleFatal}
          />
        </div>
      );
    }
    return (
      <div>
        {header}
        {notice && <div className="callout-ok">{notice}</div>}
        {subs.length === 0 ? (
          <p className="page-sub">
            No rubbers have been set up for this tie yet. Ask an admin to add them.
          </p>
        ) : (
          <div className="rubber-list">
            {subs.map((s) => {
              const finished = s.done;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="rubber-item"
                  disabled={finished}
                  onClick={() => setActiveRubber(s.id)}
                >
                  <span>
                    {rubberLabel(s.match_type)}
                    <span className="muted small"> · {s.points_value} pt{s.points_value === 1 ? '' : 's'}</span>
                  </span>
                  <span className="mono">
                    {finished
                      ? `Final ${s.team_a_score}-${s.team_b_score}`
                      : s.team_a_score !== null
                        ? `Live ${s.team_a_score}-${s.team_b_score}`
                        : 'Start'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="muted small">
          Finishing the last rubber doesn't end the tie, an admin marks the tie complete.
        </p>
      </div>
    );
  }

  const only = subs[0];
  return (
    <div>
      {header}
      {notice && <div className="callout-ok">{notice}</div>}
      <Scorer
        key={`${matchupId}-${only ? only.id : 'new'}`}
        matchupId={matchupId}
        code={code}
        subId={only ? only.id : null}
        teamA={nameA}
        teamB={nameB}
        initialA={only ? only.team_a_score : null}
        initialB={only ? only.team_b_score : null}
        title=""
        isKnockout={isKnockout}
        onFinished={handleFinished}
        onFatal={handleFatal}
      />
    </div>
  );
}
