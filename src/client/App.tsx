import React from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import Toast from './components/Toast'
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

    switch (pathname) {
      case '/login':
        return <LoginPage />
      case '/dashboard':
      case '/':
        return <DashboardPage />
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
    <>
      {renderPage()}
      <Toast />
    </>
  )
}

export default App
