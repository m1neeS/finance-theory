import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi } from '../lib/api'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { ProfileSettings } from './ProfileSettings'
import { OCRUpload } from './OCRUpload'
import { Dashboard } from './Dashboard'
import { 
  Wallet, Plus, Camera, Home, PieChart, History, User,
  ArrowUpRight, ArrowDownRight, Sparkles, Bell, ChevronRight,
  TrendingUp, Target
} from 'lucide-react'

type TabType = 'home' | 'dashboard' | 'history' | 'profile'

export function HomePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showOCRUpload, setShowOCRUpload] = useState(false)
  const [ocrData, setOcrData] = useState<any>(null)
  const [quickStats, setQuickStats] = useState<any>(null)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const userName = user?.user_metadata?.display_name || 
                   user?.user_metadata?.full_name || 
                   user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    fetchQuickData()
  }, [])

  const fetchQuickData = async () => {
    try {
      setLoading(true)
      const [summaryRes, recentRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.recent(3)
      ])
      setQuickStats(summaryRes.data)
      setRecentTx(recentRes.data || [])
    } catch (err) {
      console.error('Error fetching quick data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`
    return amount.toString()
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const handleOCRComplete = (result: any) => {
    setOcrData(result)
    setShowOCRUpload(false)
    setShowTransactionForm(true)
  }

  // Render Home Tab Content
  const renderHomeContent = () => (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 px-6 pt-8 pb-32 -mx-4 -mt-4 rounded-b-[40px]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">{getGreeting()}</p>
              <h1 className="text-xl font-bold text-white">{userName}</h1>
            </div>
          </div>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="text-center">
          <p className="text-white/80 text-sm mb-2">Total Balance</p>
          <h2 className="text-4xl font-bold text-white mb-4">
            {loading ? '...' : formatCurrency(quickStats?.total_balance || 0)}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
              <ArrowUpRight className="w-4 h-4 text-emerald-300" />
              <span className="text-white text-sm">{formatShortCurrency(quickStats?.total_income || 0)}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
              <ArrowDownRight className="w-4 h-4 text-rose-300" />
              <span className="text-white text-sm">{formatShortCurrency(quickStats?.total_expense || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Floating */}
      <div className="px-4 -mt-16 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl hover:from-violet-100 hover:to-purple-100 transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Tambah</p>
                <p className="text-xs text-gray-400">Transaksi Baru</p>
              </div>
            </button>
            
            <button
              onClick={() => setShowOCRUpload(true)}
              className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl hover:from-emerald-100 hover:to-teal-100 transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Scan</p>
                <p className="text-xs text-gray-400">Foto Struk</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Ringkasan Bulan Ini</h3>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="text-violet-600 text-sm font-medium flex items-center gap-1"
          >
            Detail <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Pemasukan</p>
            <p className="font-bold text-gray-800">{formatShortCurrency(quickStats?.total_income || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-3">
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Pengeluaran</p>
            <p className="font-bold text-gray-800">{formatShortCurrency(quickStats?.total_expense || 0)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-xs text-gray-400 mb-1">Savings</p>
            <p className="font-bold text-gray-800">
              {quickStats?.total_income ? Math.round(((quickStats.total_income - quickStats.total_expense) / quickStats.total_income) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Transaksi Terbaru</h3>
          <button 
            onClick={() => setActiveTab('history')}
            className="text-violet-600 text-sm font-medium flex items-center gap-1"
          >
            Semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {recentTx.length > 0 ? (
          <div className="space-y-3">
            {recentTx.map((tx: any) => (
              <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                }`}>
                  {tx.type === 'income' ? '💰' : '🛍️'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{tx.description || tx.merchant_name || 'Transaksi'}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatShortCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-lg shadow-gray-100 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 mb-4">Belum ada transaksi</p>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="px-6 py-2 bg-violet-100 text-violet-600 rounded-full font-medium text-sm hover:bg-violet-200 transition-colors"
            >
              Tambah Sekarang
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pt-4">
        {activeTab === 'home' && renderHomeContent()}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'history' && (
          <div className="pb-24">
            <TransactionList onClose={() => setActiveTab('home')} onRefresh={fetchQuickData} embedded />
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="pb-24">
            <ProfileSettings onClose={() => setActiveTab('home')} embedded />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'dashboard', icon: PieChart, label: 'Dashboard' },
            { id: 'history', icon: History, label: 'Riwayat' },
            { id: 'profile', icon: User, label: 'Profil' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'text-violet-600 bg-violet-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showTransactionForm && (
        <TransactionForm
          onClose={() => {
            setShowTransactionForm(false)
            setOcrData(null)
          }}
          onSaved={() => {
            setShowTransactionForm(false)
            setOcrData(null)
            fetchQuickData()
          }}
          initialData={ocrData}
        />
      )}

      {showOCRUpload && (
        <OCRUpload
          onClose={() => setShowOCRUpload(false)}
          onComplete={handleOCRComplete}
        />
      )}
    </div>
  )
}
