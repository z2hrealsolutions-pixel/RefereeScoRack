import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { whenLabel } from '../lib/format';

function sortMatches(list) {
  const key = (v) => (v === null || v === undefined || v === '' ? '\uffff' : String(v));
  return [...list].sort(
    (a, b) =>
      key(a.scheduled_date).localeCompare(key(b.scheduled_date)) ||
      key(a.scheduled_time).localeCompare(key(b.scheduled_time)) ||
      key(a.court).localeCompare(key(b.court)) ||
      (a.bracket_position ?? 0) - (b.bracket_position ?? 0)
  );
}

export default function RefereeDivision() {
  const { tenant } = useOutletContext();
  const { divisionId } = useParams();
  const [division, setDivision] = useState(null);
  const [groups, setGroups] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [teams, setTeams] = useState({});
  const [scores, setScores] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [scope, setScope] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [divRes, groupsRes, teamsRes, matchRes] = await Promise.all([
        supabase.from('divisions').select('id, name, category').eq('id', divisionId).maybeSingle(),
        supabase.from('groups').select('id, name').eq('division_id', divisionId).order('name'),
        supabase.from('teams').select('id, name').eq('division_id', divisionId),
        supabase
          .from('matchups')
          .select('id, group_id, stage, status, team_a_id, team_b_id, court, scheduled_date, scheduled_time, bracket_position')
          .eq('division_id', divisionId),
      ]);
      if (!isMounted) return;
      const err = divRes.error || groupsRes.error || teamsRes.error || matchRes.error;
      if (err) {
        setLoadError(err.message);
        return;
      }
      const ids = matchRes.data.map((m) => m.id);
      let subs = [];
      if (ids.length > 0) {
        const subsRes = await supabase
          .from('sub_matches')
          .select('matchup_id, team_a_score, team_b_score, done')
          .in('matchup_id', ids);
        if (!isMounted) return;
        if (!subsRes.error) subs = subsRes.data;
      }
      const names = {};
      teamsRes.data.forEach((t) => {
        names[t.id] = t.name;
      });
      const byMatch = {};
      subs.forEach((s) => {
        (byMatch[s.matchup_id] ??= []).push(s);
      });
      setDivision(divRes.data);
      setGroups(groupsRes.data);
      setMatchups(matchRes.data);
      setTeams(names);
      setScores(byMatch);
      setLoaded(true);
      setScope((current) => current ?? (groupsRes.data[0]?.id ?? 'knockout'));
    }

    load();
    const timer = setInterval(load, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [divisionId]);

  if (loadError) {
    return (
      <div>
        <div className="callout-error">{loadError}</div>
      </div>
    );
  }

  if (!loaded) return <p className="mono muted">Loading…</p>;

  if (!division) {
    return (
      <div>
        <Link to={`/${tenant.slug}/referee`} className="back-link mono">
          ← Divisions
        </Link>
        <p className="page-sub">That division isn't open for scoring.</p>
      </div>
    );
  }

  const scopes = [
    ...groups.map((g) => ({ key: g.id, label: g.name })),
    { key: 'knockout', label: 'Knockout stage' },
  ];
  const shown = sortMatches(
    matchups.filter((m) => (scope === 'knockout' ? m.group_id === null : m.group_id === scope))
  );

  function resultOf(m) {
    const list = scores[m.id] ?? [];
    if (division.category === 'league') {
      const done = list.filter((s) => s.done).length;
      return done > 0 ? `${done} rubber${done === 1 ? '' : 's'} done` : '';
    }
    const s = list.find((x) => x.team_a_score !== null);
    return s ? `${s.team_a_score}-${s.team_b_score}` : '';
  }

  return (
    <div>
      <Link to={`/${tenant.slug}/referee`} className="back-link mono">
        ← Divisions
      </Link>
      <h1 className="page-title">{division.name}</h1>

      <div className="chip-row" role="tablist">
        {scopes.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={scope === s.key}
            className={`chip ${scope === s.key ? 'chip-active' : ''}`}
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="page-sub">No matches here yet.</p>}

      <div className="match-list">
        {shown
          .filter((m) => m.status !== 'bye')
          .map((m) => {
            const known = m.team_a_id && m.team_b_id;
            const when = whenLabel(m);
            const result = resultOf(m);
            const body = (
              <>
                <span className="match-teams">
                  {teams[m.team_a_id] ?? 'TBD'} <span className="muted">vs</span>{' '}
                  {teams[m.team_b_id] ?? 'TBD'}
                </span>
                <span className="match-meta mono">
                  {m.group_id === null ? `${m.stage} · ` : ''}
                  {when || 'No court set yet'}
                </span>
                <span className="match-status mono">
                  {m.status === 'live' && <span className="live">LIVE {result}</span>}
                  {m.status === 'complete' && <span className="muted">Final {result}</span>}
                  {m.status === 'scheduled' && !known && <span className="muted">Waiting for teams</span>}
                  {m.status === 'scheduled' && known && <span className="muted">Upcoming</span>}
                </span>
              </>
            );
            return known ? (
              <Link
                key={m.id}
                to={`/${tenant.slug}/referee/${divisionId}/match/${m.id}`}
                className="match-row"
              >
                {body}
              </Link>
            ) : (
              <div key={m.id} className="match-row match-row-disabled">
                {body}
              </div>
            );
          })}
      </div>
    </div>
  );
}
