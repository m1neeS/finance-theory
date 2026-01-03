import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { 
  X, User, Mail, Save, Loader2, Camera, Shield, Bell, 
  Palette, ChevronRight, LogOut, Check
} from 'lucide-react'

interface ProfileSettingsProps {
  onClose: () => void
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

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
      
      const { error } = await supabase.auth.updateUser({
        data: { 
          display_name: displayName,
          full_name: displayName
        }
      })
      
      if (error) throw error
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving profile:', err)
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
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
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-violet-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-violet-100">
                      {getInitial()}
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-violet-500 hover:bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-gray-500 text-sm">Foto profil dari Google</p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Nama Tampilan
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white outline-none text-gray-800 transition-all"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-100 rounded-2xl text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email tidak dapat diubah</p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : success ? (
                    <>
                      <Check className="w-5 h-5" />
                      Tersimpan!
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pengaturan Lainnya</h3>
                
                {/* Settings Menu */}
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">Notifikasi</p>
                        <p className="text-sm text-gray-400">Atur preferensi notifikasi</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">Tampilan</p>
                        <p className="text-sm text-gray-400">Tema dan preferensi visual</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">Keamanan</p>
                        <p className="text-sm text-gray-400">Password dan autentikasi</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-4">Zona Berbahaya</h3>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      signOut()
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors text-rose-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
