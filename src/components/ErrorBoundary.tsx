import React from 'react';
import { TRANSLATIONS } from '../i18n/translations';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('DROPP UI ErrorBoundary:', error.message);
  }

  render() {
    if (this.state.hasError) {
      const t = TRANSLATIONS.fr.errors;
      return (
        <div className="min-h-dvh bg-[var(--dropp-bg)] text-[var(--dropp-text)] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="mt-2 text-sm text-[var(--dropp-muted)] max-w-sm">{t.desc}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold transition-colors"
          >
            {t.reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
