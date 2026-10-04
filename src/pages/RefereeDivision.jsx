import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function RefereeDivision() {
  const { tenant } = useOutletContext();
  const { divisionId } = useParams();
  const [division, setDivision] = useState(null);
  const [groups, setGroups] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [divRes, groupsRes, matchRes] = await Promise.all([
        supabase.from('divisions').select('id, name, category').eq('id', divisionId).maybeSingle(),
        supabase.from('groups').select('id, name').eq('division_id', divisionId).order('name'),
        supabase.from('matchups').select('id, group_id, status').eq('division_id', divisionId),
      ]);
      if (!isMounted) return;
      const err = divRes.error || groupsRes.error || matchRes.error;
      if (err) {
        setLoadError(err.message);
        return;
      }
      setDivision(divRes.data);
      setGroups(groupsRes.data);
      setMatchups(matchRes.data);
      setLoaded(true);
    }

    load();
    const timer = setInterval(load, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [divisionId]);

  if (loadError) return <div className="callout-error">{loadError}</div>;
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
    ...groups.map((g) => ({ key: g.id, label: g.name, groupId: g.id })),
    { key: 'knockout', label: 'Knockout stage', groupId: null },
  ];

  function summary(groupId) {
    const list = matchups.filter((m) => (m.group_id ?? null) === groupId && m.status !== 'bye');
    const live = list.filter((m) => m.status === 'live').length;
    const done = list.filter((m) => m.status === 'complete').length;
    if (list.length === 0) return 'No matches yet';
    return `${list.length} match${list.length === 1 ? '' : 'es'} · ${done} finished${
      live > 0 ? ` · ${live} live` : ''
    }`;
  }

  return (
    <div>
      <Link to={`/${tenant.slug}/referee`} className="back-link mono">
        ← Divisions
      </Link>
      <h1 className="page-title">{division.name}</h1>
      <p className="page-sub">Pick your group. You'll be asked for its code once.</p>

      <div className="tile-list">
        {scopes.map((s) => (
          <Link key={s.key} to={`/${tenant.slug}/referee/${divisionId}/${s.key}`} className="tile">
            <span className="tile-title">{s.label}</span>
            <span className="tile-sub">{summary(s.groupId)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
