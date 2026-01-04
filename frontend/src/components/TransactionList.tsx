import { useState, useEffect } from 'react'
import { transactionApi } from '../lib/api'
import { 
  Calendar, Search, ChevronLeft, Trash2, Filter, RefreshCw
} from 'lucide-react'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  merchant_name: string
  transaction_date: string
  category_name: string
}

interface TransactionListProps {
  onClose: () => void
  onRefresh: () => void
  embedded?: boolean
}

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

export function TransactionList({ onClose, onRefresh, embedded = false }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await transactionApi.list(0, 100)
      setTransactions((response.data || []).map((t: any) => ({ ...t, amount: Number(t.amount) || 0 })))
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return
    try {
      setDeleting(id)
      await transactionApi.delete(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
      onRefresh()
    } catch (err) {
      alert('Gagal menghapus transaksi')
    } finally {
      setDeleting(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!t.description?.toLowerCase().includes(query) && !t.merchant_name?.toLowerCase().includes(query)) return false
    }
    if (startDate && t.transaction_date < startDate) return false
    if (endDate && t.transaction_date > endDate) return false
    return true
  })

  const groupedTransactions = filteredTransactions.reduce((groups, t) => {
    const date = t.transaction_date
    if (!groups[date]) groups[date] = []
    groups[date].push(t)
    return groups
  }, {} as Record<string, Transaction[]>)

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a))
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

  // Dark theme for embedded mode
  if (embedded) {
    return (
      <div className="space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex bg-slate-800/50 border border-slate-700/50 rounded-xl p-1">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterType === type ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'Semua' : type === 'income' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>
            <button onClick={fetchTransactions} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-violet-500 outline-none" />
          <span className="text-slate-500">sampai</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-violet-500 outline-none" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-emerald-400 text-sm mb-1">Total Pemasukan</p>
            <p className="text-emerald-400 font-bold text-2xl">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
            <p className="text-rose-400 text-sm mb-1">Total Pengeluaran</p>
            <p className="text-rose-400 font-bold text-2xl">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                    <th className="px-6 py-4 font-medium">Transaksi</th>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">Kategori</th>
                    <th className="px-6 py-4 font-medium text-right">Jumlah</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.flatMap(date => groupedTransactions[date].map((t) => (
                    <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                            {getCategoryIcon(t.description || t.merchant_name || '')}
                          </div>
                          <div>
                            <p className="text-white font-medium">{t.description || t.merchant_name || 'Transaksi'}</p>
                            <p className="text-slate-500 text-xs">{t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(t.transaction_date)}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs">{t.category_name || 'Lainnya'}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                          {deleting === t.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Light theme modal version
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-50 via-white to-cyan-50 z-50 overflow-hidden">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Semua Transaksi</h1>
            </div>
            <button onClick={fetchTransactions} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Cari transaksi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button key={type} onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === type ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                <span className="text-gray-400">-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-emerald-600 text-sm mb-1">Total Pemasukan</p>
            <p className="text-emerald-700 font-bold text-lg">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <p className="text-rose-600 text-sm mb-1">Total Pengeluaran</p>
            <p className="text-rose-700 font-bold text-lg">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Filter className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Tidak ada transaksi</p></div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-sm font-medium text-gray-500 px-2">{formatDate(date)}</span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <div className="space-y-2">
                  {groupedTransactions[date].map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                          {getCategoryIcon(t.description || t.merchant_name || '')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{t.description || t.merchant_name || 'Transaksi'}</p>
                          <p className="text-sm text-gray-400">{t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                        <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                          {deleting === t.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
