import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import logoForDark from '../assets/scoreit-logo-light.png';
import logoForLight from '../assets/scoreit-logo.png';
import { CONTACT_MESSAGE, contactNumber, formatPhone, whatsappLink } from '../lib/contact';
import { currentSiteLinks } from '../lib/siteLinks';
import '../styles/landing.css';

// The page a new visitor sees on the bare domain. Every score, name and match on it is a made up
// example, there to show what ScoreIt looks like in use.

const TICKER = [
  ['Court 1', 'Silva', 11, 'Dias', 6],
  ['Court 2', 'Perera', 11, 'Kumar', 9],
  ['Court 3', 'Fernando / Jay', 8, 'Hassan / Kumar', 11],
  ['Court 1', 'De Mel', 11, 'Wickrama', 4],
  ['Court 4', 'Dias / Perera', 11, 'Silva / Jay', 7],
  ['Court 2', 'Hassan', 7, 'Fernando', 11],
];

const STEPS = [
  ['Set up the event', 'Create your divisions: singles, doubles or a league.'],
  ['Upload your teams', 'Use our Excel or CSV template. Players and ratings come with it.'],
  ['Build the groups', 'Let ScoreIt seed them, or bring your own groups in a file.'],
  ['Hand out the codes', "Print one sheet. Every referee scores with their group's code."],
  ['Let everyone watch', 'Spectators on their phones, the TV at the venue, results to DUPR after.'],
];

// two pictures of the logo, light lettering for the dark theme and dark lettering for the light one;
// the theme shows one of them (landing.css)
function Logo({ label = 'ScoreIt' }) {
  return (
    <>
      <img className="lp-logo lp-logo-dark" src={logoForDark} alt={label} />
      <img className="lp-logo lp-logo-light" src={logoForLight} alt="" aria-hidden="true" />
    </>
  );
}

const BOX_W = 168;
const BOX_H = 62;

// one match in the example bracket. who: [name, score, result] with result 'w' for the winner
function BracketMatch({ x, y, a, b, state }) {
  return (
    <g>
      <rect className={`lp-bx${state === 'live' ? ' lp-bx-live' : ''}`} x={x} y={y} width={BOX_W} height={BOX_H} rx="12" />
      <line className="lp-bl" x1={x + 10} x2={x + BOX_W - 10} y1={y + BOX_H / 2} y2={y + BOX_H / 2} />
      {[a, b].map((p, i) => {
        const cy = y + 19 + i * 31;
        const won = state === 'final' && p[2] === 'w';
        const tbd = p[0] === 'TBD';
        const nameClass = state === 'live' || won ? 'lp-bn lp-bn-hi' : tbd ? 'lp-bn lp-bn-tbd' : 'lp-bn';
        const scoreClass = won ? 'lp-bs lp-bs-win' : state === 'live' ? 'lp-bs lp-bs-hi' : 'lp-bs';
        return (
          <g key={i}>
            <text className={nameClass} x={x + 14} y={cy} fontSize="15" fontWeight={won ? 600 : 400} fontStyle={tbd ? 'italic' : 'normal'}>
              {p[0]}
            </text>
            {p[1] !== '' && (
              <text className={scoreClass} x={x + BOX_W - 14} y={cy} textAnchor="end" fontSize="16" fontWeight={won ? 700 : 400}>
                {p[1]}
              </text>
            )}
          </g>
        );
      })}
      {state === 'live' && (
        <text className="lp-blive" x={x + BOX_W - 6} y={y - 6} textAnchor="end" fontSize="11" fontWeight="600">
          LIVE
        </text>
      )}
    </g>
  );
}

