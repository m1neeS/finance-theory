# 💰 Finance Theory

Personal finance tracker dengan fitur OCR untuk scan struk belanja otomatis.

![Finance Theory](https://img.shields.io/badge/Status-Live-brightgreen)
![Python](https://img.shields.io/badge/Backend-Python%20FastAPI-blue)
![React](https://img.shields.io/badge/Frontend-React%20TypeScript-61dafb)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ecf8e)

## 🌐 Live Demo

- **Frontend:** [finance-theory.vercel.app](https://finance-theory.vercel.app)
- **API:** [m1nees-finance-theory-api.hf.space](https://m1nees-finance-theory-api.hf.space)

## ✨ Fitur

- 📊 **Dashboard** - Ringkasan keuangan dengan grafik interaktif
- 💸 **Transaksi** - Catat pemasukan & pengeluaran
- 📸 **OCR Scan** - Upload struk, otomatis extract nominal & tanggal
- 🏷️ **Kategori** - Organisasi transaksi per kategori
- 🔐 **Auth** - Login via Google atau Email (Supabase Auth)
- 📱 **Responsive** - Tampilan optimal di desktop & mobile

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **OCR:** Tesseract OCR
- **Hosting:** Hugging Face Spaces

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query
- **Charts:** Recharts
- **Hosting:** Vercel

## 📁 Struktur Project

```
finance-theory/
├── backend/          # FastAPI backend (local dev)
├── frontend/         # React frontend
├── hf-space/         # Backend untuk Hugging Face deployment
└── DEPLOYMENT.md     # Panduan deployment
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase account

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env   # Edit dengan credentials kamu
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env   # Edit dengan credentials kamu
npm run dev
```

## 🔒 Security

- JWT Authentication via Supabase
- Row Level Security (RLS) di database
- Rate limiting pada API endpoints
- CORS strict policy
- Security headers (X-Frame-Options, XSS Protection, dll)

## 📸 Screenshots

| Dashboard | Transaksi | OCR Scan |
|-----------|-----------|----------|
| ![Dashboard](docs/dashboard.png) | ![Transactions](docs/transactions.png) | ![OCR](docs/ocr.png) |

## 👨‍💻 Development

### Backend by Human
Backend API, database design, dan business logic dikembangkan secara manual.

### Frontend with AI Assistance
Frontend UI dikembangkan dengan bantuan AI (Kiro) untuk mempercepat development komponen React dan styling.

## 📄 License

MIT License - Silakan gunakan untuk project pribadi atau komersial.

## 🤝 Contributing

Pull requests welcome! Untuk perubahan besar, buka issue dulu untuk diskusi.

---

Made with ☕ by [m1nees](https://github.com/m1nees)
