// What is typed into the search box, made safe to search with: no wildcard characters, no
// stray spaces, not too long. Searching for nothing useful finds nothing.
export function cleanQuery(q) {
  return String(q ?? '')
    .replace(/[%_\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export const MIN_QUERY = 2;

export function searchable(q) {
  return cleanQuery(q).length >= MIN_QUERY;
}
