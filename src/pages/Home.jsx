import Brand from '../components/Brand';

export default function Home() {
  return (
    <div className="page">
      <div className="brand-row">
        <Brand />
      </div>
      <h1 className="page-title">Open your tournament's address</h1>
      <p className="page-sub">
        Referees and spectators are given a link that ends with the tournament's name. Open that link
        to continue.
      </p>
    </div>
  );
}
