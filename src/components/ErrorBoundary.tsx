"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-red-900">エラーが発生しました</h2>
            <p className="mb-6 text-sm text-red-800">
              {this.state.error?.message || "予期しないエラーが発生しました"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              もう一度試す
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

