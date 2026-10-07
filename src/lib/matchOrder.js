import { stageSize } from './publicData.js';

// The order matches are listed in for a referee, so the next one to score is always
// at the top and finished ones sink to the bottom.
//
//   1. being played right now
//   2. ready: scheduled, both teams known
//   3. waiting for the teams to be decided by earlier matches
//   4. finished
//
// In the knockout stage each of those lists follows the rounds: Round of 16, then
// quarterfinals, semifinals, the final. So when the Round of 16 is done the quarterfinals
// lead, with the semifinals and the final after them and the finished Round of 16 at
// the very bottom. Finished matches run the other way, latest round first. Inside a
// round, by court and time, then by place in the bracket.

const LATE = '\uffff';

function listGroup(m) {
  if (m.status === 'live') return 0;
  if (m.status === 'complete') return 3;
  return m.team_a_id && m.team_b_id ? 1 : 2;
}

function bySchedule(a, b) {
  return (
    String(a.scheduled_date || LATE).localeCompare(String(b.scheduled_date || LATE)) ||
    String(a.scheduled_time || LATE).localeCompare(String(b.scheduled_time || LATE)) ||
    String(a.court || LATE).localeCompare(String(b.court || LATE)) ||
    (a.bracket_position ?? 0) - (b.bracket_position ?? 0)
  );
}

export function refereeOrder(matches) {
  return [...matches].sort((a, b) => {
    const ga = listGroup(a);
    const gb = listGroup(b);
    if (ga !== gb) return ga - gb;
    const sa = stageSize(a.stage);
    const sb = stageSize(b.stage);
    if (sa !== sb) {
      // finished knockout rounds: the latest round first. Everything else: earliest round first.
      return ga === 3 ? sa - sb : sb - sa;
    }
    return bySchedule(a, b);
  });
}
