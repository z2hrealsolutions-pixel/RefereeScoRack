import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { clockTime, useBoard } from '../lib/board';
import { TV_POLL_MS } from '../lib/config';

function Score({ value }) {
  return <span className="tv-score mono">{value === null || value === undefined ? '' : value}</span>;
}

function Court({ card }) {
  return (
    <div className="tv-court">
      <div className="tv-court-head">
        <span className="tv-court-name">{card.court || 'Court'}</span>
        <span className="tv-court-meta mono">{[card.divisionName, card.scope].filter(Boolean).join(' · ')}</span>
      </div>
      <div className={`tv-team ${card.winnerId && card.winnerId === card.teamA.id ? 'tv-win' : ''}`}>
        <span className="tv-name">{card.teamA.name}</span>
        <Score value={card.scoreA} />
      </div>
      <div className={`tv-team ${card.winnerId && card.winnerId === card.teamB.id ? 'tv-win' : ''}`}>
        <span className="tv-name">{card.teamB.name}</span>
        <Score value={card.scoreB} />
      </div>
      {card.detail && <div className="tv-detail mono">{card.detail}</div>}
    </div>
  );
}

export default function TvBoard() {
  const { tenant } = useOutletContext();
  const { loaded, error, data, updatedAt } = useBoard(tenant.id, { upcomingLimit: 8, recentLimit: 8 }, TV_POLL_MS);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const live = data ? data.live : [];

  return (
    <div className="tv">
      <header className="tv-header">
        <h1 className="tv-title">{tenant.name}</h1>
        <span className="tv-clock mono">
          {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </header>

      <section className="tv-live">
        <h2 className="tv-h mono">ON COURT NOW</h2>
        {!loaded ? (
          <p className="tv-empty">Loading…</p>
        ) : live.length === 0 ? (
          <p className="tv-empty">No matches on court right now</p>
        ) : (
          <div className="tv-courts">
            {live.map((c) => (
              <Court key={c.id} card={c} />
            ))}
          </div>
        )}
      </section>

      <div className="tv-lower">
        <section>
          <h2 className="tv-h mono">UP NEXT</h2>
          {data && data.upcoming.length > 0 ? (
            <ul className="tv-list">
              {data.upcoming.map((c) => (
                <li key={c.id} className="tv-row">
                  <span className="tv-row-when mono">{[c.scheduledTime, c.court].filter(Boolean).join(' · ') || '—'}</span>
                  <span className="tv-row-teams">
                    {c.teamA.name} <span className="muted">vs</span> {c.teamB.name}
                  </span>
                  <span className="tv-row-meta mono">{[c.divisionName, c.scope].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tv-empty-small">Nothing scheduled</p>
          )}
        </section>

        <section>
          <h2 className="tv-h mono">LATEST RESULTS</h2>
          {data && data.recent.length > 0 ? (
            <ul className="tv-list">
              {data.recent.map((c) => (
                <li key={c.id} className="tv-row">
                  <span className="tv-row-when mono">{[c.divisionName, c.scope].filter(Boolean).join(' · ')}</span>
                  <span className="tv-row-teams">
                    <span className={c.winnerId === c.teamA.id ? 'tv-bold' : ''}>{c.teamA.name}</span>{' '}
                    <span className="mono">
                      {c.scoreA}-{c.scoreB}
                    </span>{' '}
                    <span className={c.winnerId === c.teamB.id ? 'tv-bold' : ''}>{c.teamB.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tv-empty-small">No results yet</p>
          )}
        </section>
      </div>

      <footer className="tv-foot mono">
        {error ? 'Reconnecting…' : updatedAt ? `Updates automatically · last ${clockTime(updatedAt)}` : ''}
      </footer>
    </div>
  );
}
