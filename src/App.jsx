import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TenantGate from './components/TenantGate';
import TenantHome from './pages/TenantHome';
import RefereeDivisions from './pages/RefereeDivisions';
import RefereeDivision from './pages/RefereeDivision';
import RefereeMatch from './pages/RefereeMatch';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:slug" element={<TenantGate />}>
        <Route index element={<TenantHome />} />
        <Route path="referee" element={<RefereeDivisions />} />
        <Route path="referee/:divisionId" element={<RefereeDivision />} />
        <Route path="referee/:divisionId/match/:matchupId" element={<RefereeMatch />} />
      </Route>
    </Routes>
  );
}
