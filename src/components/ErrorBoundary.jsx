import { Component } from 'react';

// If a screen ever crashes, show what happened and a way out, instead of
// the white page the browser shows by default.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Screen crashed:', error, info && info.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const home = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : '/';
    return (
      <div className="page">
        <p className="mono brand">SCORACK</p>
        <h1 className="page-title">Something went wrong on this screen</h1>
        <p className="page-sub">
          Anything that was already saved is safe. Reload to carry on, or go back to the divisions.
          If it keeps happening, tell an admin what you were doing.
        </p>
        <pre className="error-detail mono">{String(this.state.error && this.state.error.message)}</pre>
        <button type="button" className="btn-primary btn-big" onClick={() => window.location.reload()}>
          Reload
        </button>
        <a className="btn-ghost btn-big btn-link" href={home}>
          Back to divisions
        </a>
      </div>
    );
  }
}
