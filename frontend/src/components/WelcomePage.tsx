import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  Wallet, Sparkles, TrendingUp, Camera, Target, 
  ChevronRight, Star, Zap, Shield, PiggyBank,
  ArrowRight, CheckCircle2
} from 'lucide-react'

interface WelcomePageProps {
  onComplete: () => void
}

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    // Auto advance through welcome animation
    const timer = setTimeout(() => {
      setAnimating(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const userName = user?.user_metadata?.display_name || 
                   user?.user_metadata?.full_name || 
                   user?.email?.split('@')[0] || 'User'

  const features = [
    {
      icon: TrendingUp,
      title: 'Pantau Keuangan',
      description: 'Lihat pemasukan & pengeluaran secara real-time',
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-100'
    },
    {
      icon: Camera,
      title: 'Scan Struk Otomatis',
      description: 'Foto struk, data terisi otomatis dengan AI',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-100'
    },
    {
      icon: Target,
      title: 'Capai Target',
      description: 'Set budget & pantau progress tabungan',
      color: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-100'
    },
    {
      icon: Shield,
      title: 'Aman & Privat',
      description: 'Data terenkripsi, hanya kamu yang bisa akses',
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-100'
    }
  ]

  if (animating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center">
                <Wallet className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
              <Sparkles className="w-4 h-4 text-yellow-800" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in">
            Selamat Datang!
          </h1>
          <p className="text-white/80 text-lg animate-fade-in-delay">
            Menyiapkan dashboard untuk Anda...
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet-200 to-pink-200 rounded-full opacity-60 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full opacity-60 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-100 to-violet-100 rounded-full opacity-30 blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">FinanceTheory</h1>
              <p className="text-xs text-gray-400">Smart Money Manager</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pb-6 flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col justify-center animate-fade-in">
              {/* Welcome Message */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full mb-6">
                  <Star className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-medium text-violet-600">Welcome aboard!</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                  Halo, <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{userName}</span>! 👋
                </h2>
                <p className="text-gray-500 text-lg max-w-md mx-auto">
                  Siap untuk mengelola keuangan dengan lebih cerdas?
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-12">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-3`}>
                      <feature.icon className={`w-6 h-6 bg-gradient-to-br ${feature.color} bg-clip-text text-violet-600`} />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  onClick={() => setStep(1)}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-all hover:-translate-y-1"
                >
                  <span>Mulai Sekarang</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col justify-center animate-fade-in">
              {/* Quick Tips */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full mb-6">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">Tips Cepat</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  3 Langkah Mudah
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Mulai kelola keuangan dalam hitungan detik
                </p>
              </div>

              {/* Steps */}
              <div className="max-w-md mx-auto space-y-4 mb-12">
                {[
                  { num: 1, title: 'Catat Transaksi', desc: 'Tambah pemasukan atau pengeluaran', icon: PiggyBank },
                  { num: 2, title: 'Scan Struk', desc: 'Foto struk untuk input otomatis', icon: Camera },
                  { num: 3, title: 'Pantau Progress', desc: 'Lihat analisis & capai target', icon: TrendingUp }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg animate-slide-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-500/30">
                      {item.num}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{item.title}</h3>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                    <item.icon className="w-6 h-6 text-gray-300" />
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center space-y-4">
                <button
                  onClick={onComplete}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-all hover:-translate-y-1"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Masuk ke Dashboard</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-sm text-gray-400">
                  Kamu bisa kembali ke tips ini kapan saja
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
