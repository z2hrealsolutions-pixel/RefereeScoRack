import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function TenantGate() {
  const { slug } = useParams();
  const [tenant, setTenant] = useState(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setTenant(undefined);
    supabase
      .from('tenants')
      .select('id, slug, name, sport')
      .eq('slug', slug.toLowerCase())
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setTenant(data);
      });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loadError) {
    return (
      <div className="page">
        <div className="callout-error">Couldn't reach the server: {loadError}</div>
      </div>
    );
  }

  if (tenant === undefined) {
    return <div className="boot-screen mono">Loading…</div>;
  }

  if (tenant === null) {
    return (
      <div className="page">
        <p className="mono brand">SCORACK</p>
        <h1 className="page-title">We couldn't find that tournament</h1>
        <p className="page-sub">
          Check the address you were given. If it looks right, the tournament may not be open right
          now.
        </p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to={`/${tenant.slug}`} className="topbar-name">
          {tenant.name}
        </Link>
        <span className="topbar-brand mono">SCORACK</span>
      </header>
      <main className="page">
        <Outlet context={{ tenant }} />
      </main>
    </div>
  );
}
