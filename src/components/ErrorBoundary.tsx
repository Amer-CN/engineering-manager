import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportCrash } from '../lib/crash'

// ── 类型定义 ──
interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// ── ErrorBoundary 组件 ──
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary 捕获到错误:', error)
    console.error('组件堆栈:', errorInfo.componentStack)
    // ── 上报（恢复自 crash 系统）──
    void reportCrash({
      kind: 'react',
      message: error.message || String(error),
      errorMessage: error.message,
      errorType: error.name || 'Error',
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
      view: typeof window !== 'undefined' ? window.location.pathname : '',
      label: 'ErrorBoundary',
    })
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null })
  }

  private handleRefreshPage = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', background: 'var(--bg)', color: 'var(--fg)' }}>
          <h2>页面出现异常</h2>
          <p style={{ color: 'var(--muted)' }}>抱歉，该页面加载时发生了错误。您可以尝试重新加载。</p>
          {this.state.error && (
            <details style={{ marginBottom: '1rem', maxWidth: 500, width: '100%', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted)' }}>查看错误详情</summary>
              <pre style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--panel-2)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--danger)', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={this.handleReload} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--fg)' }}>
              重新加载
            </button>
            <button onClick={this.handleRefreshPage} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
