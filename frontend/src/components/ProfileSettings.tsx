import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { 
  X, User, Mail, Save, Loader2, Camera, Shield, Bell, 
  Palette, ChevronRight, LogOut, Check, Globe
} from 'lucide-react'

interface ProfileSettingsProps {
  onClose: () => void
  embedded?: boolean
}

export function ProfileSettings({ onClose, embedded = false }: ProfileSettingsProps) {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setDisplayName(currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || '')
        setAvatarUrl(currentUser.user_metadata?.avatar_url || '')
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSuccess(false)
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName, full_name: displayName } })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert('Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const getInitial = () => {
    if (displayName) return displayName.charAt(0).toUpperCase()
    if (user?.email) return user.email.charAt(0).toUpperCase()
    return 'U'
  }

  // Dark theme embedded version
  if (embedded) {
    return (
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-xl mx-auto" />
                ) : (
                  <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl mx-auto border-4 border-white/30">
                    {getInitial()}
                  </div>
                )}
                <h2 className="mt-4 text-2xl font-bold text-white">{displayName || user?.email?.split('@')[0]}</h2>
                <p className="text-white/70 text-sm">{user?.email}</p>
              </div>
            </div>

            {/* Edit Profile Form */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Edit Profil</h3>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                  <User className="w-4 h-4" /> Nama Tampilan
                </label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Masukkan nama Anda"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/30 rounded-xl text-slate-500 cursor-not-allowed" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50">
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : 
                 success ? <><Check className="w-5 h-5" /> Tersimpan!</> : 
                 <><Save className="w-5 h-5" /> Simpan Perubahan</>}
              </button>
            </div>

            {/* Settings Menu */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <h3 className="text-lg font-semibold text-white p-6 pb-4">Pengaturan</h3>
              <div className="divide-y divide-slate-700/50">
                {[
                  { icon: Bell, label: 'Notifikasi', desc: 'Atur preferensi notifikasi', color: 'blue' },
                  { icon: Shield, label: 'Keamanan', desc: 'Password dan autentikasi', color: 'green' },
                  { icon: Palette, label: 'Tampilan', desc: 'Tema dan preferensi visual', color: 'purple' },
                  { icon: Globe, label: 'Bahasa', desc: 'Pilih bahasa aplikasi', color: 'cyan' },
                ].map((item, i) => (
                  <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 bg-${item.color}-500/20 rounded-xl flex items-center justify-center`}>
                        <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Logout */}
            <button onClick={signOut}
              className="w-full flex items-center justify-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-2xl transition-colors text-rose-400 font-medium">
              <LogOut className="w-5 h-5" /> Keluar dari Akun
            </button>
          </>
        )}
      </div>
    )
  }

  // Light theme modal version
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pengaturan Profil</h2>
                <p className="text-sm text-white/80">Kelola informasi akun Anda</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-violet-100 shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-violet-100">
                      {getInitial()}
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-violet-500 hover:bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2"><User className="w-4 h-4 text-gray-400" /> Nama Tampilan</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Masukkan nama Anda"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-gray-800 transition-all" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2"><Mail className="w-4 h-4 text-gray-400" /> Email</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-100 rounded-2xl text-gray-500 cursor-not-allowed" />
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all disabled:opacity-50">
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : success ? <><Check className="w-5 h-5" /> Tersimpan!</> : <><Save className="w-5 h-5" /> Simpan Perubahan</>}
                </button>
              </div>
              <div className="border-t border-gray-100 pt-6">
                <button onClick={() => { signOut(); onClose() }}
                  className="w-full flex items-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors text-rose-600">
                  <LogOut className="w-5 h-5" /><span className="font-medium">Keluar dari Akun</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
