import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError } from '../types/error';
import { ErrorPage } from './ErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  appError: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, appError: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError: AppError = {
      category: 'runtime',
      title: 'Unexpected Application Exception',
      message: error.message || 'A runtime rendering exception occurred in the client application.',
      details: error.stack || 'No stack trace available.',
      timestamp: new Date().toISOString(),
      retryAction: () => {
        window.location.reload();
      },
      recoverAction: () => {
        window.location.href = '/';
      },
      recoverLabel: 'Return to Home',
    };

    return { hasError: true, appError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Global ErrorBoundary Caught Exception]:', error, errorInfo);
    if (this.state.appError) {
      this.setState({
        appError: {
          ...this.state.appError,
          details: `${error.stack || error.message}\n\nComponent Stack:\n${errorInfo.componentStack}`,
        },
      });
    }
  }

  handleClearError = () => {
    this.setState({ hasError: false, appError: null });
  };

  render() {
    if (this.state.hasError && this.state.appError) {
      return (
        <ErrorPage
          error={this.state.appError}
          onClearError={this.handleClearError}
        />
      );
    }

    return this.props.children;
  }
}
