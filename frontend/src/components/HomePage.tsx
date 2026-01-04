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
  CreditCard, Settings, Trash2, RefreshCw
} from 'lucide-react'
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'

type TabType = 'home' | 'dashboard' | 'history' | 'profile'

const COLORS = ['#8B5CF6', '#EC4899', '#F97316', '#22C55E', '#06B6D4', '#6366F1', '#EAB308', '#14B8A6']

const CATEGORY_ICONS: Record<string, string> = {
  'makanan': '🍔', 'makan': '🍔', 'food': '🍔', 'transport': '🚗', 
  'transportasi': '🚗', 'belanja': '🛍️', 'shopping': '🛍️', 'tagihan': '📄',
  'hiburan': '🎬', 'kesehatan': '💊', 'pendidikan': '📚', 'gaji': '💰',
  'investasi': '📈', 'transfer': '💸', 'default': '📦'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const userName = user?.user_metadata?.display_name || 
                   user?.user_metadata?.full_name || 
                   user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [summaryRes, categoryRes, recentRes, trendRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.byCategory(),
        dashboardApi.recent(10),
        dashboardApi.monthlyTrend(6)
      ])
      setDashboardData({
        summary: summaryRes.data,
        categories: categoryRes.data || [],
        trend: trendRes.data || []
      })
      setRecentTx(recentRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount)
  }

  const formatShort = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`
    return amount.toString()
  }

  const handleOCRComplete = (result: any) => {
    setOcrData(result)
    setShowOCRUpload(false)
    setShowTransactionForm(true)
  }

  const handleResetData = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA transaksi?')) return
    try {
      setResetting(true)
      await transactionApi.deleteAll()
      await fetchAllData()
    } catch (err) {
      alert('Gagal menghapus data')
    } finally {
      setResetting(false)
    }
  }

  const savingsRate = dashboardData?.summary ? 
    Math.round(((dashboardData.summary.total_income - dashboardData.summary.total_expense) / dashboardData.summary.total_income) * 100) || 0 : 0

  const pieData = dashboardData?.categories?.map((cat: any, i: number) => ({
    name: cat.category_name,
    value: Number(cat.total_amount) || 0,
    color: COLORS[i % COLORS.length]
  })) || []

  // Sidebar Navigation
  const navItems = [
    { id: 'home', icon: Home, label: 'Beranda', color: 'violet' },
    { id: 'dashboard', icon: PieChart, label: 'Analytics', color: 'blue' },
    { id: 'history', icon: History, label: 'Riwayat', color: 'emerald' },
    { id: 'profile', icon: User, label: 'Profil', color: 'orange' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-violet-500/30 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-violet-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            <Sparkles className="w-8 h-8 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-400 font-medium">Memuat data...</p>
        </div>
      </div>
    )
  }

  // Main Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div 
          className={`relative overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white cursor-pointer transition-all duration-300 ${hoveredCard === 'balance' ? 'scale-[1.02] shadow-2xl shadow-violet-500/30' : ''}`}
          onMouseEnter={() => setHoveredCard('balance')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-white/80 text-sm">Total Balance</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(dashboardData?.summary?.total_balance || 0)}</p>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {savingsRate >= 0 ? '+' : ''}{savingsRate}% savings
              </span>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div 
          className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-slate-800 ${hoveredCard === 'income' ? 'scale-[1.02] border-emerald-500/50' : ''}`}
          onMouseEnter={() => setHoveredCard('income')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-sm font-medium">+12%</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Pemasukan</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.summary?.total_income || 0)}</p>
        </div>

        {/* Expense Card */}
        <div 
          className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-slate-800 ${hoveredCard === 'expense' ? 'scale-[1.02] border-rose-500/50' : ''}`}
          onMouseEnter={() => setHoveredCard('expense')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-rose-400" />
            </div>
            <span className="text-rose-400 text-sm font-medium">-8%</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Pengeluaran</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboardData?.summary?.total_expense || 0)}</p>
        </div>

        {/* Transactions Card */}
        <div 
          className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-slate-800 ${hoveredCard === 'tx' ? 'scale-[1.02] border-blue-500/50' : ''}`}
          onMouseEnter={() => setHoveredCard('tx')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-blue-400 text-sm font-medium">{recentTx.length}</span>
          </div>
          <p className="text-slate-400 text-sm mb-1">Transaksi</p>
          <p className="text-2xl font-bold text-white">Bulan Ini</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Trend Keuangan</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-400">Pemasukan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-slate-400">Pengeluaran</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.trend || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatShort} tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Kategori Pengeluaran</h3>
          {pieData.length > 0 ? (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.slice(0, 4).map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-slate-400">{getCategoryIcon(cat.name)} {cat.name}</span>
                    </div>
                    <span className="text-white font-medium">{formatShort(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500">
              <p>Belum ada data</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Transaksi Terbaru</h3>
          <button 
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-1 text-violet-400 text-sm font-medium hover:text-violet-300 transition-colors"
          >
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {recentTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3 font-medium">Transaksi</th>
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.slice(0, 5).map((tx: any) => (
                  <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.type === 'income' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                          {getCategoryIcon(tx.description || tx.merchant_name || '')}
                        </div>
                        <div>
                          <p className="text-white font-medium group-hover:text-violet-400 transition-colors">{tx.description || tx.merchant_name || 'Transaksi'}</p>
                          <p className="text-slate-500 text-xs">{tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-400 text-sm">
                      {new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs">{tx.category_name || 'Lainnya'}</span>
                    </td>
                    <td className={`py-4 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-slate-500">
            <Wallet className="w-12 h-12 mb-3 opacity-30" />
            <p>Belum ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  )

  // Quick Actions Panel
  const renderQuickActions = () => (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <button
        onClick={() => setShowTransactionForm(true)}
        className="group relative overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/20"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-7 h-7 text-white" />
          </div>
          <p className="text-xl font-bold text-white mb-1">Tambah Transaksi</p>
          <p className="text-white/70 text-sm">Catat pemasukan atau pengeluaran baru</p>
        </div>
      </button>
      
      <button
        onClick={() => setShowOCRUpload(true)}
        className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <p className="text-xl font-bold text-white mb-1">Scan Struk</p>
          <p className="text-white/70 text-sm">Upload foto untuk auto-fill data</p>
        </div>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-bold text-white">FinanceTheory</h1>
                  <p className="text-xs text-slate-400">Smart Money Manager</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-violet-500/20 text-violet-400' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-violet-400' : 'group-hover:text-violet-400'} transition-colors`} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                {activeTab === item.id && sidebarOpen && (
                  <div className="ml-auto w-2 h-2 bg-violet-400 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{userName}</p>
                  <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                </div>
              )}
              <button onClick={signOut} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {activeTab === 'home' && 'Beranda'}
                  {activeTab === 'dashboard' && 'Analytics'}
                  {activeTab === 'history' && 'Riwayat Transaksi'}
                  {activeTab === 'profile' && 'Pengaturan Profil'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleResetData}
                disabled={resetting}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-50"
                title="Reset Data"
              >
                {resetting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {activeTab === 'home' && (
            <>
              {renderQuickActions()}
              {renderDashboard()}
            </>
          )}
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'history' && (
            <TransactionList onClose={() => setActiveTab('home')} onRefresh={fetchAllData} embedded />
          )}
          {activeTab === 'profile' && (
            <ProfileSettings onClose={() => setActiveTab('home')} embedded />
          )}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modals */}
      {showTransactionForm && (
        <TransactionForm
          onClose={() => { setShowTransactionForm(false); setOcrData(null) }}
          onSaved={() => { setShowTransactionForm(false); setOcrData(null); fetchAllData() }}
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
