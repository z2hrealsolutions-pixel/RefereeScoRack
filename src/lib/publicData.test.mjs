import {
  stageSize, stageShort, bracketRounds, statusOf, matchResult, buildCard, bySchedule, groupStandings, signed, categoryLabel,
} from './publicData.js';

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// stages
check('round sizes', stageSize('Final') === 2 && stageSize('Semifinal') === 4 && stageSize('Quarterfinal') === 8 && stageSize('Round of 16') === 16 && stageSize('Round of 32') === 32 && stageSize('group') === 0);
check('short labels', stageShort('Quarterfinal') === 'QF' && stageShort('Semifinal') === 'SF' && stageShort('Round of 16') === 'R16' && stageShort('Final') === 'Final');

// bracket rounds
{
  const ko = [
    { id: 'f', stage: 'Final', bracket_position: 1, team_a_id: null, team_b_id: null },
    { id: 's2', stage: 'Semifinal', bracket_position: 2, advances_to_matchup_id: 'f', advances_to_slot: 'team_b' },
    { id: 's1', stage: 'Semifinal', bracket_position: 1, advances_to_matchup_id: 'f', advances_to_slot: 'team_a' },
    { id: 'q4', stage: 'Quarterfinal', bracket_position: 4, advances_to_matchup_id: 's2', advances_to_slot: 'team_b' },
    { id: 'q3', stage: 'Quarterfinal', bracket_position: 3, advances_to_matchup_id: 's2', advances_to_slot: 'team_a' },
    { id: 'q2', stage: 'Quarterfinal', bracket_position: 2, advances_to_matchup_id: 's1', advances_to_slot: 'team_b' },
    { id: 'q1', stage: 'Quarterfinal', bracket_position: 1, advances_to_matchup_id: 's1', advances_to_slot: 'team_a' },
  ];
  const rounds = bracketRounds(ko);
  check('rounds run biggest first, matches in bracket order', eq(rounds.map((r) => r.stage), ['Quarterfinal', 'Semifinal', 'Final']) && eq(rounds[0].matches.map((x) => x.match.id), ['q1', 'q2', 'q3', 'q4']));
  check('a waiting slot says which match feeds it', rounds[1].matches[0].placeholderA === 'Winner QF1' && rounds[1].matches[0].placeholderB === 'Winner QF2' && rounds[1].matches[1].placeholderA === 'Winner QF3');
  check('the final names the semifinals', rounds[2].matches[0].placeholderA === 'Winner SF1' && rounds[2].matches[0].placeholderB === 'Winner SF2');
  check('first round slots with no feeder read TBD', rounds[0].matches[0].placeholderA === 'TBD');
  const big = bracketRounds([{ id: 'a', stage: 'Round of 16', bracket_position: 1 }, { id: 'b', stage: 'Quarterfinal', bracket_position: 1 }, { id: 'c', stage: 'Round of 32', bracket_position: 1 }]);
  check('Round of 32 comes before Round of 16 before Quarterfinal', eq(big.map((r) => r.stage), ['Round of 32', 'Round of 16', 'Quarterfinal']));
}

// status
check('status of a match', statusOf({ status: 'bye' }) === 'bye' && statusOf({ status: 'complete' }) === 'final' && statusOf({ status: 'live' }) === 'live'
  && statusOf({ status: 'scheduled', team_a_id: 'a', team_b_id: null }) === 'waiting' && statusOf({ status: 'scheduled', team_a_id: 'a', team_b_id: 'b' }) === 'upcoming');

