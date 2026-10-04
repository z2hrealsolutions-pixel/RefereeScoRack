import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Scorer from '../components/Scorer';
import { rubberLabel } from '../lib/matchTypes';
import { whenLabel } from '../lib/format';
import { mineKey, readStored, writeStored } from '../lib/codeStore';

const RECENT_MS = 90 * 1000;

export default function RefereeMatch() {
  const { tenant, division, scope, code, relock } = useOutletContext();
  const { divisionId, matchupId } = useParams();
  const navigate = useNavigate();
  const groupPath = `/${tenant.slug}/referee/${divisionId}/${scope.key}`;

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeRubber, setActiveRubber] = useState(null);
  const [notice, setNotice] = useState('');
  const [takingOver, setTakingOver] = useState(false);

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
    const [teamsRes, subsRes] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name')
        .in('id', [m.team_a_id, m.team_b_id].filter(Boolean)),
      supabase
        .from('sub_matches')
        .select('id, match_type, slot_number, points_value, team_a_score, team_b_score, winner_team_id, done, last_modified_at')
        .eq('matchup_id', matchupId)
        .order('slot_number'),
    ]);
    const err = teamsRes.error || subsRes.error;
    if (err) {
      setLoadError(err.message);
      return null;
    }
    const names = {};
    teamsRes.data.forEach((t) => {
      names[t.id] = t.name;
    });
    const next = { matchup: m, names, subs: subsRes.data };
    setData(next);
    return next;
  }, [matchupId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFatal(detail) {
    if (detail && detail.error === 'match_finished') {
      load();
      return;
    }
    // the code stopped being accepted: back to the group's door
    relock(detail);
  }

  async function handleFinished(result) {
    const { matchup, names } = data;
    const nameA = names[matchup.team_a_id] ?? 'TBD';
    const nameB = names[matchup.team_b_id] ?? 'TBD';
    if (division.category === 'league') {
      setActiveRubber(null);
      setNotice(result && result.already ? 'That rubber was already finished.' : 'Rubber finished.');
      await load();
      return;
    }
    navigate(groupPath, {
      state: {
        notice:
          result && result.already
            ? 'That match was already finished.'
            : `Finished: ${nameA} ${result.a} - ${result.b} ${nameB}`,
      },
    });
  }

  const backToGroup = (
    <Link to={groupPath} className="back-link mono">
      ← {scope.title}
    </Link>
  );

  if (loadError) {
    return (
      <div>
        {backToGroup}
        <div className="callout-error">{loadError}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {backToGroup}
        <p className="mono muted">Loading…</p>
      </div>
    );
  }

  const { matchup, names, subs } = data;

  // a match is only scored through the group it belongs to
  const inThisScope = matchup.division_id === divisionId && (matchup.group_id ?? null) === scope.groupId;
  if (!inThisScope) {
    return (
      <div>
        {backToGroup}
        <p className="page-sub">That match isn't part of {scope.label}.</p>
      </div>
    );
  }

  const nameA = names[matchup.team_a_id] ?? 'TBD';
  const nameB = names[matchup.team_b_id] ?? 'TBD';
  const isLeague = division.category === 'league';
  const isKnockout = matchup.group_id === null;

  const header = (
    <>
      {backToGroup}
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
                <p className="muted">{names[subs[0].winner_team_id] ?? ''} won.</p>
              </>
            )
          )}
        </div>
        <p className="muted small">
          A finished match can only be changed by an admin. Tell them if something is wrong.
        </p>
        <Link to={groupPath} className="btn-primary btn-big btn-link">
          Back to {scope.title}
        </Link>
      </div>
    );
  }

  // two referees on one match overwrite each other, so warn before taking over
  const mine = Boolean(readStored(mineKey(matchupId)));
  const someoneElse =
    matchup.status === 'live' &&
    !mine &&
    !takingOver &&
    subs.some(
      (s) => !s.done && s.last_modified_at && Date.now() - Date.parse(s.last_modified_at) < RECENT_MS
    );

  if (someoneElse) {
    return (
      <div>
        {header}
        <div className="callout-error">
          Another referee may be scoring this match right now, its score changed in the last minute and
          a second person typing over it would mix the two up. If that's you, carry on.
        </div>
        <button
          type="button"
          className="btn-primary btn-big"
          onClick={() => {
            writeStored(mineKey(matchupId), '1');
            setTakingOver(true);
          }}
        >
          I'm the one scoring this match
        </button>
        <Link to={groupPath} className="btn-ghost btn-big btn-link">
          Pick a different match
        </Link>
      </div>
    );
  }

  const markMine = () => writeStored(mineKey(matchupId), '1');

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
            onActivity={markMine}
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
            {subs.map((s) => (
              <button
                key={s.id}
                type="button"
                className="rubber-item"
                disabled={s.done}
                onClick={() => setActiveRubber(s.id)}
              >
                <span>
                  {rubberLabel(s.match_type)}
                  <span className="muted small"> · {s.points_value} pt{s.points_value === 1 ? '' : 's'}</span>
                </span>
                <span className="mono">
                  {s.done
                    ? `Final ${s.team_a_score}-${s.team_b_score}`
                    : s.team_a_score !== null
                      ? `Live ${s.team_a_score}-${s.team_b_score}`
                      : 'Start'}
                </span>
              </button>
            ))}
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
        onActivity={markMine}
      />
    </div>
  );
}
