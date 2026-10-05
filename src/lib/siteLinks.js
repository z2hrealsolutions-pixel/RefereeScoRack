// The addresses the landing page links to. They are worked out from the address the landing
// page is open on, so nothing about the domain is written into the code:
// on scoreit.today (or www.scoreit.today) they are live.scoreit.today and rent.scoreit.today.
// An address that is not a bare domain gets none, and the links are left out.
export function bareDomain(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h.startsWith('www.') ? h.slice(4) : h;
}

export function siteLinksOf(hostname, { live, rent } = {}) {
  const clean = (v) => String(v || '').trim().replace(/\/+$/, '');
  const withScheme = (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);
  const base = bareDomain(hostname);
  const derivable = base.includes('.') && !base.endsWith('.localhost') && !base.endsWith('.vercel.app') && !/^\d+(\.\d+)*$/.test(base);
  return {
    live: withScheme(clean(live)) || (derivable ? `https://live.${base}` : ''),
    rent: withScheme(clean(rent)) || (derivable ? `https://rent.${base}` : ''),
  };
}

// The bare domain, from any of the venue addresses, to say "new to ScoreIt?" on the find page:
// live.scoreit.today, ref.scoreit.today and display.scoreit.today all lead back to scoreit.today.
export function landingUrlOf(hostname) {
  const labels = String(hostname || '').toLowerCase().split('.');
  if (labels.length === 3 && ['live', 'ref', 'display', 'www'].includes(labels[0])) return `https://${labels.slice(1).join('.')}`;
  return '';
}

export function currentSiteLinks() {
  return siteLinksOf(window.location.hostname, { live: import.meta.env.VITE_LIVE_URL, rent: import.meta.env.VITE_RENT_URL });
}