// results: singles
{
  const m = { id: 'm', team_a_id: 'A', team_b_id: 'B', status: 'complete' };
  const r = matchResult(m, [{ slot_number: 1, team_a_score: 11, team_b_score: 7, winner_team_id: 'A', done: true }], 'singles');
  check('a finished singles match shows its score and winner', r.scoreA === 11 && r.scoreB === 7 && r.winnerId === 'A');
  const live = matchResult({ ...m, status: 'live' }, [{ slot_number: 1, team_a_score: 4, team_b_score: 3, winner_team_id: null, done: false }], 'doubles');
  check('a live match shows the running score and no winner', live.scoreA === 4 && live.scoreB === 3 && live.winnerId === null);
  const none = matchResult({ ...m, status: 'scheduled' }, [], 'singles');
  check('an unplayed match has no score', none.scoreA === null && none.scoreB === null && none.winnerId === null);
  const ko = matchResult({ ...m, winner_team_id_override: 'B' }, [{ slot_number: 1, team_a_score: 3, team_b_score: 11, winner_team_id: 'B', done: true }], 'singles');
  check('a knockout winner override is honoured', ko.winnerId === 'B');
}
// results: league
{
  const m = { id: 'm', team_a_id: 'A', team_b_id: 'B', status: 'live' };
  const subs = [
    { slot_number: 1, points_value: 2, team_a_score: 11, team_b_score: 5, winner_team_id: 'A', done: true },
    { slot_number: 2, points_value: 3, team_a_score: 7, team_b_score: 11, winner_team_id: 'B', done: true },
    { slot_number: 3, points_value: 1, team_a_score: 3, team_b_score: 2, winner_team_id: null, done: false },
  ];
  const r = matchResult(m, subs, 'league');
  check('a league tie shows points from finished rubbers only', r.scoreA === 2 && r.scoreB === 3 && r.detail === '2 of 3 rubbers done' && r.winnerId === null);
  const done = matchResult({ ...m, status: 'complete' }, subs, 'league');
  check('a finished league tie is won by whoever has more points', done.winnerId === 'B');
  const tie = matchResult({ ...m, status: 'complete' }, [subs[0], { ...subs[1], points_value: 2 }], 'league');
  check('a level finished league tie has no winner', tie.winnerId === null && tie.scoreA === 2 && tie.scoreB === 2);
  const over = matchResult({ ...m, status: 'complete', team_a_points_override: 5, team_b_points_override: 4 }, subs, 'league');
  check('an admin points override replaces the rubber total', over.scoreA === 5 && over.scoreB === 4 && over.winnerId === 'A');
  const fresh = matchResult({ ...m, status: 'scheduled' }, [{ slot_number: 1, points_value: 2, team_a_score: null, team_b_score: null, done: false }], 'league');
  check('a league tie nobody has scored shows no score', fresh.scoreA === null && fresh.detail === '0 of 1 rubbers done');
}

// card
{
  const card = buildCard({
    match: { id: 'm', division_id: 'd', group_id: 'g', stage: 'group', status: 'live', team_a_id: 'A', team_b_id: 'B', court: 'Court 2', scheduled_time: '09:30' },
    subs: [{ slot_number: 1, team_a_score: 2, team_b_score: 1, done: false }],
    division: { name: 'Mens Singles', category: 'singles' }, groupName: 'Group A', names: { A: 'Ann', B: 'Ben' },
  });
  check('a card carries what the screens need', card.divisionName === 'Mens Singles' && card.scope === 'Group A' && card.court === 'Court 2' && card.teamA.name === 'Ann' && card.scoreA === 2 && card.status === 'live' && card.when.includes('09:30'));
  const ko = buildCard({ match: { id: 'k', division_id: 'd', group_id: null, stage: 'Semifinal', status: 'scheduled', team_a_id: null, team_b_id: null }, subs: [], division: { name: 'X', category: 'singles' }, groupName: '', names: {} });
  check('a knockout card is labelled by its round, unknown teams read TBD', ko.scope === 'Semifinal' && ko.isKnockout && ko.teamA.name === 'TBD' && ko.status === 'waiting');
}

// ordering
{
  const list = [
    { scheduledDate: '', scheduledTime: '', court: '', bracketPosition: 0, n: 'unscheduled' },
    { scheduledDate: '2026-10-03', scheduledTime: '10:00', court: 'Court 1', bracketPosition: 0, n: 'ten' },
    { scheduledDate: '2026-10-03', scheduledTime: '09:00', court: 'Court 2', bracketPosition: 0, n: 'nine-c2' },
    { scheduledDate: '2026-10-03', scheduledTime: '09:00', court: 'Court 1', bracketPosition: 0, n: 'nine-c1' },
  ];
  check('matches sort by date, time, court, unscheduled last', eq([...list].sort(bySchedule).map((x) => x.n), ['nine-c1', 'nine-c2', 'ten', 'unscheduled']));
}

