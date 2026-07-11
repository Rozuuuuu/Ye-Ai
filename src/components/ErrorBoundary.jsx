import { Component } from 'react';
import * as Sentry from '@sentry/react';

/**
 * ErrorBoundary — catches render errors anywhere in the tree so a single
 * component crash shows a recoverable screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Render crash:', error, info?.componentStack);
    // No-op unless Sentry.init ran (VITE_SENTRY_DSN set)
    Sentry.captureException(error, {
      extra: { componentStack: info?.componentStack },
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '48px', color: '#ff6b6b' }}
        >
          styler
        </span>
        <div>
          <p
            className="italic text-2xl mb-2"
            style={{ fontFamily: 'Newsreader, serif' }}
          >
            Something snagged a thread.
          </p>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            An unexpected error occurred. Reload to continue.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="py-3 px-8 text-[11px] tracking-widest uppercase font-bold transition-all active:scale-[0.97]"
          style={{
            background: 'rgba(255,107,107,0.9)',
            color: '#131313',
            borderRadius: '2px',
          }}
        >
          Reload App
        </button>
      </div>
    );
  }
}
