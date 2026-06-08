import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled frontend error', error, info);
  }

  public render() {
    if (this.state.error) {
      return (
        <main className="app-fallback" role="alert">
          <h1>Restaurant workspace unavailable</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
