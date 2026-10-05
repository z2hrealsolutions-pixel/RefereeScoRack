import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { categoryLabel } from '../lib/format';

export default function RefereeDivisions() {
  const { tenant } = useOutletContext();
  const [divisions, setDivisions] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    supabase
      .from('divisions')
      .select('id, name, category, age_label, gender_label')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setDivisions(data);
      });
    return () => {
      isMounted = false;
    };
  }, [tenant.id]);

  return (
    <div>
      <Link to={`/${tenant.slug}`} className="back-link mono">
        ← {tenant.name}
      </Link>
      <h1 className="page-title">Which division?</h1>

      {loadError && <div className="callout-error">{loadError}</div>}
      {divisions === null && !loadError && <p className="mono muted">Loading…</p>}
      {divisions?.length === 0 && (
        <p className="page-sub">No divisions are open for scoring yet.</p>
      )}

      <div className="tile-list">
        {divisions?.map((d) => (
          <Link key={d.id} to={`/${tenant.slug}/referee/${d.id}`} className="tile">
            <span className="tile-title">{d.name}</span>
            <span className="tile-sub">
              {categoryLabel(d.category)}
              {d.gender_label ? ` · ${d.gender_label}` : ''}
              {d.age_label ? ` · ${d.age_label}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
