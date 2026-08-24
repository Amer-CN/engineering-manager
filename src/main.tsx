import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast/ToastProvider'
import './index.css'
import { APP_VERSION } from './version'
import { initCrashReporter } from './lib/crash'

initCrashReporter({ version: APP_VERSION })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
