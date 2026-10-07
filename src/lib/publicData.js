// Everything the public pages decide, as plain functions with no screen or
// database in them, so it can be tested on its own.
import { whenLabel } from './format.js';

// ---- knockout rounds -------------------------------------------------------

export function stageSize(stage) {
  if (stage === 'Final') return 2;
  if (stage === 'Semifinal') return 4;
  if (stage === 'Quarterfinal') return 8;
  const m = /^Round of (\d+)$/.exec(stage || '');
  return m ? Number(m[1]) : 0;
}

export function stageShort(stage) {
  if (stage === 'Final') return 'Final';
  if (stage === 'Semifinal') return 'SF';
  if (stage === 'Quarterfinal') return 'QF';
  const m = /^Round of (\d+)$/.exec(stage || '');
  return m ? `R${m[1]}` : stage;
}

// Rounds left to right (biggest round first), each match in bracket order, and
// for a slot still waiting on an earlier match, a label saying which one,
// "Winner SF1", worked out from the pointers the bracket already carries.
export function bracketRounds(knockout) {
  const feeders = new Map();
  knockout.forEach((m) => {
    if (m.advances_to_matchup_id) feeders.set(`${m.advances_to_matchup_id}:${m.advances_to_slot}`, m);
  });
  const slotLabel = (m, slot) => {
    const f = feeders.get(`${m.id}:${slot}`);
    if (!f) return 'TBD';
    const short = stageShort(f.stage);
    // "SF1", "QF2", and for numbered rounds a dash so it doesn't read as one number, "R16-1"
    const sep = /\d$/.test(short) ? '-' : '';
    return `Winner ${short}${sep}${f.bracket_position ?? ''}`;
  };
  const stages = [...new Set(knockout.map((m) => m.stage))].sort((x, y) => stageSize(y) - stageSize(x));
  return stages.map((stage) => ({
    stage,
    matches: knockout
      .filter((m) => m.stage === stage)
      .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
      .map((m) => ({ match: m, placeholderA: slotLabel(m, 'team_a'), placeholderB: slotLabel(m, 'team_b') })),
  }));
}

// ---- one match -------------------------------------------------------------

export function statusOf(match) {
  if (match.status === 'bye') return 'bye';
  if (match.status === 'complete') return 'final';
  if (match.status === 'live') return 'live';
  if (!match.team_a_id || !match.team_b_id) return 'waiting';
  return 'upcoming';
}

// The score to show for a match and who won it. A singles or doubles match has
// one score. A league tie is shown as the points won across its finished
// rubbers (or the admin's override), which is what the standings count.
export function matchResult(match, subs, category) {
  const list = [...(subs || [])].sort((x, y) => (x.slot_number ?? 0) - (y.slot_number ?? 0));

  if (category === 'league') {
    let a = 0;
    let b = 0;
    let done = 0;
    list.forEach((s) => {
      if (!s.done) return;
      done += 1;
      if (s.winner_team_id === match.team_a_id) a += s.points_value || 0;
      else if (s.winner_team_id === match.team_b_id) b += s.points_value || 0;
    });
    const hasOverride = match.team_a_points_override !== null && match.team_a_points_override !== undefined;
    if (hasOverride) {
      a = Number(match.team_a_points_override);
      b = Number(match.team_b_points_override ?? 0);
    }
    const started = hasOverride || done > 0 || list.some((s) => s.team_a_score !== null);
    let winnerId = null;
    if (match.status === 'complete') {
      winnerId = match.winner_team_id_override || (a > b ? match.team_a_id : b > a ? match.team_b_id : null);
    }
    return {
      scoreA: started ? a : null,
      scoreB: started ? b : null,
      winnerId,
      detail: list.length > 0 ? `${done} of ${list.length} rubbers done` : '',
    };
  }

  const s = list[0];
  const has = s && s.team_a_score !== null && s.team_a_score !== undefined;
  return {
    scoreA: has ? s.team_a_score : null,
    scoreB: has ? s.team_b_score : null,
    winnerId: match.status === 'complete' ? match.winner_team_id_override || (s && s.winner_team_id) || null : null,
    detail: '',
  };
}

// What a card on the live board, the home page or a match list needs.
export function buildCard({ match, subs, division, groupName, names }) {
  const result = matchResult(match, subs, division ? division.category : 'singles');
  return {
    id: match.id,
    divisionId: match.division_id,
    divisionName: division ? division.name : '',
    category: division ? division.category : '',
    scope: match.group_id ? groupName || 'Group' : match.stage,
    isKnockout: match.group_id === null,
    court: match.court || '',
    when: whenLabel(match),
    status: statusOf(match),
    teamA: { id: match.team_a_id, name: names[match.team_a_id] || 'TBD' },
    teamB: { id: match.team_b_id, name: names[match.team_b_id] || 'TBD' },
    scoreA: result.scoreA,
    scoreB: result.scoreB,
    winnerId: result.winnerId,
    detail: result.detail,
    scheduledDate: match.scheduled_date || '',
    scheduledTime: match.scheduled_time || '',
    bracketPosition: match.bracket_position ?? 0,
  };
}

// ---- ordering --------------------------------------------------------------

// by date, then time, then court, matches without a schedule last
export function bySchedule(a, b) {
  const key = (v) => (v === null || v === undefined || v === '' ? '\uffff' : String(v));
  return (
    key(a.scheduledDate).localeCompare(key(b.scheduledDate)) ||
    key(a.scheduledTime).localeCompare(key(b.scheduledTime)) ||
    key(a.court).localeCompare(key(b.court)) ||
    a.bracketPosition - b.bracketPosition
  );
}

// ---- standings ----------------------------------------------------------

// One group's table, from the database's own ranking so a table can never
// disagree with who advances: wins, then head to head, then point difference,
// then the team's original seed, then name (a league is points first). The
// Playoff is just another group here.
export function groupStandings(groupId, ranking) {
  return ranking
    .filter((r) => r.scope_group_id === groupId)
    .sort((a, b) => a.rank_position - b.rank_position)
    .map((r) => ({
      teamId: r.team_id,
      name: r.team_name,
      position: Number(r.rank_position),
      played: Number(r.played || 0),
      wins: Number(r.wins || 0),
      losses: Number(r.losses || 0),
      points: Number(r.points || 0),
      pointDiff: Number(r.point_diff || 0),
    }));
}

export function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

// "singles" -> "Singles", for places that show the division's type on its own
export function categoryLabel(category) {
  const c = String(category || '');
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : '';
}
