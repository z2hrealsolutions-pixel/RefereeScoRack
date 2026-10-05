import { Navigate, useParams } from 'react-router-dom';
import { currentHostMode } from '../lib/hostMode';
import TenantHome from './TenantHome';

// The front address of a venue: spectators see the live page, the referee address goes
// straight to scoring and the display address straight to the TV board.
export default function TenantLanding() {
  const { slug } = useParams();
  const mode = currentHostMode();
  if (mode === 'referee') return <Navigate to={`/${slug}/referee`} replace />;
  if (mode === 'tv') return <Navigate to={`/${slug}/tv`} replace />;
  return <TenantHome />;
}
