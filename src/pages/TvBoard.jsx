import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Brand from '../components/Brand';
import { clockTime, useBoard } from '../lib/board';
import { TV_POLL_MS } from '../lib/config';
import { categoryLabel } from '../lib/publicData';
import { lockTheme } from '../lib/theme';
import '../styles/broadcast.css';

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

// One finished match is two lines: its type and stage on the left, then the two teams with
// their scores underneath each other. Only the winner's score is picked out, in dark turquoise.
function ResultsTable({ cards }) {
  const table = useRef(null);

  // A TV can't scroll, so show only as many whole results as the screen has room for, newest
  // first, and drop the oldest when the board is full (several courts live, or a smaller screen).
  // Runs after every render and when the screen size changes, before anything is drawn.
  useLayoutEffect(() => {
    const fit = () => {
      const rows = table.current ? [...table.current.querySelectorAll('tr')] : [];
      rows.forEach((r) => {
        r.style.display = '';
      });
      for (let i = rows.length - 2; i >= 2; i -= 2) {
        if (document.documentElement.scrollHeight <= window.innerHeight) break;
        rows[i].style.display = 'none';
        rows[i + 1].style.display = 'none';
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  });

  return (
    <table className="tv-results" ref={table}>
      <tbody>
        {cards.map((c) => {
          const aWon = Boolean(c.winnerId) && c.winnerId === c.teamA.id;
          const bWon = Boolean(c.winnerId) && c.winnerId === c.teamB.id;
          return (
            <Fragment key={c.id}>
              <tr className="tv-res-top">
                <td className="tv-res-type" rowSpan={2}>
                  <div>{categoryLabel(c.category)}</div>
                  {c.divisionName && <div className="tv-res-division">{c.divisionName}</div>}
                </td>
                <td className="tv-res-stage" rowSpan={2}>
                  {c.scope}
                </td>
                <td className={`tv-res-team${bWon ? ' tv-lose' : ''}`}>{c.teamA.name}</td>
                <td className={`tv-res-score mono${aWon ? ' tv-win-score' : ''}${bWon ? ' tv-lose' : ''}`}>{c.scoreA}</td>
              </tr>
              <tr className="tv-res-bottom">
                <td className={`tv-res-team${aWon ? ' tv-lose' : ''}`}>{c.teamB.name}</td>
                <td className={`tv-res-score mono${bWon ? ' tv-win-score' : ''}${aWon ? ' tv-lose' : ''}`}>{c.scoreB}</td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export default function TvBoard() {
  // a dark screen suits a TV across a room, whatever theme the device is on
  useEffect(() => lockTheme('dark'), []);

  const { tenant } = useOutletContext();
  const { loaded, error, data, updatedAt } = useBoard(tenant.id, { upcomingLimit: 8, recentLimit: 6 }, TV_POLL_MS);
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
        <span className="tv-brand">
          <Brand />
        </span>
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

      <div className={`tv-lower${data && data.knockoutStarted ? '' : ' tv-lower-single'}`}>
        {data && data.knockoutStarted && (
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
        )}

        <section>
          <h2 className="tv-h mono">LATEST RESULTS</h2>
          {data && data.recent.length > 0 ? (
            <ResultsTable cards={data.recent} />
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
