import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand';
import { searchable } from '../lib/cleanQuery';
import { liveVenues, searchVenues } from '../lib/findData';
import { currentHostMode } from '../lib/hostMode';
import { landingUrlOf } from '../lib/siteLinks';
import '../styles/find.css';

// What the front page is on every address except the bare domain: a way to a venue, for a
// person who arrived without its link. The wording follows the address they came to.
const WORDS = {
  public: { title: 'Find a tournament', sub: "Type the tournament's name, or pick one that is on right now." },
  referee: { title: 'Which tournament are you scoring?', sub: "Type the tournament's name, or pick one that is on right now." },
  tv: { title: "Which tournament's board?", sub: "Type the tournament's name, or pick one that is on right now." },
};

export default function FindTournament() {
  const mode = currentHostMode();
  const words = WORDS[mode] || WORDS.public;
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null);
  const [live, setLive] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    liveVenues().then((r) => {
      if (!current) return;
      if (r.error) setError(r.error);
      else setLive(r.venues);
    });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    const handle = setTimeout(() => {
      searchVenues(query).then((r) => {
        if (!current) return;
        if (r.error) {
          setError(r.error);
          return;
        }
        setError('');
        setFound(r.venues);
      });
    }, 250);
    return () => {
      current = false;
      clearTimeout(handle);
    };
  }, [query]);

  const typed = searchable(query);
  const landing = landingUrlOf(window.location.hostname);

  return (
    <div className="page find">
      <div className="brand-row">
        <Brand />
      </div>
      <h1 className="page-title">{words.title}</h1>
      <p className="page-sub">{words.sub}</p>

      <label className="find-label" htmlFor="find-q">
        Tournament name
      </label>
      <input
        id="find-q"
        className="find-input"
        type="search"
        autoComplete="off"
        autoCapitalize="none"
        placeholder="For example: Colombo Open"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && (
        <p className="find-note" role="alert">
          Could not load tournaments right now. Try again in a moment.
        </p>
      )}

      {typed && found && found.length > 0 && (
        <ul className="find-list" aria-label="Matching tournaments">
          {found.map((v) => (
            <li key={v.id}>
              <Link className="find-row" to={`/${v.slug}`}>
                <span>{v.name}</span>
                <span className="find-go">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {typed && found && found.length === 0 && (
        <p className="find-note" role="status">
          No tournament matches &ldquo;{query.trim()}&rdquo;. Check the spelling, or ask the organiser for the
          tournament&apos;s link.
        </p>
      )}

      {live && live.length > 0 && (
        <section className="find-live">
          <h2 className="find-h">On right now</h2>
          <ul className="find-list">
            {live.map((v) => (
              <li key={v.id}>
                <Link className="find-row" to={`/${v.slug}`}>
                  <span>{v.name}</span>
                  <span className="find-live-n">{v.live === 1 ? '1 match live' : `${v.live} matches live`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {landing && (
        <p className="find-foot">
          New to ScoreIt? <a href={landing}>See what it does</a>
        </p>
      )}
    </div>
  );
}