function Bracket() {
  const colX = [0, 206, 412];
  const qy = [8, 98, 188, 278];
  const sy = [(qy[0] + qy[1]) / 2, (qy[2] + qy[3]) / 2];
  const fy = (sy[0] + sy[1]) / 2;
  const qf = [
    [['Silva', 11, 'w'], ['Dias', 6, 'l'], 'final'],
    [['Perera', 11, 'w'], ['Kumar', 9, 'l'], 'final'],
    [['Fernando', 11, 'w'], ['Hassan', 8, 'l'], 'final'],
    [['De Mel', 7, ''], ['Wickrama', 5, ''], 'live'],
  ];
  const link = (x1, y1, x2, y2) => `M${x1} ${y1} H${(x1 + x2) / 2} V${y2} H${x2}`;
  const paths = [];
  [0, 1].forEach((i) => {
    paths.push(link(colX[0] + BOX_W, qy[i * 2] + BOX_H / 2, colX[1], sy[i] + BOX_H / 2));
    paths.push(link(colX[0] + BOX_W, qy[i * 2 + 1] + BOX_H / 2, colX[1], sy[i] + BOX_H / 2));
    paths.push(link(colX[1] + BOX_W, sy[i] + BOX_H / 2, colX[2], fy + BOX_H / 2));
  });
  return (
    <svg className="lp-bracket" viewBox="0 0 580 372" role="img" aria-label="Example knockout bracket">
      {paths.map((d, i) => (
        <path className="lp-bp" key={i} d={d} fill="none" strokeWidth="1.5" />
      ))}
      {qf.map(([a, b, state], i) => (
        <BracketMatch key={i} x={colX[0]} y={qy[i]} a={a} b={b} state={state} />
      ))}
      <BracketMatch x={colX[1]} y={sy[0]} a={['Silva', '', '']} b={['Perera', '', '']} state="next" />
      <BracketMatch x={colX[1]} y={sy[1]} a={['Fernando', '', '']} b={['TBD', '', '']} state="next" />
      <BracketMatch x={colX[2]} y={fy} a={['TBD', '', '']} b={['TBD', '', '']} state="next" />
      {[['QUARTERFINAL', 0], ['SEMIFINAL', 1], ['FINAL', 2]].map(([t, i]) => (
        <text className="lp-bt" key={t} x={colX[i]} y="366" fontSize="11" fontWeight="500" letterSpacing="1.5">
          {t}
        </text>
      ))}
    </svg>
  );
}

