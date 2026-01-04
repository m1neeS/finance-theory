import { useState, useRef, useCallback, useEffect } from 'react'
import { ocrApi } from '../lib/api'
import { X, Upload, Camera, Loader2, Image, CheckCircle, AlertCircle, Sparkles, Zap, SwitchCamera, Circle, ShoppingCart, Receipt, Check, Cpu, Cloud } from 'lucide-react'

interface ReceiptItem { name: string; quantity: number; price: number }
interface OCRResult { amount: number | null; merchant_name: string | null; transaction_date: string | null; items: ReceiptItem[]; receipt_url?: string; success: boolean; message: string; ocr_provider?: string }
interface OCRUploadProps { onClose: () => void; onComplete: (data: any) => void }
type Mode = 'select' | 'camera' | 'preview' | 'result'

export function OCRUpload({ onClose, onComplete }: OCRUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [mode, setMode] = useState<Mode>('select')
  const [cameraReady, setCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [ocrProvider, setOcrProvider] = useState<'tesseract' | 'google_vision'>('tesseract')
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => { ocrApi.getProvider().then(res => { const providers = res.data?.providers || []; const google = providers.find((p: any) => p.id === 'google_vision'); setGoogleAvailable(google?.available || false) }).catch(() => {}) }, [])

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) { setError('Hanya file gambar yang diperbolehkan'); return }
    if (selectedFile.size > 10 * 1024 * 1024) { setError('Ukuran file maksimal 10MB'); return }
    setFile(selectedFile); setError(''); setMode('preview')
    const reader = new FileReader(); reader.onload = (e) => setPreview(e.target?.result as string); reader.readAsDataURL(selectedFile)
  }

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover') }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]) }

  const startCamera = useCallback(async () => {
    setError(''); setMode('camera'); setCameraReady(false)
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setCameraReady(true) } }
    } catch { setError('Tidak dapat mengakses kamera'); setMode('select') }
  }, [facingMode])

  const stopCamera = useCallback(() => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }; setCameraReady(false) }, [])

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'; setFacingMode(newMode)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } } }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream } catch {}
  }, [facingMode])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current, canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => { if (blob) { const fname = 'capture_' + Date.now() + '.jpg'; setFile(new File([blob], fname, { type: 'image/jpeg' })); setPreview(canvas.toDataURL('image/jpeg')); stopCamera(); setMode('preview') } }, 'image/jpeg', 0.9)
  }, [stopCamera])

  const handleUpload = async () => {
    if (!file) return; setLoading(true); setError('')
    try {
      const response = await ocrApi.scan(file, ocrProvider)
      const result = response.data as OCRResult
      setOcrResult(result); setSelectedItems(new Set(result.items?.map((_, i) => i) || [])); setMode('result')
    } catch (err: any) { setError(err.response?.data?.detail || 'Gagal memproses gambar') }
    finally { setLoading(false) }
  }

  const toggleItem = (index: number) => { const newSelected = new Set(selectedItems); if (newSelected.has(index)) newSelected.delete(index); else newSelected.add(index); setSelectedItems(newSelected) }
  const calculateSelectedTotal = () => { if (!ocrResult?.items) return 0; return ocrResult.items.filter((_, i) => selectedItems.has(i)).reduce((sum, item) => sum + Number(item.price), 0) }
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  const resetToSelect = () => { stopCamera(); setFile(null); setPreview(null); setMode('select'); setError(''); setOcrResult(null) }
  const handleClose = () => { stopCamera(); onClose() }

  const tesseractClass = ocrProvider === 'tesseract' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'
  const googleClass = ocrProvider === 'google_vision' ? 'bg-white shadow text-violet-600' : 'text-gray-500'
  const dragClass = dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center"><Camera className="w-5 h-5 sm:w-6 sm:h-6" /></div>
              <div><h2 className="text-lg sm:text-xl font-bold">Scan Struk</h2><p className="text-xs sm:text-sm text-white/80">Upload atau foto struk</p></div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
          {mode === 'select' && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setOcrProvider('tesseract')} className={'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ' + tesseractClass}><Cpu className="w-4 h-4" /> Tesseract <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">Free</span></button>
              <button onClick={() => googleAvailable && setOcrProvider('google_vision')} disabled={!googleAvailable} className={'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ' + googleClass + (!googleAvailable ? ' opacity-50 cursor-not-allowed' : '')}><Cloud className="w-4 h-4" /> Google AI <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Pro</span></button>
            </div>
          )}
          {mode === 'select' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 sm:p-6 bg-gray-50 hover:bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-emerald-400 transition-all"><div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><Upload className="w-6 h-6 text-emerald-600" /></div><p className="font-semibold text-gray-700 text-sm">Upload File</p></button>
                <button onClick={startCamera} className="flex flex-col items-center gap-2 p-4 sm:p-6 bg-gray-50 hover:bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-violet-400 transition-all"><div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Camera className="w-6 h-6 text-violet-600" /></div><p className="font-semibold text-gray-700 text-sm">Buka Kamera</p></button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={'border-2 border-dashed rounded-xl p-4 text-center transition-all ' + dragClass}><p className="text-sm text-gray-400">{dragActive ? 'Lepaskan file' : 'Drag & drop file'}</p></div>
            </>
          )}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {!cameraReady && <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><Loader2 className="w-10 h-10 text-white animate-spin" /></div>}
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none" />
              </div>
              <div className="flex items-center justify-center gap-4">
                <button onClick={resetToSelect} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-600" /></button>
                <button onClick={capturePhoto} disabled={!cameraReady} className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg disabled:opacity-50"><Circle className="w-10 h-10 text-white fill-white" /></button>
                <button onClick={switchCamera} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full"><SwitchCamera className="w-6 h-6 text-gray-600" /></button>
              </div>
            </div>
          )}
          {mode === 'preview' && preview && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gray-100"><img src={preview} alt="Preview" className="w-full h-48 sm:h-64 object-contain" /><button onClick={resetToSelect} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white"><X className="w-4 h-4" /></button></div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl"><Image className="w-5 h-5 text-emerald-600" /><div className="flex-1 min-w-0"><p className="font-medium text-gray-800 truncate text-sm">{file?.name}</p><p className="text-xs text-gray-500">{((file?.size || 0) / 1024).toFixed(1)} KB</p></div><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
              <div className="flex gap-3">
                <button onClick={resetToSelect} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-600">Ulangi</button>
                <button onClick={handleUpload} disabled={!file || loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50">{loading ? <><Loader2 className="w-5 h-5 animate-spin" />Memproses...</> : <><Zap className="w-5 h-5" />Scan Struk</>}</button>
              </div>
            </div>
          )}
          {mode === 'result' && ocrResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Struk berhasil di-scan!</span>
                {ocrResult.ocr_provider && <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">{ocrResult.ocr_provider}</span>}
              </div>
              {ocrResult.merchant_name && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Merchant</p>
                  <p className="font-semibold text-gray-800">{ocrResult.merchant_name}</p>
                </div>
              )}
              {ocrResult.items && ocrResult.items.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Item Terdeteksi</p>
                    <button onClick={() => setSelectedItems(selectedItems.size === ocrResult.items.length ? new Set() : new Set(ocrResult.items.map((_, i) => i)))} className="text-xs text-emerald-600 hover:underline">{selectedItems.size === ocrResult.items.length ? 'Hapus Semua' : 'Pilih Semua'}</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {ocrResult.items.map((item, index) => {
                      const isSelected = selectedItems.has(index)
                      const itemClass = isSelected ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      const checkClass = isSelected ? 'bg-emerald-500' : 'bg-gray-200'
                      return (
                        <div key={index} onClick={() => toggleItem(index)} className={'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ' + itemClass}>
                          <div className={'w-5 h-5 rounded-md flex items-center justify-center ' + checkClass}>{isSelected && <Check className="w-3 h-3 text-white" />}</div>
                          <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>{item.quantity > 1 && <p className="text-xs text-gray-500">x{item.quantity}</p>}</div>
                          <p className="font-semibold text-gray-800 text-sm">{formatCurrency(item.price)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 text-sm">Item tidak terdeteksi</p>
                    <p className="text-xs text-amber-600 mt-1">Struk mungkin kurang jelas atau format tidak dikenali. Total akan digunakan langsung.</p>
                  </div>
                </div>
              )}
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">{ocrResult.items?.length > 0 ? 'Total (' + selectedItems.size + ' item dipilih)' : 'Total dari Struk'}</p>
                    <p className="text-2xl font-bold">{formatCurrency(ocrResult.items?.length > 0 ? calculateSelectedTotal() : (ocrResult.amount || 0))}</p>
                  </div>
                  <Receipt className="w-10 h-10 text-white/30" />
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
              <div className="flex gap-3">
                <button onClick={resetToSelect} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-600">Scan Ulang</button>
                <button onClick={() => onComplete({ amount: ocrResult.items?.length > 0 ? calculateSelectedTotal() : ocrResult.amount, merchant_name: ocrResult.merchant_name, transaction_date: ocrResult.transaction_date, items: ocrResult.items?.filter((_, i) => selectedItems.has(i)) || [], receipt_url: ocrResult.receipt_url })} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg"><Sparkles className="w-5 h-5" /> Lanjutkan</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}