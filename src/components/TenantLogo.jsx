// A tenant's own logo, on a white plate so it reads on any theme whatever colours it was drawn in.
// It never replaces the ScoreIt mark, which has its own place on the right of every banner.
export default function TenantLogo({ src, name, className = '' }) {
  if (!src) return null;
  return (
    <span className={`tenant-logo-plate ${className}`.trim()}>
      <img className="tenant-logo-img" src={src} alt={name ? `${name} logo` : ''} />
    </span>
  );
}
