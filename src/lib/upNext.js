import { stageSize } from './publicData.js';

// "Up next" only means something once the knockout stage is under way. It does not
// appear while a division is still playing its groups, nor its playoff, and then it lists
// knockout matches only.
//
// knockoutMatches: every knockout match of the venue, any status.
// openDivisionIds: divisions that still have a group or playoff match to finish.
// A division is in its knockout stage when it has knockout matches and nothing is
// left to finish in its groups or playoff. A knockout-only division has no groups, so it
// is in its knockout stage as soon as it has a bracket. The section is shown while some
// division in its knockout stage still has a knockout match to play, so a finished
// tournament, or a division that finished long ago, does not bring back an empty
// "Up next" while another division is still playing its groups.
export function knockoutUpNext(knockoutMatches, openDivisionIds) {
  const open = new Set(openDivisionIds);
  const inKnockout = new Set(knockoutMatches.filter((m) => !open.has(m.division_id)).map((m) => m.division_id));
  const upcoming = knockoutMatches.filter(
    (m) => inKnockout.has(m.division_id) && m.status === 'scheduled' && m.team_a_id && m.team_b_id
  );
  const stillPlaying = knockoutMatches.some(
    (m) => inKnockout.has(m.division_id) && (m.status === 'scheduled' || m.status === 'live')
  );
  return { started: stillPlaying, upcoming };
}

// by court and time first, then the earlier round before the later one, then bracket order
export function upNextOrder(cards) {
  const late = '\uffff';
  return [...cards].sort(
    (a, b) =>
      String(a.scheduledDate || late).localeCompare(String(b.scheduledDate || late)) ||
      String(a.scheduledTime || late).localeCompare(String(b.scheduledTime || late)) ||
      String(a.court || late).localeCompare(String(b.court || late)) ||
      stageSize(b.scope) - stageSize(a.scope) ||
      a.bracketPosition - b.bracketPosition
  );
}
