import { Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import TenantGate from './components/TenantGate';
import TenantHome from './pages/TenantHome';
import RefereeDivisions from './pages/RefereeDivisions';
import RefereeDivision from './pages/RefereeDivision';
import ScopeGate from './pages/ScopeGate';
import ScopeMatches from './pages/ScopeMatches';
import RefereeMatch from './pages/RefereeMatch';
import PublicDivision from './pages/PublicDivision';
import TvBoard from './pages/TvBoard';

export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:slug" element={<TenantGate />}>
          <Route index element={<TenantHome />} />
          <Route path="division/:divisionId" element={<PublicDivision />} />
          <Route path="tv" element={<TvBoard />} />
          <Route path="referee" element={<RefereeDivisions />} />
          <Route path="referee/:divisionId" element={<RefereeDivision />} />
          <Route path="referee/:divisionId/:scopeKey" element={<ScopeGate />}>
            <Route index element={<ScopeMatches />} />
            <Route path="match/:matchupId" element={<RefereeMatch />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
