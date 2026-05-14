import { Component } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" dir="rtl" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8edf5 50%, #eee8ff 100%)' }}>
          <div className="card-gradient-border max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-2">حدث خطأ غير متوقع</h2>
              <p className="text-sm text-secondary-500">
                نأسف على الإزعاج. يمكنك إعادة تحميل التطبيق أو المحاولة مرة أخرى.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-xl text-left overflow-auto max-h-32" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.5)' }}>
                <code className="text-xs text-red-600 font-mono">{this.state.error.message}</code>
              </div>
            )}
            <button onClick={this.handleReset} className="btn-primary w-full">
              <RotateCcw size={18} /> إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
