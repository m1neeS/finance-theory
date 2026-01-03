import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/LoginPage'
import { Dashboard } from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()

  console.log('App loaded', { user, loading })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading...</p>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginPage />
}

export default App
