import { useState, useEffect } from 'react'
import { transactionApi, categoryApi } from '../lib/api'
import { X, Loader2, Wallet, TrendingUp, TrendingDown, Calendar, FileText, Tag, Sparkles } from 'lucide-react'

interface TransactionFormProps {
  onClose: () => void
  onSaved: () => void
  initialData?: {
    amount?: number
    merchant_name?: string
    transaction_date?: string
    receipt_url?: string
  }
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  is_default: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  'makanan': '🍔', 'food': '🍔', 'makan': '🍔',
  'transportasi': '🚗', 'transport': '🚗',
  'belanja': '🛍️', 'shopping': '🛍️',
  'tagihan': '📄', 'bills': '📄',
  'hiburan': '🎬', 'entertainment': '🎬',
  'kesehatan': '💊', 'health': '💊',
  'pendidikan': '📚', 'education': '📚',
  'gaji': '💰', 'salary': '💰',
  'investasi': '📈', 'investment': '📈',
  'lainnya': '📦', 'others': '📦', 'other': '📦'
}

export function TransactionForm({ onClose, onSaved, initialData }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: initialData?.amount?.toString() || '',
    category_id: '',
    description: initialData?.merchant_name || '',
    merchant_name: initialData?.merchant_name || '',
    transaction_date: initialData?.transaction_date || new Date().toISOString().split('T')[0],
    receipt_url: initialData?.receipt_url || '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.list()
      if (response.data && response.data.length > 0) {
        setCategories(response.data)
        if (!formData.category_id && response.data.length > 0) {
          setFormData(prev => ({ ...prev, category_id: response.data[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const submitData: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        merchant_name: formData.merchant_name,
        transaction_date: formData.transaction_date,
        receipt_url: formData.receipt_url || null,
      }
      
      if (formData.category_id && formData.category_id.length > 10) {
        submitData.category_id = formData.category_id
      }
      
      await transactionApi.create(submitData)
      onSaved()
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail
      if (typeof errorDetail === 'string') {
        setError(errorDetail)
      } else if (Array.isArray(errorDetail)) {
        setError(errorDetail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', '))
      } else if (typeof errorDetail === 'object') {
        setError(JSON.stringify(errorDetail))
      } else {
        setError('Gagal menyimpan transaksi')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = value.replace(/\D/g, '')
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase()
    // Check exact match first
    if (CATEGORY_ICONS[lower]) return CATEGORY_ICONS[lower]
    // Then check partial match
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
      if (lower.includes(key) || key.includes(lower)) return icon
    }
    return '📦'
  }

  const filteredCategories = categories.filter(cat => {
    const incomeCategories = ['Gaji', 'Investasi', 'Lainnya', 'Salary', 'Investment', 'Others']
    const isIncomeCategory = incomeCategories.some(name => 
      cat.name.toLowerCase().includes(name.toLowerCase())
    )
    return formData.type === 'income' ? isIncomeCategory : !isIncomeCategory || cat.name.toLowerCase().includes('lainnya') || cat.name.toLowerCase().includes('others')
  })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className={`p-6 ${formData.type === 'expense' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} text-white`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {formData.type === 'expense' ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {initialData ? 'Konfirmasi Transaksi' : 'Tambah Transaksi'}
                </h2>
                <p className="text-sm text-white/80">Catat pemasukan atau pengeluaran</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-medium transition-all ${
                formData.type === 'expense'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-medium transition-all ${
                formData.type === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Pemasukan
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <Wallet className="w-4 h-4 text-gray-400" />
              Jumlah
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
              <input
                type="text"
                value={formatCurrency(formData.amount)}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  amount: e.target.value.replace(/\D/g, '') 
                }))}
                placeholder="0"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white outline-none text-2xl font-bold text-gray-800 transition-all"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Kategori
            </label>
            {categories.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category_id: cat.id }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      formData.category_id === cat.id
                        ? 'bg-violet-100 border-2 border-violet-500 shadow-lg shadow-violet-100'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{getCategoryIcon(cat.name)}</span>
                    <span className="text-xs text-gray-500 text-center leading-tight">{cat.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 p-4 bg-gray-50 rounded-xl text-center">
                Memuat kategori...
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Deskripsi
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Contoh: Makan siang di warung"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white outline-none text-gray-800 transition-all placeholder:text-gray-400"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Tanggal
            </label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white outline-none text-gray-800 transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-rose-600 text-sm flex items-center gap-2">
              <X className="w-5 h-5 flex-shrink-0" />
              <span>{String(error)}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white transition-all ${
              formData.type === 'expense'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
            } disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Simpan {formData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
