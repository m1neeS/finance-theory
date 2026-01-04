import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi, transactionApi } from '../lib/api'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { ProfileSettings } from './ProfileSettings'
import { OCRUpload } from './OCRUpload'
import { 
  Wallet, Plus, Camera, Home, PieChart, History, User, LogOut,
  ArrowUpRight, ArrowDownRight, Sparkles, Bell, ChevronRight, Menu,
  Settings, Trash2, RefreshCw
} from 'lucide-react'
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'

type TabType = 'home' | 'dashboard' | 'history' | 'profile'

const COLORS = ['#8B5CF6', '#EC4899', '#F97316', '#22C55E', '#06B6D4', '#6366F1']

const CATEGORY_ICONS: Record<string, string> = {
  'makanan': '🍔', 'makan': '🍔', 'transport': '🚗', 'belanja': '🛍️',
  'tagihan': '📄', 'hiburan': '🎬', 'kesehatan': '💊', 'gaji': '💰', 'default': '📦'
}

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return CATEGORY_ICONS.default
}

export function HomePage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showOCRUpload, setShowOCRUpload] = useState(false)
  const [ocrData, setOcrData] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const userName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [summaryRes, categoryRes, recentRes, trendRes] = await Promise.all([
        dashboardApi.summary(), dashboardApi.byCategory(), dashboardApi.recent(10), dashboardApi.monthlyTrend(6)
      ])
      setDashboardData({ summary: summaryRes.data, categories: categoryRes.data || [], trend: trendRes.data || [] })
      setRecentTx(recentRes.data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  const formatShort = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`
    return amount.toString()
  }

  const handleOCRComplete = (result: any) => { setOcrData(result); setShowOCRUpload(false); setShowTransactionForm(true) }
  const handleResetData = async () => {
    if (!confirm('Yakin hapus semua transaksi?')) return
    try { setResetting(true); await transactionApi.deleteAll(); await fetchAllData() } 
    catch { alert('Gagal menghapus') } 
    finally { setResetting(false) }
  }

  const pieData = dashboardData?.categories?.map((cat: any, i: number) => ({ name: cat.category_name, value: Number(cat.total_amount) || 0, color: COLORS[i % COLORS.length] })) || []

  const navItems = [
    { id: 'home', icon: Home, label: 'Beranda' },
    { id: 'dashboard', icon: PieChart, label: 'Analytics' },
    { id: 'history', icon: History, label: 'Riwayat' },
    { id: 'profile', icon: User, label: 'Profil' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            <Sparkles className="w-6 h-6 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    )
  }

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Balance */}
        <div className="col-span-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 lg:p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 opacity-80" />
              <span className="text-white/80 text-xs lg:text-sm">Total Balance</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold mb-2">{formatCurrency(dashboardData?.summary?.total_balance || 0)}</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />{formatShort(dashboardData?.summary?.total_income || 0)}
              </span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" />{formatShort(dashboardData?.summary?.total_expense || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Income */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-gray-400 text-xs mb-1">Pemasukan</p>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{formatShort(dashboardData?.summary?.total_income || 0)}</p>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-100 border border-gray-100">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-3">
            <ArrowDownRight className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-gray-400 text-xs mb-1">Pengeluaran</p>
          <p className="text-lg lg:text-xl font-bold text-gray-800">{formatShort(dashboardData?.summary?.total_expense || 0)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-100 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Trend Bulanan</h3>
          <div className="h-48 lg:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.trend || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/><stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatShort} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-100 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Kategori</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">
                      {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {pieData.slice(0, 4).map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-gray-600">{getCategoryIcon(cat.name)} {cat.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{formatShort(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400">Belum ada data</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-100 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Transaksi Terbaru</h3>
          <button onClick={() => setActiveTab('history')} className="text-violet-600 text-sm font-medium flex items-center gap-1">
            Semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {recentTx.length > 0 ? (
          <div className="space-y-3">
            {recentTx.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {getCategoryIcon(tx.description || tx.merchant_name || '')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{tx.description || tx.merchant_name || 'Transaksi'}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <p className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatShort(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-gray-400">
            <Wallet className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Belum ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  )

  // Quick Actions
  const renderQuickActions = () => (
    <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6">
      <button onClick={() => setShowTransactionForm(true)} className="group bg-white rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-100 border border-gray-100 text-left hover:shadow-xl hover:border-violet-200 transition-all">
        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <p className="font-semibold text-gray-800">Tambah Transaksi</p>
        <p className="text-xs text-gray-400">Catat pemasukan/pengeluaran</p>
      </button>
      <button onClick={() => setShowOCRUpload(true)} className="group bg-white rounded-2xl p-4 lg:p-6 shadow-lg shadow-gray-100 border border-gray-100 text-left hover:shadow-xl hover:border-emerald-200 transition-all">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <p className="font-semibold text-gray-800">Scan Struk</p>
        <p className="text-xs text-gray-400">Upload foto untuk auto-fill</p>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-100 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800">FinanceTheory</h1>
                <p className="text-xs text-gray-400">Smart Money Manager</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as TabType); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-violet-100 text-violet-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate text-sm">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button onClick={signOut} className="p-2 text-gray-400 hover:text-rose-500 rounded-lg" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-gray-800">
                  {activeTab === 'home' && 'Beranda'}
                  {activeTab === 'dashboard' && 'Analytics'}
                  {activeTab === 'history' && 'Riwayat'}
                  {activeTab === 'profile' && 'Profil'}
                </h2>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleResetData} disabled={resetting} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50" title="Reset">
                {resetting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
              <button className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg relative">
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={() => setActiveTab('profile')} className="p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {activeTab === 'home' && <>{renderQuickActions()}{renderDashboard()}</>}
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'history' && <TransactionList onClose={() => setActiveTab('home')} onRefresh={fetchAllData} embedded />}
          {activeTab === 'profile' && <ProfileSettings onClose={() => setActiveTab('home')} embedded />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-2 z-40 lg:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as TabType)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === item.id ? 'text-violet-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showTransactionForm && (
        <TransactionForm onClose={() => { setShowTransactionForm(false); setOcrData(null) }} onSaved={() => { setShowTransactionForm(false); setOcrData(null); fetchAllData() }} initialData={ocrData} />
      )}
      {showOCRUpload && <OCRUpload onClose={() => setShowOCRUpload(false)} onComplete={handleOCRComplete} />}
    </div>
  )
}
