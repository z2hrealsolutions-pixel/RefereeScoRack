// What a venue's front address opens, decided by the address the page was reached on:
//
//   ref.<domain>/<slug>     goes straight to referee scoring
//   display.<domain>/<slug>  goes straight to the TV board
//   anything else            the spectator page (live.<domain>, or the plain address)
//
// Only the front address of a venue changes. Every other page keeps its path, so any
// link, bookmark or printed sheet from before still opens what it always did.
export function hostModeOf(hostname) {
  const first = String(hostname || '').toLowerCase().split('.')[0];
  if (first === 'ref') return 'referee';
  if (first === 'display') return 'tv';
  return 'public';
}

export function currentHostMode() {
  return hostModeOf(typeof window === 'undefined' ? '' : window.location.hostname);
}