// standings, now straight from the database's ranking
{
  const row = (g, id, name, pos, p, w, l, pts, pd) => ({ scope_group_id: g, team_id: id, team_name: name, rank_position: pos, played: p, wins: w, losses: l, points: pts, point_diff: pd });
  const ranking = [
    row('B', '4', 'Cat', 1, 1, 1, 0, 3, 11),
    row('A', '3', 'Bob', 3, 2, 0, 2, 0, -5),
    row('A', '1', 'Zed', 1, 2, 2, 0, 6, 9),
    row('A', '2', 'Amy', 2, 2, 1, 1, 3, -4),
    row('P', '2', 'Amy', 1, 1, 1, 0, 3, 7),
  ];
  const a = groupStandings('A', ranking);
  check('a group table is in the database\'s order, whatever order the rows arrive in', a.map((r) => r.name).join(' ') === 'Zed Amy Bob' && a.map((r) => r.position).join('') === '123');
  check('the order is not re-sorted by name or points, the ranking decides', groupStandings('A', [row('A', '1', 'Zed', 2, 1, 1, 0, 3, 1), row('A', '2', 'Amy', 1, 1, 1, 0, 3, 5)]).map((r) => r.name).join(' ') === 'Amy Zed');
  check('wins, losses, point difference and points come through as numbers', a[1].wins === 1 && a[1].losses === 1 && a[1].pointDiff === -4 && a[1].points === 3 && typeof a[0].pointDiff === 'number');
  check('another group is not mixed in', groupStandings('B', ranking).length === 1);
  check('the Playoff is just another group, and a team can be in two tables', groupStandings('P', ranking).map((r) => r.name).join(' ') === 'Amy' && a.some((r) => r.name === 'Amy'));
  check('a group with no rows is an empty table', groupStandings('Z', ranking).length === 0);
  check('point difference is shown with its sign', signed(4) === '+4' && signed(-2) === '-2' && signed(0) === '0');
}

// Round of 16 placeholders
{
  const ko = [
    { id: 'f', stage: 'Final', bracket_position: 1 },
    { id: 's1', stage: 'Semifinal', bracket_position: 1, advances_to_matchup_id: 'f', advances_to_slot: 'team_a' },
    { id: 'q1', stage: 'Quarterfinal', bracket_position: 1, advances_to_matchup_id: 's1', advances_to_slot: 'team_a' },
    { id: 'r1', stage: 'Round of 16', bracket_position: 1, advances_to_matchup_id: 'q1', advances_to_slot: 'team_a' },
    { id: 'r2', stage: 'Round of 16', bracket_position: 2, advances_to_matchup_id: 'q1', advances_to_slot: 'team_b' },
  ];
  const rounds = bracketRounds(ko);
  const qf = rounds.find((r) => r.stage === 'Quarterfinal').matches[0];
  check('a quarterfinal slot fed by a Round of 16 match reads "Winner R16-1", not "R161"', qf.placeholderA === 'Winner R16-1' && qf.placeholderB === 'Winner R16-2');
  check('Round of 16 comes before the quarterfinals', rounds.map((r) => r.stage).join(',') === 'Round of 16,Quarterfinal,Semifinal,Final');
  check('SF and QF labels are unchanged', rounds.find((r) => r.stage === 'Semifinal').matches[0].placeholderA === 'Winner QF1' && rounds.find((r) => r.stage === 'Final').matches[0].placeholderA === 'Winner SF1');
}

// the TV results table needs the division's type on each card
{
  const base = { id: 'x', division_id: 'd', group_id: null, stage: 'Final', status: 'complete', team_a_id: 'a', team_b_id: 'b' };
  const sub = [{ match_type: 'singles', slot_number: 1, team_a_score: 11, team_b_score: 7, winner_team_id: 'a', points_value: 1, done: true }];
  const names = { a: 'Ann', b: 'Ben' };
  const doubles = buildCard({ match: base, subs: sub, division: { name: 'Mixed', category: 'doubles' }, groupName: null, names });
  check('a result card carries the division type, and who won', doubles.category === 'doubles' && doubles.winnerId === 'a' && doubles.scoreA === 11 && doubles.scoreB === 7);
  check('a card with no division has an empty type and does not crash', buildCard({ match: base, subs: sub, division: undefined, groupName: null, names }).category === '');
  check('the type reads Singles, Doubles, League', categoryLabel('singles') === 'Singles' && categoryLabel('doubles') === 'Doubles' && categoryLabel('league') === 'League' && categoryLabel('') === '' && categoryLabel(null) === '');
  const grp = buildCard({ match: { ...base, group_id: 'g', stage: 'group' }, subs: sub, division: { name: 'M', category: 'singles' }, groupName: 'Group B', names });
  const ko = buildCard({ match: { ...base, stage: 'Round of 16' }, subs: sub, division: { name: 'M', category: 'singles' }, groupName: null, names });
  check('the stage column reads the group\'s name, or the knockout round', grp.scope === 'Group B' && ko.scope === 'Round of 16');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
