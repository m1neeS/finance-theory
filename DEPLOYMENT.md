# 🚀 Panduan Deploy FinanceTheory

## Arsitektur Deployment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   FRONTEND      │────▶│    BACKEND      │────▶│   DATABASE      │
│   (Vercel)      │     │   (Railway)     │     │   (Supabase)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   React + Vite          FastAPI + OCR          PostgreSQL
   
   URL: *.vercel.app     URL: *.railway.app     URL: *.supabase.co
```

---

## STEP 1: Persiapan (5 menit)

### 1.1 Push ke GitHub
```bash
# Di folder project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/finance-theory.git
git push -u origin main
```

### 1.2 Buat file `.gitignore` (jika belum ada)
```
# Backend
venv/
__pycache__/
*.pyc
.env
*.jpg
*.jpeg
*.png

# Frontend
node_modules/
dist/
.env
```

---

## STEP 2: Deploy Backend ke Railway (10 menit)

### 2.1 Buat Akun Railway
1. Buka https://railway.app
2. Sign up dengan GitHub

### 2.2 Buat Project Baru
1. Klik "New Project"
2. Pilih "Deploy from GitHub repo"
3. Pilih repository `finance-theory`
4. Pilih folder `backend`

### 2.3 Tambah Environment Variables
Di Railway dashboard, klik "Variables" dan tambahkan:

```
SUPABASE_URL=https://ynguksitbxxdrqdmlexh.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (service key)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TESSERACT_CMD=/usr/bin/tesseract
```

### 2.4 Buat Dockerfile untuk Backend
Buat file `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ind \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.5 Buat railway.json
Buat file `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 2.6 Deploy
1. Push perubahan ke GitHub
2. Railway akan auto-deploy
3. Catat URL backend: `https://finance-theory-backend.railway.app`

---

## STEP 3: Deploy Frontend ke Vercel (5 menit)

### 3.1 Buat Akun Vercel
1. Buka https://vercel.com
2. Sign up dengan GitHub

### 3.2 Import Project
1. Klik "Add New" → "Project"
2. Import repository `finance-theory`
3. Pilih folder `frontend` sebagai Root Directory

### 3.3 Konfigurasi Build
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3.4 Tambah Environment Variables
```
VITE_SUPABASE_URL=https://ynguksitbxxdrqdmlexh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://finance-theory-backend.railway.app
```

### 3.5 Deploy
1. Klik "Deploy"
2. Tunggu selesai
3. URL frontend: `https://finance-theory.vercel.app`

---

## STEP 4: Update Supabase Auth (2 menit)

### 4.1 Tambah Redirect URL
1. Buka Supabase Dashboard
2. Authentication → URL Configuration
3. Tambah di "Redirect URLs":
   - `https://finance-theory.vercel.app`
   - `https://finance-theory.vercel.app/**`

### 4.2 Update Site URL
```
Site URL: https://finance-theory.vercel.app
```

---

## STEP 5: Update Frontend API URL

Update file `frontend/src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

---

## Checklist Deployment ✅

- [ ] Push code ke GitHub
- [ ] Deploy backend ke Railway
- [ ] Set environment variables di Railway
- [ ] Deploy frontend ke Vercel
- [ ] Set environment variables di Vercel
- [ ] Update Supabase redirect URLs
- [ ] Test login dengan Google
- [ ] Test semua fitur

---

## Troubleshooting

### Backend tidak bisa start
- Cek logs di Railway dashboard
- Pastikan semua environment variables sudah diset
- Pastikan Dockerfile sudah benar

### Frontend tidak bisa connect ke backend
- Cek CORS di backend (`app/main.py`)
- Pastikan `VITE_API_URL` sudah benar
- Cek Network tab di browser DevTools

### Google Login tidak bekerja
- Pastikan redirect URL sudah ditambah di Supabase
- Pastikan Site URL sudah diupdate

### OCR tidak bekerja
- Pastikan Tesseract terinstall di Docker
- Cek path Tesseract di environment variable

---

## Biaya Estimasi (Per Bulan)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $20/mo |
| Railway | $5 credit/mo | $5-20/mo |
| Supabase | 500MB DB, 2GB storage | $25/mo |

**Total: GRATIS** untuk development dan low traffic!

---

## Alternative: Deploy Semua ke Railway

Jika mau lebih simpel, bisa deploy frontend + backend ke Railway saja:

1. Buat 2 service di Railway:
   - `backend` (dari folder backend)
   - `frontend` (dari folder frontend, build static)

2. Untuk frontend, buat `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Quick Commands

```bash
# Build frontend locally
cd frontend && npm run build

# Test backend locally
cd backend && python -m uvicorn app.main:app --reload

# Check Railway logs
railway logs

# Check Vercel logs
vercel logs
```
