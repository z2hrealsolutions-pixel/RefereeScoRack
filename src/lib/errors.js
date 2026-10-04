// Tells a broken setup (the database is missing a function, a column or
// a permission) from a bad connection. The first can't be fixed by
// retrying or by moving to better signal, it needs an admin. The second
// is exactly what retrying is for.
//
// PostgREST reports setup problems as PGRST20x (function, table or
// column not found in its schema cache) and Postgres as 42xxx (undefined
// function, column or table, missing permission). Anything else, a
// failed fetch or a timeout, is treated as a connection problem.
export function describeApiError(error) {
  const code = (error && error.code) || '';
  const setup = /^PGRST20[0-9]$/.test(code) || /^42[0-9A-Z]{3}$/.test(code);
  return { setup, message: (error && error.message) || 'Unknown error' };
}
