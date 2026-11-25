// What it takes to finish a game or a set. Mirrors score_ends_game in the database, which is the real check:
// this only decides whether the Finish button is ready and what the hint says.
// rule: { target, win_by, best_of, sets_to_win } as match_format returns it.

export function scoreEnds(a, b, rule) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  if (a === b) return false;
  const target = rule && rule.target;
  if (!target) return true;
  const winBy = (rule && rule.win_by) || 1;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return hi >= target && hi - lo >= winBy;
}

export function ruleText(rule) {
  if (!rule || !rule.target) return '';
  const winBy = rule.win_by || 1;
  return winBy > 1
    ? `First to ${rule.target}, and you must win by ${winBy}.`
    : `First to ${rule.target}.`;
}

// 'Best of 3 sets' etc, empty for a single game
export function formatText(rule) {
  if (!rule || !rule.best_of || rule.best_of <= 1) return '';
  return `Best of ${rule.best_of} sets`;
}

export function isSetMatch(rule) {
  return Boolean(rule && rule.best_of && rule.best_of > 1);
}

// who has won how many sets, from the finished sets of a match (rows of match_sets)
export function tally(sets, teamAId, teamBId) {
  let a = 0;
  let b = 0;
  (sets || []).forEach((s) => {
    if (!s.done) return;
    if (s.winner_team_id === teamAId) a += 1;
    else if (s.winner_team_id === teamBId) b += 1;
  });
  return { a, b };
}

export function setsToWin(rule) {
  return (rule && rule.sets_to_win) || (rule && rule.best_of ? Math.floor(rule.best_of / 2) + 1 : 1);
}

// "11-7 9-11 11-8"
export function setScoresText(sets) {
  return (sets || [])
    .filter((s) => s.done)
    .sort((x, y) => x.set_number - y.set_number)
    .map((s) => `${s.team_a_score}-${s.team_b_score}`)
    .join('  ');
}
