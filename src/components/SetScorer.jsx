import { useState } from 'react';
import Scorer from './Scorer';
import { setScoresText, setsToWin, tally } from '../lib/gameRules';

// Scores a best-of-3 match one set at a time. The sets already finished are kept at the top, the set in
// play is the Scorer below. The match is over when the server says so ("decided").
export default function SetScorer({
  matchupId,
  code,
  teamA,
  teamB,
  teamAId,
  teamBId,
  rule,
  sets,
  stage,
  onFinished,
  onFatal,
  onActivity,
  onReload,
}) {
  const done = (sets || []).filter((s) => s.done).sort((x, y) => x.set_number - y.set_number);
  const live = (sets || []).find((s) => !s.done);
  const need = setsToWin(rule);
  const t = tally(sets, teamAId, teamBId);
  const [flash, setFlash] = useState('');
  const setNumber = live ? live.set_number : done.length + 1;

  async function handleSetFinished(result) {
    if (result && result.already) {
      onReload();
      return;
    }
    const data = result && result.data;
    if (data && data.decided) {
      onFinished({ a: data.sets_a, b: data.sets_b, data, sets: true });
      return;
    }
    setFlash(`Set ${setNumber} finished ${result.a}-${result.b}. On to set ${setNumber + 1}.`);
    await onReload();
  }

  return (
    <div className="set-scorer">
      <div className="set-tally">
        <div className="set-tally-row">
          <span className="set-tally-name">{teamA}</span>
          <span className="set-tally-num mono">{t.a}</span>
        </div>
        <div className="set-tally-row">
          <span className="set-tally-name">{teamB}</span>
          <span className="set-tally-num mono">{t.b}</span>
        </div>
        <p className="muted small mono">
          {stage ? `${stage} · ` : ''}Best of {rule.best_of} sets, {need} to win
          {done.length > 0 ? ` · sets: ${setScoresText(done)}` : ''}
        </p>
      </div>
      {flash && <div className="callout-ok">{flash}</div>}
      <Scorer
        key={`${matchupId}-set-${setNumber}`}
        matchupId={matchupId}
        code={code}
        subId={null}
        teamA={teamA}
        teamB={teamB}
        initialA={live ? live.team_a_score : null}
        initialB={live ? live.team_b_score : null}
        title={`Set ${setNumber} of ${rule.best_of}`}
        isKnockout
        rule={rule}
        setNumber={setNumber}
        setsNow={{ a: t.a, b: t.b, need }}
        onFinished={handleSetFinished}
        onFatal={onFatal}
        onActivity={onActivity}
      />
    </div>
  );
}
