import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-8">
          <div className="max-w-md text-center">
            <p className="text-xs tracking-[0.4em] text-orange-500 uppercase mb-4">Something went wrong</p>
            <h1 className="font-athletic text-4xl text-white mb-6">UNEXPECTED ERROR</h1>
            <p className="text-stone-500 text-sm mb-8">
              An unexpected error occurred. Please refresh the page or contact us if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-600 text-white text-xs tracking-[0.3em] uppercase px-8 py-3 hover:bg-orange-500 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
