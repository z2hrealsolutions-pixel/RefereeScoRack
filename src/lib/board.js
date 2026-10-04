import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { buildCard, bySchedule } from './publicData';
import { usePolling } from './usePolling';

const MATCH_COLS =
  'id, division_id, group_id, stage, status, team_a_id, team_b_id, team_a_points_override, team_b_points_override, winner_team_id_override, court, scheduled_date, scheduled_time, bracket_position, advances_to_matchup_id, advances_to_slot';
const SUB_COLS =
  'id, matchup_id, match_type, slot_number, points_value, team_a_score, team_b_score, winner_team_id, done, last_modified_at';

// ids go in the address of the request, so ask for them in batches
async function inChunks(table, cols, column, ids, size = 80) {
  const unique = [...new Set(ids.filter(Boolean))];
  const rows = [];
  for (let i = 0; i < unique.length; i += size) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .in(column, unique.slice(i, i + size));
    if (error) return { error };
    rows.push(...data);
  }
  return { data: rows };
}

function groupBy(list, key) {
  const map = {};
  list.forEach((row) => {
    (map[row[key]] ??= []).push(row);
  });
  return map;
}

// What is happening across a whole tournament right now: matches being played,
// the next ones due, and the latest results. Only a handful of rows, so it is
// cheap to ask for every few seconds.
export async function loadBoard(tenantId, { upcomingLimit = 8, recentLimit = 8 } = {}) {
  const [liveRes, upRes, recentRes, divRes] = await Promise.all([
    supabase.from('matchups').select(MATCH_COLS).eq('tenant_id', tenantId).eq('status', 'live'),
    supabase
      .from('matchups')
      .select(MATCH_COLS)
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .not('team_a_id', 'is', null)
      .not('team_b_id', 'is', null)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .limit(upcomingLimit),
    supabase
      .from('sub_matches')
      .select('matchup_id, last_modified_at')
      .eq('tenant_id', tenantId)
      .eq('done', true)
      .order('last_modified_at', { ascending: false })
      .limit(60),
    supabase.from('divisions').select('id, name, category, status, age_label, gender_label').eq('tenant_id', tenantId),
  ]);
  const err = liveRes.error || upRes.error || recentRes.error || divRes.error;
  if (err) return { error: err.message };

  const lastModified = new Map();
  recentRes.data.forEach((s) => {
    if (!lastModified.has(s.matchup_id)) lastModified.set(s.matchup_id, s.last_modified_at);
  });
  const recentRows = await inChunks('matchups', MATCH_COLS, 'id', [...lastModified.keys()]);
  if (recentRows.error) return { error: recentRows.error.message };
  const recent = recentRows.data
    .filter((m) => m.status === 'complete')
    .sort((a, b) => String(lastModified.get(b.id)).localeCompare(String(lastModified.get(a.id))))
    .slice(0, recentLimit);

  const everything = [...liveRes.data, ...upRes.data, ...recent];
  const [subsRes, teamsRes, groupsRes] = await Promise.all([
    inChunks('sub_matches', SUB_COLS, 'matchup_id', everything.map((m) => m.id)),
    inChunks('teams', 'id, name', 'id', everything.flatMap((m) => [m.team_a_id, m.team_b_id])),
    inChunks('groups', 'id, name', 'id', everything.map((m) => m.group_id)),
  ]);
  const err2 = subsRes.error || teamsRes.error || groupsRes.error;
  if (err2) return { error: err2.message };

  const divisions = Object.fromEntries(divRes.data.map((d) => [d.id, d]));
  const names = Object.fromEntries(teamsRes.data.map((t) => [t.id, t.name]));
  const groupNames = Object.fromEntries(groupsRes.data.map((g) => [g.id, g.name]));
  const subs = groupBy(subsRes.data, 'matchup_id');
  const card = (m) =>
    buildCard({
      match: m,
      subs: subs[m.id] || [],
      division: divisions[m.division_id],
      groupName: groupNames[m.group_id],
      names,
    });

  return {
    live: liveRes.data.map(card).sort(bySchedule),
    upcoming: upRes.data.map(card).sort(bySchedule),
    recent: recent.map(card),
    divisions: divRes.data,
  };
}

// One division in full, for its Standings, Matches and Bracket tabs.
export async function loadDivision(divisionId) {
  const [divRes, groupsRes, teamsRes, matchRes, standRes] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, category, format_type, status, age_label, gender_label')
      .eq('id', divisionId)
      .maybeSingle(),
    supabase.from('groups').select('id, name, is_playoff').eq('division_id', divisionId).order('name'),
    supabase.from('teams').select('id, name, group_id').eq('division_id', divisionId),
    supabase.from('matchups').select(MATCH_COLS).eq('division_id', divisionId),
    supabase.rpc('public_division_ranking', { p_division_id: divisionId }),
  ]);
  const err = divRes.error || groupsRes.error || teamsRes.error || matchRes.error || standRes.error;
  if (err) return { error: err.message };
  if (!divRes.data) return { notFound: true };

  const subsRes = await inChunks('sub_matches', SUB_COLS, 'matchup_id', matchRes.data.map((m) => m.id));
  if (subsRes.error) return { error: subsRes.error.message };

  return {
    division: divRes.data,
    groups: groupsRes.data,
    teams: teamsRes.data,
    matchups: matchRes.data,
    subsByMatch: groupBy(subsRes.data, 'matchup_id'),
    ranking: standRes.data,
  };
}

// the board, kept fresh
export function useBoard(tenantId, options, pollMs) {
  const [state, setState] = useState({ loaded: false, error: '', data: null, updatedAt: null });
  usePolling(async (isActive) => {
    const result = await loadBoard(tenantId, options);
    if (!isActive()) return;
    if (result.error) setState((s) => ({ ...s, loaded: true, error: result.error }));
    else setState({ loaded: true, error: '', data: result, updatedAt: Date.now() });
  }, pollMs);
  return state;
}

export const clockTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
