import { Link, useOutletContext } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { clockTime, useBoard } from '../lib/board';
import { POLL_MS } from '../lib/config';
import { categoryLabel } from '../lib/format';

function Section({ title, count, children }) {
  return (
    <section className="home-section">
      <h2 className="home-section-title">
        {title}
        {count > 0 && <span className="home-count mono">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export default function TenantHome() {
  const { tenant } = useOutletContext();
  const { loaded, error, data, updatedAt } = useBoard(tenant.id, { upcomingLimit: 8, recentLimit: 8 }, POLL_MS);

  const live = data ? data.live : [];
  const liveByDivision = {};
  live.forEach((c) => {
    liveByDivision[c.divisionId] = (liveByDivision[c.divisionId] || 0) + 1;
  });

  return (
    <div>
      <h1 className="page-title">{tenant.name}</h1>
      <p className="home-updated mono muted">
        {error ? 'Reconnecting…' : updatedAt ? `Updates by itself · last ${clockTime(updatedAt)}` : 'Loading…'}
      </p>

      {!loaded && !error && <p className="mono muted">Loading…</p>}

      {loaded && (
        <>
          <Section title="Live now" count={live.length}>
            {live.length === 0 ? (
              <p className="home-empty">No matches are being played right now.</p>
            ) : (
              <div className="pm-list">
                {live.map((c) => (
                  <MatchCard key={c.id} card={c} />
                ))}
              </div>
            )}
          </Section>

          {data && data.knockoutStarted && (
            <Section title="Up next">
              {data && data.upcoming.length > 0 ? (
                <div className="pm-list">
                  {data.upcoming.map((c) => (
                    <MatchCard key={c.id} card={c} />
                  ))}
                </div>
              ) : (
                <p className="home-empty">Nothing is scheduled right now.</p>
              )}
            </Section>
          )}

          <Section title="Latest results">
            {data && data.recent.length > 0 ? (
              <div className="pm-list">
                {data.recent.map((c) => (
                  <MatchCard key={c.id} card={c} />
                ))}
              </div>
            ) : (
              <p className="home-empty">No results yet.</p>
            )}
          </Section>

          <Section title="Divisions">
            {data && data.divisions.length > 0 ? (
              <div className="tile-list">
                {data.divisions.map((d) => (
                  <Link key={d.id} to={`/${tenant.slug}/division/${d.id}`} className="tile">
                    <span className="tile-title">{d.name}</span>
                    <span className="tile-sub">
                      {categoryLabel(d.category)}
                      {d.gender_label ? ` · ${d.gender_label}` : ''}
                      {d.age_label ? ` · ${d.age_label}` : ''}
                      {d.status === 'completed' ? ' · Finished' : ''}
                      {liveByDivision[d.id] ? ` · ${liveByDivision[d.id]} live` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="home-empty">No divisions are open yet.</p>
            )}
          </Section>
        </>
      )}

    </div>
  );
}
