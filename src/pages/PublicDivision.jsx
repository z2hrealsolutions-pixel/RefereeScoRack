import { useMemo, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { clockTime, loadDivision } from '../lib/board';
import { POLL_MS } from '../lib/config';
import { categoryLabel } from '../lib/format';
import { usePolling } from '../lib/usePolling';
import { bracketRounds, buildCard, bySchedule, groupStandings, hasTies, matchResult, statusOf } from '../lib/publicData';

function Standings({ groups, teams, standings }) {
  return (
    <div className="st-grid">
      {groups.map((g) => {
        const table = groupStandings(g.id, teams, standings);
        return (
          <section key={g.id} className="st-group">
            <h2 className="st-title">{g.name}</h2>
            <table className="st-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col" title="Played">P</th>
                  <th scope="col" title="Won, lost">W-L</th>
                  <th scope="col" title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.teamId}>
                    <td className="mono">{r.position}</td>
                    <td className="st-name">{r.name}</td>
                    <td className="mono">{r.played}</td>
                    <td className="mono">
                      {r.wins}-{r.losses}
                    </td>
                    <td className="mono st-pts">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasTies(table) && <p className="muted small">Teams level on points are listed A to Z.</p>}
          </section>
        );
      })}
    </div>
  );
}

function Matches({ cards, groups }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const knockout = cards.some((c) => c.isKnockout);

  const q = query.trim().toLowerCase();
  const matches = (c) =>
    !q || c.teamA.name.toLowerCase().includes(q) || c.teamB.name.toLowerCase().includes(q);

  const sections = [
    ...groups.map((g) => ({ key: g.id, title: g.name, list: cards.filter((c) => !c.isKnockout && c.scope === g.name) })),
    ...(knockout ? [{ key: 'knockout', title: 'Knockout stage', list: cards.filter((c) => c.isKnockout) }] : []),
  ]
    .map((s) => ({ ...s, list: s.list.filter(matches).sort(bySchedule) }))
    .filter((s) => (scope === 'all' || scope === s.key) && s.list.length > 0);

  return (
    <div>
      <div className="mt-controls">
        <label className="field-label" htmlFor="findTeam">
          Find a team
        </label>
        <input
          id="findTeam"
          className="text-input"
          type="search"
          autoComplete="off"
          placeholder="Type a name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {(groups.length > 0 || knockout) && (
          <div className="chip-row" role="tablist" aria-label="Show">
            <button type="button" role="tab" aria-selected={scope === 'all'} className={`chip ${scope === 'all' ? 'chip-active' : ''}`} onClick={() => setScope('all')}>
              All
            </button>
            {groups.map((g) => (
              <button key={g.id} type="button" role="tab" aria-selected={scope === g.id} className={`chip ${scope === g.id ? 'chip-active' : ''}`} onClick={() => setScope(g.id)}>
                {g.name}
              </button>
            ))}
            {knockout && (
              <button type="button" role="tab" aria-selected={scope === 'knockout'} className={`chip ${scope === 'knockout' ? 'chip-active' : ''}`} onClick={() => setScope('knockout')}>
                Knockout stage
              </button>
            )}
          </div>
        )}
      </div>

      {sections.length === 0 && <p className="home-empty">No matches found.</p>}
      {sections.map((s) => (
        <section key={s.key} className="home-section">
          <h2 className="home-section-title">{s.title}</h2>
          <div className="pm-list">
            {s.list.map((c) => (
              <MatchCard key={c.id} card={c} showDivision={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Bracket({ data }) {
  const knockout = data.matchups.filter((m) => m.group_id === null);
  const rounds = bracketRounds(knockout);
  const names = Object.fromEntries(data.teams.map((t) => [t.id, t.name]));
  const finalMatch = knockout.find((m) => m.stage === 'Final');
  const champion = finalMatch
    ? matchResult(finalMatch, data.subsByMatch[finalMatch.id] || [], data.division.category).winnerId
    : null;

  return (
    <div>
      {champion && (
        <p className="bk-champion">
          <span className="mono">CHAMPION</span> {names[champion]}
        </p>
      )}
      <div className="bk-scroll">
        <div className="bk">
          {rounds.map((round) => (
            <div key={round.stage} className="bk-col">
              <h2 className="bk-round mono">{round.stage}</h2>
              {round.matches.map(({ match, placeholderA, placeholderB }) => {
                const result = matchResult(match, data.subsByMatch[match.id] || [], data.division.category);
                const status = statusOf(match);
                const slot = (teamId, placeholder, score) => (
                  <div className={`bk-slot ${result.winnerId && result.winnerId === teamId ? 'bk-win' : ''} ${teamId ? '' : 'bk-pending'}`}>
                    <span className="bk-name">{teamId ? names[teamId] : placeholder}</span>
                    <span className="bk-score mono">{score === null || score === undefined ? '' : score}</span>
                  </div>
                );
                return (
                  <div key={match.id} className={`bk-match bk-${status}`} data-status={status}>
                    {slot(match.team_a_id, placeholderA, result.scoreA)}
                    {slot(match.team_b_id, placeholderB, result.scoreB)}
                    {(status === 'live' || status === 'bye' || match.court || match.scheduled_time) && (
                      <div className="bk-foot mono">
                        {status === 'live' && <span className="live">LIVE </span>}
                        {status === 'bye' ? 'bye' : [match.court, match.scheduled_time].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PublicDivision() {
  const { tenant } = useOutletContext();
  const { divisionId } = useParams();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loaded: false, error: '', data: null, notFound: false, updatedAt: null });

  usePolling(async (isActive) => {
    const result = await loadDivision(divisionId);
    if (!isActive()) return;
    if (result.error) setState((s) => ({ ...s, loaded: true, error: result.error }));
    else if (result.notFound) setState({ loaded: true, error: '', data: null, notFound: true, updatedAt: null });
    else setState({ loaded: true, error: '', data: result, notFound: false, updatedAt: Date.now() });
  }, POLL_MS);

  const { data } = state;
  const cards = useMemo(() => {
    if (!data) return [];
    const names = Object.fromEntries(data.teams.map((t) => [t.id, t.name]));
    const groupNames = Object.fromEntries(data.groups.map((g) => [g.id, g.name]));
    return data.matchups
      .filter((m) => m.status !== 'bye')
      .map((m) =>
        buildCard({
          match: m,
          subs: data.subsByMatch[m.id] || [],
          division: data.division,
          groupName: groupNames[m.group_id],
          names,
        })
      );
  }, [data]);

  const back = (
    <Link to={`/${tenant.slug}`} className="back-link mono">
      ← {tenant.name}
    </Link>
  );

  if (!state.loaded) return <div>{back}<p className="mono muted">Loading…</p></div>;
  if (state.notFound) {
    return (
      <div>
        {back}
        <p className="page-sub">That division isn't open yet.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {back}
        <div className="callout-error">{state.error}</div>
      </div>
    );
  }

  const tabs = [
    ...(data.groups.length > 0 ? [{ key: 'standings', label: 'Standings' }] : []),
    { key: 'matches', label: 'Matches' },
    ...(data.matchups.some((m) => m.group_id === null) ? [{ key: 'bracket', label: 'Bracket' }] : []),
  ];
  const wanted = params.get('tab');
  const active = tabs.some((t) => t.key === wanted) ? wanted : tabs[0].key;
  const d = data.division;

  return (
    <div>
      {back}
      <h1 className="page-title">{d.name}</h1>
      <p className="page-sub mono">
        {categoryLabel(d.category)}
        {d.gender_label ? ` · ${d.gender_label}` : ''}
        {d.age_label ? ` · ${d.age_label}` : ''}
        {d.status === 'completed' ? ' · Finished' : ''}
        {state.error ? ' · reconnecting…' : state.updatedAt ? ` · updated ${clockTime(state.updatedAt)}` : ''}
      </p>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`tab ${active === t.key ? 'tab-active' : ''}`}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'standings' && <Standings groups={data.groups} teams={data.teams} standings={data.standings} />}
      {active === 'matches' && <Matches cards={cards} groups={data.groups} />}
      {active === 'bracket' && <Bracket data={data} />}
    </div>
  );
}