export default function Landing() {
  const links = currentSiteLinks();
  const number = contactNumber();
  const whatsapp = whatsappLink(number, CONTACT_MESSAGE);

  useEffect(() => {
    const before = document.title;
    document.title = 'ScoreIt by Z2HxRealSolutions: record it, view it, score it';
    return () => {
      document.title = before;
    };
  }, []);

  const feed = TICKER.map(([court, a, sa, b, sb]) => (
    <span key={`${court}-${a}`}>
      <em>{court}</em>&nbsp; {a} <i>{sa}</i> to <i>{sb}</i> {b}&nbsp; <em>final</em>
    </span>
  ));

  return (
    <div className="lp">
      <header className="lp-bar">
        <a className="lp-brand" href="/" aria-label="ScoreIt home">
          <Logo />
          <span>by Z2HxRealSolutions</span>
        </a>
        <nav aria-label="Main">
          <a href="#how">How it works</a>
          {links.live && <a href={links.live}>Watch live</a>}
          {links.rent && <a href={links.rent}>Venue access</a>}
          <ThemeToggle />
          <a className="lp-btn lp-btn-primary lp-bar-cta" href={whatsapp} target="_blank" rel="noreferrer">
            Run your tournament
          </a>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div>
              <p className="lp-eyebrow">Live brackets, scores and TV boards</p>
              <h1 aria-label="Record it. View it. Score it.">
                <span aria-hidden="true">Record it.</span>
                <span aria-hidden="true">View it.</span>
                <span className="lp-f" aria-hidden="true">Score it.</span>
              </h1>
              <p className="lp-lede">
                The tournament manager built in Sri Lanka. Brackets that build themselves, a live scoreboard for every
                spectator, and referees scoring from their phones.
              </p>
              <div className="lp-cta">
                <a className="lp-btn lp-btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
                  Run your tournament
                </a>
                {links.live && (
                  <a className="lp-btn lp-btn-line" href={links.live}>
                    Watch a live event
                  </a>
                )}
              </div>
              <p className="lp-fine">No app to install. Works on any phone.</p>
            </div>

            <div className="lp-tv force-dark" role="img" aria-label="Example of the venue TV board">
              <div className="lp-tv-head">
                <b>Venue A Open</b>
                <img src={logoForDark} alt="" />
              </div>
              <p className="lp-tv-label">ON COURT NOW</p>
              <div className="lp-tv-court">
                <div className="lp-where">
                  <b>Court 1</b>
                  <span>Men&apos;s Singles, Quarterfinal</span>
                </div>
                <div className="lp-tv-team"><span>Silva</span><span className="lp-n">7</span></div>
                <div className="lp-tv-team"><span>De Mel</span><span className="lp-n">5</span></div>
              </div>
              <p className="lp-tv-label">LATEST RESULTS</p>
              <table className="lp-tv-results">
                <tbody>
                  <tr><td className="lp-k" rowSpan={2}>Singles<br />Group A</td><td>Perera</td><td className="lp-s lp-win">11</td></tr>
                  <tr><td className="lp-lose">Hassan</td><td className="lp-s lp-lose">8</td></tr>
                  <tr className="lp-top"><td className="lp-k" rowSpan={2}>Doubles<br />Playoff</td><td className="lp-lose">Fernando / Dias</td><td className="lp-s lp-lose">6</td></tr>
                  <tr><td>Kumar / Wickrama</td><td className="lp-s lp-win">11</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="lp-ticker" aria-hidden="true">
          <div className="lp-ticker-in">
            {feed}
            {feed}
          </div>
        </div>

        <section className="lp-bento" id="features">
          <article className="lp-tile lp-t-record" id="record">
            <div className="lp-copy">
              <p className="lp-eyebrow">1. Record it</p>
              <h2>Teams in. Brackets out.</h2>
              <p>
                Upload your teams, pick the groups yourself or let ScoreIt seed them by rating. It builds the groups, the
                playoff and the Round of 16, and rebuilds them if anything changes.
              </p>
              <ul className="lp-facts">
                <li>Groups, playoffs and knockout rounds, built for you</li>
                <li>Singles, doubles and league divisions</li>
                <li>Results exported for DUPR</li>
              </ul>
            </div>
            <div className="lp-visual">
              <Bracket />
            </div>
          </article>

          <article className="lp-tile lp-t-view" id="view">
            <div className="lp-copy">
              <p className="lp-eyebrow">2. View it</p>
              <h2>One link. Every court.</h2>
              <p>
                Spectators follow live scores, standings and brackets on their phones, and the venue puts the TV board on a
                big screen. Both update by themselves.
              </p>
              <ul className="lp-facts">
                <li>Live scores, tables and brackets, always current</li>
                <li>A full-screen TV board for the venue</li>
                <li>Nothing for spectators to install or sign up to</li>
              </ul>
            </div>
            <div className="lp-visual">
              <div className="lp-phones">
                <div className="lp-phone" role="img" aria-label="Example spectator page">
                  <div className="lp-top"><span>Venue A Open</span><Logo label="" /></div>
                  <div className="lp-body">
                    <h4>Venue A Open</h4>
                    <div className="lp-tag">LIVE NOW</div>
                    <div className="lp-pcard lp-live">
                      <small><span>Men&apos;s Singles, Quarterfinal</span><b>LIVE</b></small>
                      <div className="lp-pline"><span>Silva</span><span className="lp-s">7</span></div>
                      <div className="lp-pline"><span>De Mel</span><span className="lp-s">5</span></div>
                    </div>
                    <div className="lp-tag">LATEST RESULTS</div>
                    <div className="lp-pcard">
                      <small><span>Mixed Doubles, Group B</span><span>FINAL</span></small>
                      <div className="lp-pline lp-w"><span>Kumar / Wickrama</span><span className="lp-s">11</span></div>
                      <div className="lp-pline"><span>Fernando / Dias</span><span className="lp-s">6</span></div>
                    </div>
                    <div className="lp-pcard">
                      <small><span>Men&apos;s Singles, Round of 16</span><span>FINAL</span></small>
                      <div className="lp-pline"><span>Hassan</span><span className="lp-s">8</span></div>
                      <div className="lp-pline lp-w"><span>Perera</span><span className="lp-s">11</span></div>
                    </div>
                  </div>
                </div>
                <div className="lp-phone" role="img" aria-label="Example standings page">
                  <div className="lp-top"><span>Men&apos;s Singles</span><Logo label="" /></div>
                  <div className="lp-body">
                    <h4>Group A</h4>
                    <div className="lp-pcard"><div className="lp-pline lp-w"><span>1. Perera</span><span className="lp-s">3-0</span></div></div>
                    <div className="lp-pcard"><div className="lp-pline lp-w"><span>2. Silva</span><span className="lp-s">2-1</span></div></div>
                    <div className="lp-pcard"><div className="lp-pline"><span>3. Hassan</span><span className="lp-s">1-2</span></div></div>
                    <div className="lp-pcard"><div className="lp-pline"><span>4. De Mel</span><span className="lp-s">0-3</span></div></div>
                    <div className="lp-tag">Ranked by wins, then head to head, then point difference.</div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="lp-tile lp-t-score" id="score">
            <div className="lp-copy">
              <p className="lp-eyebrow">3. Score it</p>
              <h2>Score from the court.</h2>
              <p>
                A referee opens a link, enters a six digit code and taps in the points. The score is on every screen within
                seconds, and the match moves itself to the bottom of the list when it is finished.
              </p>
              <ul className="lp-facts">
                <li>No app and no accounts for referees</li>
                <li>One code per group, changed whenever you like</li>
                <li>The next match to score is always at the top</li>
              </ul>
            </div>
            <div className="lp-visual">
              <div className="lp-phone lp-ref" role="img" aria-label="Example referee scoring screen">
                <div className="lp-top"><span>Group A</span><Logo label="" /></div>
                <div className="lp-body">
                  <h4>Silva vs De Mel</h4>
                  <div className="lp-tag">COURT 1</div>
                  <div className="lp-big"><b>Silva</b><span className="lp-n">7</span></div>
                  <div className="lp-pm"><div className="lp-plus">+1</div><div className="lp-minus">-1</div></div>
                  <div className="lp-big"><b>De Mel</b><span className="lp-n">5</span></div>
                  <div className="lp-pm"><div className="lp-plus">+1</div><div className="lp-minus">-1</div></div>
                  <div className="lp-finish">Finish match</div>
                </div>
              </div>
            </div>
          </article>

          <article className="lp-tile lp-t-how" id="how">
            <h2>From first serve to final point.</h2>
            <ol className="lp-steps">
              {STEPS.map(([title, text], i) => (
                <li className="lp-step" key={title}>
                  <div className="lp-n" aria-hidden="true">{i + 1}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="lp-sports-band">
          <h2>Pickleball scoring is live today. More sports are coming.</h2>
          <ul className="lp-sports">
            <li className="lp-on">Pickleball<small>Live today</small></li>
            <li className="lp-off">Padel<small>Next</small></li>
            <li className="lp-off">Badminton<small>Next</small></li>
            <li className="lp-off">Tennis<small>Next</small></li>
            <li className="lp-off">Table tennis<small>Next</small></li>
            <li className="lp-off">And more<small>Coming</small></li>
          </ul>
        </section>

        <section className="lp-close" id="contact">
          <div>
            <h2>
              Your next tournament deserves a <em>scoreboard.</em>
            </h2>
            <p>Tell us about your venue and your event. We will set up your ScoreIt, and show you how it runs.</p>
            <div className="lp-cta">
              <a className="lp-btn lp-btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
                Message us on WhatsApp
              </a>
            </div>
            <p className="lp-number">{formatPhone(number)}</p>
          </div>
          <div className="lp-mark" aria-hidden="true">
            <Logo label="" />
          </div>
        </section>
      </main>

      <footer>
        <a className="lp-brand" href="/">
          <Logo />
          <span>by Z2HxRealSolutions. Made in Sri Lanka.</span>
        </a>
        <p className="lp-disclaimer">The names and scores shown on this page are examples.</p>
        <div className="lp-links">
          {links.live && <a href={links.live}>Watch live</a>}
          {links.rent && <a href={links.rent}>Venue access</a>}
          <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </footer>
    </div>
  );
}
