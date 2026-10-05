// What an address opens, decided by the address the page was reached on.
//
//   the bare domain (scoreit.today, www.scoreit.today)  the landing page, at /
//   ref.<domain>/<slug>      goes straight to referee scoring
//   display.<domain>/<slug>  goes straight to the TV board
//   anything else            the spectator page (live.<domain>, or any other address)
//
// At / (no venue) every address except the bare domain shows the find-a-tournament page.
//
// Only a venue's front address and the front page change. Every other page keeps its path,
// so any link, bookmark or printed sheet from before still opens what it always did.

// The bare domain: set VITE_LANDING_HOSTS (comma separated, exact names) to say which
// addresses are landing addresses, or leave it empty and it is any address with just two
// parts (scoreit.today) or that with www in front. localhost, *.localhost, *.vercel.app and
// IP addresses are never one.
export function isLandingHost(hostname, configured) {
  const h = String(hostname || '').toLowerCase();
  const list = String(configured || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (list.length > 0) return list.includes(h);
  const labels = h.split('.');
  if (labels.some((l) => l === '')) return false;
  if (h.endsWith('.localhost') || /^\d+(\.\d+)*$/.test(h)) return false;
  if (labels.length === 2) return true;
  return labels.length === 3 && labels[0] === 'www';
}

export function hostModeOf(hostname, configuredLandingHosts) {
  const first = String(hostname || '').toLowerCase().split('.')[0];
  if (first === 'ref') return 'referee';
  if (first === 'display') return 'tv';
  if (isLandingHost(hostname, configuredLandingHosts)) return 'landing';
  return 'public';
}

export function currentHostMode() {
  if (typeof window === 'undefined') return 'public';
  return hostModeOf(window.location.hostname, import.meta.env.VITE_LANDING_HOSTS);
}
