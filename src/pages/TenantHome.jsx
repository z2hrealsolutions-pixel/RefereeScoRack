import { Link, useOutletContext } from 'react-router-dom';

export default function TenantHome() {
  const { tenant } = useOutletContext();
  return (
    <div>
      <h1 className="page-title">{tenant.name}</h1>
      <div className="tile-list">
        <Link to={`/${tenant.slug}/referee`} className="tile">
          <span className="tile-title">Referee scoring</span>
          <span className="tile-sub">Score a match live with your group's code</span>
        </Link>
        <div className="tile tile-disabled">
          <span className="tile-title">Live scores and brackets</span>
          <span className="tile-sub">Coming next</span>
        </div>
      </div>
    </div>
  );
}
