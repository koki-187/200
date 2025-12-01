import React from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DealCreatePage from './pages/DealCreatePage'
import DealDetailPage from './pages/DealDetailPage'
import SpecialCasesPage from './pages/SpecialCasesPage'
import HelpPage from './pages/HelpPage'
import DealProposalPage from './pages/DealProposalPage'
import InvestmentSimulatorPage from './pages/InvestmentSimulatorPage'
import NotificationSettingsPage from './pages/NotificationSettingsPage'
import Toast from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './store/authStore'

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const pathname = window.location.pathname

  // Route handling
  const renderPage = () => {
    if (!isAuthenticated && pathname !== '/login') {
      window.location.href = '/login'
      return null
    }

    if (isAuthenticated && pathname === '/login') {
      window.location.href = '/dashboard'
      return null
    }

    // Deal proposal page (must come before detail page)
    if (pathname.match(/^\/deals\/[^\/]+\/proposal$/)) {
      return <DealProposalPage />
    }

    // Investment simulator page (must come before detail page)
    if (pathname.match(/^\/deals\/[^\/]+\/simulator$/)) {
      return <InvestmentSimulatorPage />
    }

    // Deal detail page (must come before switch)
    if (pathname.startsWith('/deals/') && pathname.split('/').length === 3) {
      return <DealDetailPage />
    }

    switch (pathname) {
      case '/login':
        return <LoginPage />
      case '/dashboard':
      case '/':
        return <DashboardPage />
      case '/deals/create':
        return <DealCreatePage />
      case '/special-cases':
        return <SpecialCasesPage />
      case '/help':
        return <HelpPage />
      case '/settings/notifications':
        return <NotificationSettingsPage />
      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-4">ページが見つかりません</p>
              <a href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
                ダッシュボードに戻る
              </a>
            </div>
          </div>
        )
    }
  }

  return (
    <ErrorBoundary>
      {renderPage()}
      <Toast />
    </ErrorBoundary>
  )
}

export default App
