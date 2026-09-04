'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { BUILDER_PERSIST_KEY } from '../store/builder.store'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Block Builder] Uncaught error:', error, errorInfo)
  }

  /**
   * Clears persisted builder state before reloading. "Try again" alone only
   * resets the boundary, so if the cause is corrupt persisted state the next
   * render throws immediately -- this gives the user a way out of that loop.
   */
  private handleResetState = () => {
    try {
      window.localStorage.removeItem(BUILDER_PERSIST_KEY)
    } catch (err) {
      console.error('[Block Builder] Could not clear persisted state:', err)
    }
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bb-error-boundary" role="alert">
          <h2 className="bb-error-boundary__title">Something went wrong in the Block Builder.</h2>
          <details className="bb-error-boundary__details">
            <summary>Error details</summary>
            <pre className="bb-error-boundary__trace">{this.state.error?.toString()}</pre>
          </details>
          <div className="bb-error-boundary__actions">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bb-error-boundary__btn bb-error-boundary__btn--primary"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleResetState}
              className="bb-error-boundary__btn"
            >
              Reset builder state
            </button>
          </div>
          <p className="bb-error-boundary__hint">
            &ldquo;Reset builder state&rdquo; discards unsaved local edits and reloads. Published
            versions are stored in the database and are not affected.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
