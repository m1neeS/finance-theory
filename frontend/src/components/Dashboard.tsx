import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi, transactionApi } from '../lib/api'
import { TransactionForm } from './TransactionForm.tsx'
import { TransactionList } from './TransactionList.tsx'
import { ProfileSettings } from './ProfileSettings.tsx'
import { OCRUpload } from './OCRUpload.tsx'
import { 
  Wallet, TrendingUp, Plus, Camera, LogOut, 
  ArrowUpRight, ArrowDownRight, Sparkles, PiggyBank, CreditCard,
  ChevronRight, Bell, Settings, Trash2, RefreshCw
} from 'lucide-react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'

interface DashboardData {
  summary: {
    total_balance: number
    total_income: number
    total_expense: number
    month: number
    year: number
  }
  categoryBreakdown: Array<{
    category_name: string
    total_amount: number
    percentage: number
    color: string
  }>
  recentTransactions: Array<{
    id: string
    type: 'income' | 'expense'
    amount: number
    description: string
    merchant_name: string
    transaction_date: string
    category_name: string
  }>
  monthlyTrend: Array<{
    month: string
    income: number
    expense: number
  }>
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6']

const CATEGORY_ICONS: Record<string, string> = {
  'makanan': '🍔', 'makan': '🍔', 'food': '🍔',
  'transport': '🚗', 'transportasi': '🚗',
  'belanja': '🛍️', 'shopping': '🛍️',
  'tagihan': '📄', 'bills': '📄',
  'hiburan': '🎬', 'entertainment': '🎬',
  'kesehatan': '💊', 'health': '💊',
  'pendidikan': '📚', 'education': '📚',
  'gaji': '💰', 'salary': '💰',
  'investasi': '📈', 'investment': '📈',
  'transfer': '💸', 'breadtalk': '🥐',
  'default': '📦'
}

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return CATEGORY_ICONS.default
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showOCRUpload, setShowOCRUpload] = useState(false)
  const [showTransactionList, setShowTransactionList] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [ocrData, setOcrData] = useState<any>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      console.log('Fetching dashboard data...')
      const [summaryRes, categoryRes, recentRes, trendRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.byCategory(),
        dashboardApi.recent(5),
        dashboardApi.monthlyTrend(6)
      ])
      const summary = summaryRes.data
      console.log('Dashboard summary:', summary)
      console.log('Recent transactions:', recentRes.data)
      setData({
        summary: {
          total_balance: Number(summary.total_balance) || 0,
          total_income: Number(summary.total_income) || 0,
          total_expense: Number(summary.total_expense) || 0,
          month: summary.month,
          year: summary.year
        },
        categoryBreakdown: (categoryRes.data || []).map((cat: any) => ({
          ...cat,
          total_amount: Number(cat.total_amount) || 0
        })),
        recentTransactions: (recentRes.data || []).map((t: any) => ({
          ...t,
          amount: Number(t.amount) || 0
        })),
        monthlyTrend: trendRes.data || []
      })
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}jt`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}rb`
    return amount.toString()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const handleOCRComplete = (result: any) => {
    setOcrData(result)
    setShowOCRUpload(false)
    setShowTransactionForm(true)
  }

  const handleResetData = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA transaksi? Tindakan ini tidak dapat dibatalkan!')) return
    try {
      setResetting(true)
      await transactionApi.deleteAll()
      await fetchDashboard()
    } catch (err) {
      console.error('Error resetting data:', err)
      alert('Gagal menghapus data')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-violet-200 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-violet-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            <Sparkles className="w-8 h-8 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-500 font-medium">Memuat data keuangan...</p>
        </div>
      </div>
    )
  }

  const pieData = data?.categoryBreakdown?.map((cat, index) => ({
    name: cat.category_name,
    value: cat.total_amount,
    color: COLORS[index % COLORS.length],
    percentage: cat.percentage
  })) || []

  const savingsRate = data?.summary ? 
    Math.round(((data.summary.total_income - data.summary.total_expense) / data.summary.total_income) * 100) || 0 : 0

  // Calculate percentage change from monthly trend
  const getPercentageChange = (type: 'income' | 'expense') => {
    if (!data?.monthlyTrend || data.monthlyTrend.length < 2) return null
    const current = data.monthlyTrend[data.monthlyTrend.length - 1]
    const previous = data.monthlyTrend[data.monthlyTrend.length - 2]
    const currentVal = type === 'income' ? current.income : current.expense
    const previousVal = type === 'income' ? previous.income : previous.expense
    if (previousVal === 0) return currentVal > 0 ? 100 : 0
    return Math.round(((currentVal - previousVal) / previousVal) * 100)
  }

  const incomeChange = getPercentageChange('income')
  const expenseChange = getPercentageChange('expense')

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50">
      {/* Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full opacity-50 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-gray-100 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">FinanceTheory</h1>
                <p className="text-xs text-gray-400">Smart Money Manager</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetData}
                disabled={resetting}
                className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                title="Reset Semua Data"
              >
                {resetting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
              <button className="p-2.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowProfileSettings(true)}
                className="p-2.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-xl transition-all"
                title="Pengaturan"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-2"></div>
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {(user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email)?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-600 max-w-[120px] truncate hidden sm:block font-medium">{user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={signOut}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Halo, <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span> 👋
          </h2>
          <p className="text-gray-500">Berikut ringkasan keuangan Anda hari ini</p>
        </div>

        {/* Main Balance Card */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl blur-xl opacity-30"></div>
          <div className="relative bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl p-8 text-white overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4"></div>
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-5 h-5 opacity-80" />
                  <span className="text-white/80 text-sm font-medium">Total Balance</span>
                </div>
                <p className="text-4xl lg:text-5xl font-bold mb-4">
                  {formatCurrency(data?.summary?.total_balance || 0)}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatShortCurrency(data?.summary?.total_income || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatShortCurrency(data?.summary?.total_expense || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Savings Rate Circle */}
              <div className="flex items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                    <circle 
                      cx="56" cy="56" r="48" fill="none" 
                      stroke="white" strokeWidth="10" 
                      strokeLinecap="round"
                      strokeDasharray={`${savingsRate * 3.02} 302`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{savingsRate}%</span>
                    <span className="text-xs opacity-80">Savings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowTransactionForm(true)}
            className="group relative overflow-hidden bg-white rounded-2xl p-5 text-left shadow-lg shadow-gray-200/50 border border-gray-100 transition-all hover:shadow-xl hover:shadow-violet-200/50 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-violet-500/30">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-gray-800 text-lg">Tambah Transaksi</p>
              <p className="text-gray-400 text-sm">Catat pemasukan atau pengeluaran</p>
            </div>
          </button>
          
          <button
            onClick={() => setShowOCRUpload(true)}
            className="group relative overflow-hidden bg-white rounded-2xl p-5 text-left shadow-lg shadow-gray-200/50 border border-gray-100 transition-all hover:shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-gray-800 text-lg">Scan Struk</p>
              <p className="text-gray-400 text-sm">Upload foto untuk auto-fill</p>
            </div>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Income Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Pemasukan</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.summary?.total_income || 0)}</p>
                </div>
              </div>
              {incomeChange !== null && (
                <div className={`px-3 py-1.5 rounded-full ${incomeChange >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <span className={`text-sm font-semibold ${incomeChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {incomeChange >= 0 ? '+' : ''}{incomeChange}%
                  </span>
                </div>
              )}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full" style={{ width: `${Math.min(100, savingsRate > 0 ? 75 : 50)}%` }}></div>
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.summary?.total_expense || 0)}</p>
                </div>
              </div>
              {expenseChange !== null && (
                <div className={`px-3 py-1.5 rounded-full ${expenseChange <= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <span className={`text-sm font-semibold ${expenseChange <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {expenseChange >= 0 ? '+' : ''}{expenseChange}%
                  </span>
                </div>
              )}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-400 to-red-500 rounded-full" style={{ width: `${Math.min(100, data?.summary?.total_income ? Math.round((data.summary.total_expense / data.summary.total_income) * 100) : 0)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Spending by Category */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Pengeluaran per Kategori</h3>
            </div>
            {pieData.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={3} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.slice(0, 5).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-gray-600 text-sm">{getCategoryIcon(entry.name)} {entry.name}</span>
                      </div>
                      <span className="text-gray-800 text-sm font-semibold">{formatShortCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400">
                <CreditCard className="w-12 h-12 mb-3 opacity-30" />
                <p>Belum ada data pengeluaran</p>
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Trend Bulanan</h3>
            </div>
            {data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatShortCurrency} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGradient)" />
                    <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400">
                <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
                <p>Belum ada data trend</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 text-lg">Transaksi Terbaru</h3>
            <button 
              onClick={() => setShowTransactionList(true)}
              className="flex items-center gap-1 text-violet-600 text-sm font-medium hover:text-violet-700 transition-colors"
            >
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      t.type === 'income' 
                        ? 'bg-emerald-100' 
                        : 'bg-rose-100'
                    }`}>
                      {getCategoryIcon(t.description || t.merchant_name || '')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-violet-600 transition-colors">
                        {t.description || t.merchant_name || 'Transaksi'}
                      </p>
                      <p className="text-sm text-gray-400">{formatDate(t.transaction_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-gray-400">{t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
              <Wallet className="w-12 h-12 mb-3 opacity-30" />
              <p>Belum ada transaksi</p>
            </div>
          )}
        </div>
      </main>

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
            fetchDashboard()
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

      {showTransactionList && (
        <TransactionList
          onClose={() => setShowTransactionList(false)}
          onRefresh={fetchDashboard}
        />
      )}

      {showProfileSettings && (
        <ProfileSettings
          onClose={() => setShowProfileSettings(false)}
        />
      )}
    </div>
  )
}
