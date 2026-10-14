import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info) }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 max-w-sm text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button onClick={() => window.location.reload()}
              className="bg-noun-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-noun-600 transition">
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
