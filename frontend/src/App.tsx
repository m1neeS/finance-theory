import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/LoginPage'
import { WelcomePage } from './components/WelcomePage'
import { HomePage } from './components/HomePage'
import { Wallet, Sparkles } from 'lucide-react'

function App() {
  const { user, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const [isNewSession, setIsNewSession] = useState(false)

  useEffect(() => {
    // Check if this is a new login session
    if (user && !loading) {
      const lastLoginKey = `lastLogin_${user.id}`
      const lastLogin = localStorage.getItem(lastLoginKey)
      const now = Date.now()
      
      // Show welcome if no previous login or last login was more than 1 hour ago
      if (!lastLogin || (now - parseInt(lastLogin)) > 3600000) {
        setShowWelcome(true)
        setIsNewSession(true)
      }
      
      localStorage.setItem(lastLoginKey, now.toString())
    }
  }, [user, loading])

  const handleWelcomeComplete = () => {
    setShowWelcome(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30 animate-pulse">
              <Wallet className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-4 h-4 text-yellow-800" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">FinanceTheory</h1>
            <p className="text-gray-400">Memuat aplikasi...</p>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (showWelcome && isNewSession) {
    return <WelcomePage onComplete={handleWelcomeComplete} />
  }

  return <HomePage />
}

export default App
