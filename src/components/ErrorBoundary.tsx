// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { InvalidStateTransitionError } from '@/lib/stateMachine/gameStateMachine';
import { DatabaseError } from '@/services/database/gameService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service (e.g., Sentry)
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;
      
      if (prevKeys.length !== currentKeys.length ||
          prevKeys.some((key, index) => key !== currentKeys[index])) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render appropriate error UI based on error type
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    {this.getErrorMessage(this.state.error)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.renderErrorDetails(this.state.error)}
              
              <div className="flex gap-2">
                <Button onClick={this.reset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                    {this.state.error.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorMessage(error: Error): string {
    if (error instanceof InvalidStateTransitionError) {
      return 'Invalid game state transition. The action you attempted is not allowed at this time.';
    }
    
    if (error instanceof DatabaseError) {
      if (error.code === 'REQUIREMENTS_NOT_MET') {
        return 'Game requirements not met. Please complete all necessary steps first.';
      }
      return 'A database error occurred. Please try again.';
    }

    // Generic error message
    return 'An unexpected error occurred. We\'re sorry for the inconvenience.';
  }

  private renderErrorDetails(error: Error): ReactNode {
    if (error instanceof InvalidStateTransitionError) {
      return (
        <div className="bg-muted p-4 rounded space-y-2">
          <p className="text-sm">
            <strong>Current State:</strong> {error.currentState}
          </p>
          <p className="text-sm">
            <strong>Attempted Transition:</strong> {error.attemptedState}
          </p>
          <p className="text-sm">
            <strong>Allowed States:</strong> {error.allowedStates.join(', ')}
          </p>
        </div>
      );
    }

    if (error instanceof DatabaseError && error.details?.errors) {
      return (
        <div className="bg-muted p-4 rounded">
          <p className="text-sm font-medium mb-2">Requirements:</p>
          <ul className="text-sm list-disc list-inside space-y-1">
            {error.details.errors.map((err: string, idx: number) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  }
}

// Specialized error boundaries for specific contexts
export function CharacterGenerationErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Character Generation Failed</CardTitle>
              <CardDescription>
                We encountered an error while generating your characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This could be due to a temporary issue with the AI service or a problem with your character seeds.
              </p>
              <div className="flex gap-2">
                {onRetry && (
                  <Button onClick={onRetry}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Generation
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.history.back()}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function GameSessionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Game Session Error</CardTitle>
              <CardDescription>
                Your game session encountered an unexpected error.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Don't worry - your game progress is saved. Try refreshing the page.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}