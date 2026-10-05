// What this phone remembers, for the length of the browser tab only.
// A group's code, once accepted, so the next match in that group opens
// straight to scoring. And a note that this phone is the one scoring a
// match, so it isn't warned about its own scores.
export function readStored(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key, value) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* private browsing: it just isn't remembered */
  }
}

export const codeKey = (divisionId, scopeKey) => `scorack-code:${divisionId}:${scopeKey}`;
export const mineKey = (matchupId) => `scorack-mine:${matchupId}`;
