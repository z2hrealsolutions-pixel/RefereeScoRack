import { Suspense, lazy } from 'react';
import { currentHostMode } from '../lib/hostMode';
import FindTournament from './FindTournament';

// The landing page and its fonts and styles are only fetched on the bare domain,
// nobody on a venue's address pays for them.
const Landing = lazy(() => import('./Landing'));

// The front page of the site, with no venue in the address: the landing page on the bare domain,
// a way to find a tournament everywhere else.
export default function RootPage() {
  if (currentHostMode() === 'landing') {
    return (
      <Suspense fallback={<div className="page" aria-busy="true" />}>
        <Landing />
      </Suspense>
    );
  }
  return <FindTournament />;
}
