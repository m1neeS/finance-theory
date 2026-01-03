import { useState, useRef, useCallback } from 'react'
import { ocrApi } from '../lib/api'
import { X, Upload, Camera, Loader2, Image, CheckCircle, AlertCircle, Sparkles, Zap, SwitchCamera, Circle } from 'lucide-react'

interface OCRUploadProps {
  onClose: () => void
  onComplete: (data: any) => void
}

type Mode = 'select' | 'camera' | 'preview'

export function OCRUpload({ onClose, onComplete }: OCRUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [mode, setMode] = useState<Mode>('select')
  const [cameraReady, setCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB')
      return
    }
    setFile(selectedFile)
    setError('')
    setMode('preview')
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const startCamera = useCallback(async () => {
    setError('')
    setMode('camera')
    setCameraReady(false)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraReady(true)
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.')
      setMode('select')
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Switch camera error:', err)
    }
  }, [facingMode])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setFile(capturedFile)
        setPreview(canvas.toDataURL('image/jpeg'))
        stopCamera()
        setMode('preview')
      }
    }, 'image/jpeg', 0.9)
  }, [stopCamera])

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const response = await ocrApi.scan(file)
      onComplete({
        amount: response.data.amount,
        merchant_name: response.data.merchant_name,
        transaction_date: response.data.transaction_date,
        receipt_url: response.data.receipt_url
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal memproses gambar')
    } finally {
      setLoading(false)
    }
  }

  const resetToSelect = () => {
    stopCamera()
    setFile(null)
    setPreview(null)
    setMode('select')
    setError('')
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Scan Struk</h2>
                <p className="text-sm text-white/80">{mode === 'camera' ? 'Arahkan kamera ke struk' : 'Upload atau foto struk'}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {mode === 'select' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 transition-all">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">Upload File</p>
                    <p className="text-xs text-gray-400">Pilih dari galeri</p>
                  </div>
                </button>
                <button onClick={startCamera} className="flex flex-col items-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 rounded-2xl border-2 border-gray-200 hover:border-violet-400 transition-all">
                  <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Camera className="w-7 h-7 text-violet-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">Buka Kamera</p>
                    <p className="text-xs text-gray-400">Foto langsung</p>
                  </div>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <p className="text-sm text-gray-400">{dragActive ? 'Lepaskan file di sini' : 'Atau drag & drop file di sini'}</p>
                <p className="text-xs text-gray-300 mt-1">JPG, PNG, JPEG - Maks 10MB</p>
              </div>
            </>
          )}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                )}
                <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button onClick={resetToSelect} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
                <button onClick={capturePhoto} disabled={!cameraReady} className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
                  <Circle className="w-10 h-10 text-white fill-white" />
                </button>
                <button onClick={switchCamera} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <SwitchCamera className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {mode === 'preview' && preview && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                <img src={preview} alt="Preview" className="w-full h-64 object-contain" />
                <button onClick={resetToSelect} className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-xl text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Image className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{file?.name}</p>
                  <p className="text-sm text-gray-500">{((file?.size || 0) / 1024).toFixed(1)} KB</p>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={resetToSelect} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-medium text-gray-600 transition-colors">Ulangi</button>
                <button onClick={handleUpload} disabled={!file || loading} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5">
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Memproses...</>) : (<><Zap className="w-5 h-5" />Scan Struk</>)}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {mode === 'select' && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-medium text-violet-700">Tips untuk hasil terbaik</p>
              </div>
              <ul className="text-sm text-violet-600 space-y-1">
                <li>- Pastikan foto struk jelas dan tidak blur</li>
                <li>- Hindari bayangan atau pantulan cahaya</li>
                <li>- Foto seluruh struk dari atas ke bawah</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
