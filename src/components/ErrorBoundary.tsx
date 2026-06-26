import { Component, type ErrorInfo, type ReactNode } from 'react'

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
          <h2>页面出现异常</h2>
          <p>抱歉，该页面加载时发生了错误。您可以尝试重新加载。</p>
          {this.state.error && (
            <details style={{ marginBottom: '1rem', maxWidth: 500, width: '100%', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem' }}>查看错误详情</summary>
              <pre style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f1f5f9', borderRadius: 8, fontSize: '0.75rem', color: '#ef4444', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={this.handleReload} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
              重新加载
            </button>
            <button onClick={this.handleRefreshPage} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
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

