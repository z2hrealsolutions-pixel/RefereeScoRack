import { useEffect, useState } from 'react';
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import CodeEntry from '../components/CodeEntry';
import { describeApiError } from '../lib/errors';
import { codeKey, readStored, writeStored } from '../lib/codeStore';

// A group (or the knockout stage) is unlocked once, here. Everything under
// it, the match list and every match, just uses the code that was accepted,
// so nobody types it again for the next match.
export default function ScopeGate() {
  const { tenant } = useOutletContext();
  const { divisionId, scopeKey } = useParams();
  const groupId = scopeKey === 'knockout' ? null : scopeKey;
  const key = codeKey(divisionId, scopeKey);

  const [info, setInfo] = useState(null); // null loading, 'missing', or { division, label, title }
  const [code, setCode] = useState(null);
  const [restoring, setRestoring] = useState(true); // quietly trying a code this phone already had
  const [checking, setChecking] = useState(false); // checking a code someone just typed
  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState('');

  async function verify(candidate, silent) {
    setChecking(true);
    setProblem(null);
    const { data, error } = await supabase.rpc('verify_referee_scope', {
      p_division_id: divisionId,
      p_group_id: groupId,
      p_otp: candidate,
    });
    setChecking(false);
    if (error) {
      const d = describeApiError(error);
      setProblem({ error: d.setup ? 'server' : 'network', message: d.message });
      return false;
    }
    if (data && data.ok) {
      writeStored(key, candidate);
      setCode(candidate);
      return true;
    }
    writeStored(key, null);
    if (silent && data && data.error === 'invalid_code') setProblem({ error: 'code_changed' });
    else setProblem(data || { error: 'unknown' });
    return false;
  }

  useEffect(() => {
    let isMounted = true;
    setInfo(null);
    setCode(null);
    setProblem(null);
    setRestoring(true);

    async function start() {
      const [divRes, groupRes] = await Promise.all([
        supabase.from('divisions').select('id, name, category').eq('id', divisionId).maybeSingle(),
        groupId
          ? supabase.from('groups').select('id, name, division_id').eq('id', groupId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!isMounted) return;
      const err = divRes.error || groupRes.error;
      if (err) {
        setLoadError(err.message);
        return;
      }
      if (!divRes.data || (groupId && (!groupRes.data || groupRes.data.division_id !== divisionId))) {
        setInfo('missing');
        setRestoring(false);
        return;
      }
      setInfo({
        division: divRes.data,
        label: groupId ? groupRes.data.name : 'the knockout stage',
        title: groupId ? groupRes.data.name : 'Knockout stage',
      });
      const stored = readStored(key);
      if (stored) await verify(stored, true);
      if (isMounted) setRestoring(false);
    }

    start();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId, scopeKey]);

  function relock(detail) {
    writeStored(key, null);
    setCode(null);
    setProblem(detail || null);
  }

  if (loadError) return <div className="callout-error">{loadError}</div>;
  if (info === null) return <p className="mono muted">Loading…</p>;

  const back = (
    <Link to={`/${tenant.slug}/referee/${divisionId}`} className="back-link mono">
      ← {info === 'missing' ? 'Divisions' : info.division.name}
    </Link>
  );

  if (info === 'missing') {
    return (
      <div>
        {back}
        <p className="page-sub">That group isn't open for scoring.</p>
      </div>
    );
  }

  if (code) {
    return (
      <Outlet
        context={{
          tenant,
          division: info.division,
          scope: { key: scopeKey, groupId, label: info.label, title: info.title },
          code,
          relock,
        }}
      />
    );
  }

  return (
    <div>
      {back}
      <h1 className="page-title">{info.title}</h1>
      {restoring ? (
        <p className="mono muted">Checking code…</p>
      ) : (
        <CodeEntry
          scopeLabel={info.label}
          checking={checking}
          problem={problem}
          onSubmit={(value) => verify(value, false)}
        />
      )}
    </div>
  );
}
