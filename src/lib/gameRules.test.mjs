import assert from 'node:assert/strict';
import { scoreEnds, ruleText, formatText, isSetMatch, tally, setsToWin, setScoresText } from './gameRules.js';

const r11 = { target: 11, win_by: 2, best_of: 1 };
assert.equal(scoreEnds(11, 9, r11), true);
assert.equal(scoreEnds(11, 10, r11), false, '11-10 is not over');
assert.equal(scoreEnds(12, 10, r11), true, 'extends past the target');
assert.equal(scoreEnds(10, 12, r11), true);
assert.equal(scoreEnds(14, 13, r11), false);
assert.equal(scoreEnds(15, 13, r11), true, 'no cap');
assert.equal(scoreEnds(21, 19, r11), true);
assert.equal(scoreEnds(10, 8, r11), false, 'target not reached');
assert.equal(scoreEnds(11, 11, r11), false);
assert.equal(scoreEnds(5, 3, { target: null }), true);
assert.equal(scoreEnds(3, 3, null), false);
assert.equal(scoreEnds(11, 10, { target: 11, win_by: 1 }), true);
assert.equal(scoreEnds(-1, 3, r11), false);
assert.equal(scoreEnds(11.5, 3, r11), false);

assert.equal(ruleText(r11), 'First to 11, and you must win by 2.');
assert.equal(ruleText({ target: 15, win_by: 1 }), 'First to 15.');
assert.equal(ruleText(null), '');
assert.equal(formatText({ best_of: 3 }), 'Best of 3 sets');
assert.equal(formatText({ best_of: 1 }), '');
assert.equal(isSetMatch({ best_of: 3 }), true);
assert.equal(isSetMatch(null), false);
assert.equal(setsToWin({ best_of: 3 }), 2);
assert.equal(setsToWin({ best_of: 5 }), 3);
assert.equal(setsToWin({ best_of: 3, sets_to_win: 2 }), 2);

const sets = [
  { set_number: 2, done: true, team_a_score: 9, team_b_score: 11, winner_team_id: 'b' },
  { set_number: 1, done: true, team_a_score: 11, team_b_score: 7, winner_team_id: 'a' },
  { set_number: 3, done: false, team_a_score: 4, team_b_score: 2, winner_team_id: null },
];
assert.deepEqual(tally(sets, 'a', 'b'), { a: 1, b: 1 });
assert.equal(setScoresText(sets), '11-7  9-11');
console.log('gameRules ok');
