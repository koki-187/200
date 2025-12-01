import React, { Suspense, lazy } from 'react'
import Toast from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { LoadingIndicator } from './components/LoadingIndicator'
import { useAuthStore } from './store/authStore'

// コード分割: React.lazy()を使用して動的インポート
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DealCreatePage = lazy(() => import('./pages/DealCreatePage'))
const DealDetailPage = lazy(() => import('./pages/DealDetailPage'))
const SpecialCasesPage = lazy(() => import('./pages/SpecialCasesPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const DealProposalPage = lazy(() => import('./pages/DealProposalPage'))
const InvestmentSimulatorPage = lazy(() => import('./pages/InvestmentSimulatorPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))
const MonitoringDashboardPage = lazy(() => import('./pages/MonitoringDashboardPage'))

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
      case '/monitoring':
        return <MonitoringDashboardPage />
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
      <Suspense fallback={<LoadingIndicator loading={true} fullScreen={true} message="ページを読み込んでいます..." />}>
        {renderPage()}
      </Suspense>
      <Toast />
    </ErrorBoundary>
  )
}

export default App
