# 🚀 Panduan Deploy Finance Theory

## Arsitektur Deployment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   FRONTEND      │────▶│    BACKEND      │────▶│   DATABASE      │
│   (Vercel)      │     │ (HuggingFace)   │     │   (Supabase)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   React + Vite          FastAPI + OCR          PostgreSQL
```

---

## STEP 1: Setup Supabase

### 1.1 Buat Project Supabase
1. Buka https://supabase.com
2. Buat project baru
3. Catat credentials:
   - Project URL
   - Anon Key (untuk frontend)
   - Service Key (untuk backend - RAHASIA!)

### 1.2 Buat Tabel Database
Jalankan SQL di Supabase SQL Editor (lihat schema di dokumentasi).

### 1.3 Setup Google OAuth
1. Buat project di Google Cloud Console
2. Enable Google+ API
3. Buat OAuth credentials
4. Di Supabase: Authentication → Providers → Google → Enable

---

## STEP 2: Deploy Backend ke Hugging Face Spaces

### 2.1 Buat Space Baru
1. Buka https://huggingface.co
2. Klik "New Space" → SDK: Docker

### 2.2 Setup Secrets di HF Space
Settings → Repository secrets:
- `SUPABASE_URL` = (URL Supabase kamu)
- `SUPABASE_KEY` = (Anon key)
- `SUPABASE_SERVICE_KEY` = (Service key - RAHASIA!)
- `ENVIRONMENT` = production

### 2.3 Push Backend
```bash
cd hf-space
git add .
git commit -m "Deploy"
git push
```

---

## STEP 3: Deploy Frontend ke Vercel

### 3.1 Import Project
1. Buka https://vercel.com
2. Import dari GitHub
3. Root Directory: `frontend`

### 3.2 Environment Variables
```
VITE_SUPABASE_URL = (URL Supabase kamu)
VITE_SUPABASE_ANON_KEY = (Anon key kamu)
VITE_API_URL = (URL HF Space kamu)
```

---

## STEP 4: Konfigurasi Supabase Auth

Di Supabase Dashboard → Authentication → URL Configuration:
- Site URL: (URL Vercel kamu)
- Redirect URLs: (URL Vercel kamu)/**

---

## Security Checklist

- Service key HANYA di backend (HF Secrets)
- Anon key di frontend (aman, publishable)
- RLS enabled di semua tabel
- CORS strict
- HTTPS everywhere

---

## Biaya

| Service | Free Tier |
|---------|-----------|
| Vercel | 100GB bandwidth |
| HuggingFace | 2 vCPU, 16GB RAM |
| Supabase | 500MB DB |

Total: GRATIS untuk low-medium traffic!
