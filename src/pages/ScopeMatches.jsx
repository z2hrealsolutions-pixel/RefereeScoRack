import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
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

export default function ScopeMatches() {
  const { tenant, division, scope, relock } = useOutletContext();
  const { divisionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [notice] = useState(() => (location.state && location.state.notice) || '');
  const [matchups, setMatchups] = useState([]);
  const [teams, setTeams] = useState({});
  const [scores, setScores] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  // the notice is shown once, a refresh shouldn't bring it back
  useEffect(() => {
    if (notice) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      let query = supabase
        .from('matchups')
        .select('id, group_id, stage, status, team_a_id, team_b_id, court, scheduled_date, scheduled_time, bracket_position')
        .eq('division_id', divisionId);
      query = scope.groupId ? query.eq('group_id', scope.groupId) : query.is('group_id', null);
      const [matchRes, teamsRes] = await Promise.all([
        query,
        supabase.from('teams').select('id, name').eq('division_id', divisionId),
      ]);
      if (!isMounted) return;
      const err = matchRes.error || teamsRes.error;
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
      setMatchups(matchRes.data);
      setTeams(names);
      setScores(byMatch);
      setLoaded(true);
    }

    load();
    const timer = setInterval(load, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [divisionId, scope.groupId]);

  function resultOf(m) {
    const list = scores[m.id] ?? [];
    if (division.category === 'league') {
      const done = list.filter((s) => s.done).length;
      return done > 0 ? `${done} rubber${done === 1 ? '' : 's'} done` : '';
    }
    const s = list.find((x) => x.team_a_score !== null);
    return s ? `${s.team_a_score}-${s.team_b_score}` : '';
  }

  const shown = sortMatches(matchups.filter((m) => m.status !== 'bye'));
  const base = `/${tenant.slug}/referee/${divisionId}/${scope.key}`;

  return (
    <div>
      <Link to={`/${tenant.slug}/referee/${divisionId}`} className="back-link mono">
        ← {division.name}
      </Link>
      <h1 className="page-title">{scope.title}</h1>
      <p className="page-sub">Pick the match you're scoring.</p>

      {notice && <div className="callout-ok">{notice}</div>}
      {loadError && <div className="callout-error">{loadError}</div>}
      {!loaded && !loadError && <p className="mono muted">Loading…</p>}
      {loaded && shown.length === 0 && <p className="page-sub">No matches here yet.</p>}

      <div className="match-list">
        {shown.map((m) => {
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
            <Link key={m.id} to={`${base}/match/${m.id}`} className="match-row">
              {body}
            </Link>
          ) : (
            <div key={m.id} className="match-row match-row-disabled">
              {body}
            </div>
          );
        })}
      </div>

      <div className="lock-row">
        <button type="button" className="btn-ghost" onClick={() => relock(null)}>
          Lock {scope.label} on this phone
        </button>
      </div>
    </div>
  );
}
