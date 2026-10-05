export default function MatchCard({ card, showDivision = true }) {
  const meta = [showDivision ? card.divisionName : '', card.scope, card.when].filter(Boolean).join(' · ');
  const side = (team, score) => (
    <div className={`pm-side ${card.winnerId && card.winnerId === team.id ? 'pm-win' : ''}`}>
      <span className="pm-name">{team.name}</span>
      <span className="pm-score mono">{score === null || score === undefined ? '' : score}</span>
    </div>
  );
  return (
    <div className={`pm-card pm-${card.status}`} data-status={card.status}>
      <div className="pm-head">
        <span className="pm-meta mono">{meta || 'No court set yet'}</span>
        {card.status === 'live' && <span className="pm-tag pm-tag-live mono">LIVE</span>}
        {card.status === 'final' && <span className="pm-tag mono">FINAL</span>}
      </div>
      {side(card.teamA, card.scoreA)}
      {side(card.teamB, card.scoreB)}
      {card.detail && <div className="pm-detail mono">{card.detail}</div>}
    </div>
  );
}
