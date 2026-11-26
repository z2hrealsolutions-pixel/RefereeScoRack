import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Outlet, useMatch, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import TenantLogo from './TenantLogo';
import { brandCss } from '../lib/brandTheme';
import { loadTenantBrand } from '../lib/tenantBrand';

export default function TenantGate() {
  const { slug } = useParams();
  const isTv = useMatch('/:slug/tv');
  const isDivision = useMatch('/:slug/division/:divisionId');
  const isHome = useMatch({ path: '/:slug', end: true });
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
        if (!data) {
          setTenant(data);
          return;
        }
        // the tenant's brand kit comes with it, so the page never shows the ScoreIt colours first
        loadTenantBrand(data.id).then((brand) => {
          if (isMounted) setTenant({ ...data, brand });
        });
      });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // the tenant's two colours, on the whole page while this tenant is open. Gone again when it is left.
  const brandColours = tenant && tenant.brand ? { primary: tenant.brand.primary, accent: tenant.brand.accent } : null;
  useLayoutEffect(() => {
    const css = brandColours ? brandCss(brandColours) : '';
    if (!css) return undefined;
    const el = document.createElement('style');
    el.id = 'tenant-brand-style';
    el.textContent = css;
    document.head.appendChild(el);
    return () => el.remove();
  }, [brandColours && brandColours.primary, brandColours && brandColours.accent]);

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
        <div className="brand-row">
          <Brand />
        </div>
        <h1 className="page-title">We couldn't find that tournament</h1>
        <p className="page-sub">
          Check the address you were given. If it looks right, the tournament may not be open right
          now.
        </p>
      </div>
    );
  }

  // the TV board has no page chrome, it fills the screen
  if (isTv) return <Outlet context={{ tenant }} />;

  return (
    <div className="app-shell" data-branded={brandColours && brandColours.accent ? 'true' : undefined}>
      <header className="topbar">
        <Link to={`/${tenant.slug}`} className="topbar-name">
          <TenantLogo src={tenant.brand && tenant.brand.logoUrl} name={tenant.name} />
          <span className="topbar-name-text">{tenant.name}</span>
        </Link>
        <div className="topbar-right">
          <Brand />
          <ThemeToggle />
        </div>
      </header>
      <main className={isDivision ? 'page page-wide' : isHome ? 'page page-wide page-home' : 'page'}>
        <Outlet context={{ tenant }} />
      </main>
    </div>
  );
}
