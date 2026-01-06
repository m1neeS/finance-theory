# 📚 Panduan Lengkap Backend Finance Theory

## 🏗️ Arsitektur Aplikasi

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                    (sudah dihapus, akan diganti)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP Request + JWT Token
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routers    │→ │   Services   │→ │   Supabase   │          │
│  │  (Endpoints) │  │(Business Logic)│ │  (Database)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Proxy untuk OCR
┌─────────────────────────────────────────────────────────────────┐
│                   HF-SPACE (Hugging Face)                       │
│                   OCR Service (Tesseract)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Folder

```
backend/
├── app/
│   ├── __init__.py          # Package marker
│   ├── main.py              # 🚀 Entry point aplikasi
│   ├── config.py            # ⚙️ Environment variables
│   ├── dependencies.py      # 🔐 Auth middleware
│   │
│   ├── routers/             # 🛣️ API Endpoints
│   │   ├── auth.py          # /api/auth/*
│   │   ├── transactions.py  # /api/transactions/*
│   │   ├── categories.py    # /api/categories/*
│   │   ├── dashboard.py     # /api/dashboard/*
│   │   └── ocr.py           # /api/ocr/*
│   │
│   ├── services/            # 💼 Business Logic
│   │   ├── supabase_client.py
│   │   ├── transaction_service.py
│   │   ├── category_service.py
│   │   ├── dashboard_service.py
│   │   └── ocr_service.py
│   │
│   └── schemas/             # 📋 Data Models (Pydantic)
│       ├── transaction.py
│       ├── dashboard.py
│       └── ocr.py
│
├── .env                     # Environment variables
└── requirements.txt         # Python dependencies
```

---

## 1️⃣ ENTRY POINT: `main.py`

File ini adalah titik awal aplikasi FastAPI.

```python
# Membuat instance FastAPI
app = FastAPI(
    title="FinanceTheory API",
    description="Personal Finance Tracker with AI OCR",
)

# CORS - Mengizinkan frontend mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # URL frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
)

# Register semua router (endpoints)
app.include_router(auth.router)
app.include_router(transactions.router)
# ... dst
```

### Konsep Penting:
- **FastAPI** = Framework Python untuk membuat REST API
- **CORS** = Cross-Origin Resource Sharing, izinkan frontend beda domain akses API
- **Middleware** = Kode yang dijalankan SEBELUM request sampai ke endpoint
- **Router** = Kumpulan endpoint yang dikelompokkan

---

## 2️⃣ KONFIGURASI: `config.py`

Membaca environment variables dari file `.env`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str           # URL Supabase project
    supabase_key: str           # Anon key (public)
    supabase_service_key: str   # Service key (admin, bypass RLS)
    
    class Config:
        env_file = ".env"       # Baca dari file .env

settings = Settings()  # Instance yang dipakai di seluruh app
```

### File `.env`:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3️⃣ AUTHENTICATION: `dependencies.py`

Middleware untuk verifikasi JWT token dari Supabase.

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()  # Mengambil token dari header "Authorization: Bearer xxx"

async def get_current_user(credentials = Depends(security)) -> dict:
    token = credentials.credentials
    
    # Verifikasi token ke Supabase
    response = supabase.auth.get_user(token)
    
    if response.user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return {
        "id": response.user.id,
        "email": response.user.email
    }
```

### Cara Pakai di Router:
```python
@router.get("/api/transactions")
async def list_transactions(current_user: dict = Depends(get_current_user)):
    # current_user berisi {"id": "uuid", "email": "user@email.com"}
    # Hanya user yang login bisa akses endpoint ini
    pass
```

---

## 4️⃣ SUPABASE CLIENT: `supabase_client.py`

Koneksi ke database Supabase.

```python
from supabase import create_client

def get_supabase_client():
    return create_client(settings.supabase_url, settings.supabase_key)

def get_supabase_admin_client():
    # Service key = bypass Row Level Security (RLS)
    return create_client(settings.supabase_url, settings.supabase_service_key)

supabase = get_supabase_admin_client()
```

### Kenapa pakai Service Key?
- **Anon Key** = Tunduk pada RLS (Row Level Security)
- **Service Key** = Bypass RLS, bisa akses semua data
- Backend sudah handle auth via JWT, jadi aman pakai service key

---

## 5️⃣ ROUTERS (API Endpoints)

### 5.1 Auth Router (`routers/auth.py`)

```python
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/me")
async def get_me(current_user = Depends(get_current_user)):
    """GET /api/auth/me - Ambil profil user yang login"""
    response = supabase.table("users").select("*").eq("id", current_user["id"]).execute()
    return response.data[0]

@router.post("/profile")
async def create_or_update_profile(profile: UserProfile, current_user = Depends(get_current_user)):
    """POST /api/auth/profile - Update profil user"""
    supabase.table("users").upsert({
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": profile.full_name
    }).execute()
```

### 5.2 Transactions Router (`routers/transactions.py`)

```python
router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("")
async def list_transactions(limit: int = 50, offset: int = 0, current_user = Depends(get_current_user)):
    """GET /api/transactions - List semua transaksi user"""
    return transaction_service.get_transactions(user_id=current_user["id"], limit=limit, offset=offset)

@router.post("", status_code=201)
async def create_transaction(data: TransactionCreate, current_user = Depends(get_current_user)):
    """POST /api/transactions - Buat transaksi baru"""
    return transaction_service.create_transaction(user_id=current_user["id"], data=data)

@router.get("/{transaction_id}")
async def get_transaction(transaction_id: UUID, current_user = Depends(get_current_user)):
    """GET /api/transactions/{id} - Ambil 1 transaksi"""
    pass

@router.put("/{transaction_id}")
async def update_transaction(transaction_id: UUID, data: TransactionUpdate, current_user = Depends(get_current_user)):
    """PUT /api/transactions/{id} - Update transaksi"""
    pass

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: UUID, current_user = Depends(get_current_user)):
    """DELETE /api/transactions/{id} - Hapus transaksi"""
    pass
```

### 5.3 Dashboard Router (`routers/dashboard.py`)

```python
@router.get("/api/dashboard/summary")
async def get_dashboard_summary(current_user = Depends(get_current_user)):
    """Ambil ringkasan: total balance, income, expense"""
    return dashboard_service.get_summary(user_id=current_user["id"])

@router.get("/api/dashboard/by-category")
async def get_category_breakdown(current_user = Depends(get_current_user)):
    """Ambil breakdown expense per kategori"""
    pass

@router.get("/api/dashboard/monthly-trend")
async def get_monthly_trend(months: int = 6, current_user = Depends(get_current_user)):
    """Ambil trend income vs expense per bulan"""
    pass
```

### 5.4 OCR Router (`routers/ocr.py`)

```python
@router.post("/api/ocr/process")
async def process_receipt(file: UploadFile, provider: str = "tesseract", current_user = Depends(get_current_user)):
    """
    Upload gambar struk → OCR → Extract data
    
    Returns:
        - amount: Total belanja
        - merchant_name: Nama toko
        - items: List item yang dibeli
        - transaction_date: Tanggal transaksi
    """
    content = await file.read()
    result = await ocr_service.process_receipt(
        user_id=current_user["id"],
        file_content=content,
        filename=file.filename,
        provider=provider
    )
    return result
```

---

## 6️⃣ SERVICES (Business Logic)

### 6.1 Transaction Service

```python
def create_transaction(user_id: str, data: TransactionCreate) -> dict:
    """Insert transaksi baru ke database"""
    transaction_data = {
        "user_id": user_id,
        "type": data.type,           # "income" atau "expense"
        "amount": float(data.amount),
        "description": data.description,
        "merchant_name": data.merchant_name,
        "transaction_date": str(data.transaction_date),
    }
    
    response = supabase.table("transactions").insert(transaction_data).execute()
    return response.data[0]


def get_transactions(user_id: str, limit: int, offset: int) -> List[dict]:
    """Ambil list transaksi dengan pagination"""
    response = supabase.table("transactions") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("transaction_date", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    return response.data
```

### 6.2 Dashboard Service

```python
def get_summary(user_id: str) -> dict:
    """Hitung total balance, income, expense"""
    response = supabase.table("transactions") \
        .select("type, amount") \
        .eq("user_id", user_id) \
        .execute()
    
    total_income = 0
    total_expense = 0
    
    for t in response.data:
        if t["type"] == "income":
            total_income += t["amount"]
        else:
            total_expense += t["amount"]
    
    return {
        "total_balance": total_income - total_expense,
        "total_income": total_income,
        "total_expense": total_expense
    }
```

### 6.3 OCR Service

```python
async def process_receipt(user_id, file_content, filename, provider):
    # 1. Upload gambar ke Supabase Storage
    receipt_url = await upload_receipt(user_id, file_content, filename)
    
    # 2. Jalankan OCR (Tesseract atau Google Vision)
    raw_text = await perform_ocr(file_content, provider)
    
    # 3. Extract data dari text
    amount = extract_amount(raw_text)      # Cari total belanja
    merchant = extract_merchant(raw_text)  # Cari nama toko
    items = extract_items(raw_text)        # Cari list item
    date = extract_date(raw_text)          # Cari tanggal
    
    return {
        "amount": amount,
        "merchant": merchant,
        "items": items,
        "date": date,
        "receipt_url": receipt_url
    }
```

---

## 7️⃣ SCHEMAS (Data Models)

Pydantic models untuk validasi data.

```python
# TransactionCreate - untuk input dari user
class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]  # Harus salah satu dari ini
    amount: Decimal = Field(..., gt=0)  # Harus > 0
    description: Optional[str] = Field(None, max_length=500)
    merchant_name: Optional[str] = None
    transaction_date: date = Field(default_factory=date.today)

# TransactionResponse - untuk output ke user
class TransactionResponse(BaseModel):
    id: UUID
    type: str
    amount: Decimal
    description: Optional[str]
    merchant_name: Optional[str]
    transaction_date: date
    created_at: datetime
```

### Kenapa pakai Pydantic?
1. **Validasi otomatis** - amount harus > 0, type harus "income"/"expense"
2. **Dokumentasi otomatis** - FastAPI generate Swagger docs dari schema
3. **Type safety** - IDE bisa autocomplete

---

## 8️⃣ FLOW REQUEST

### Contoh: User buat transaksi baru

```
1. Frontend kirim POST /api/transactions
   Headers: Authorization: Bearer <jwt_token>
   Body: {"type": "expense", "amount": 50000, "description": "Makan siang"}

2. main.py terima request
   ↓
3. CORS middleware check origin
   ↓
4. Router transactions.py handle endpoint
   ↓
5. dependencies.py verify JWT token → dapat user_id
   ↓
6. Schema TransactionCreate validasi body
   ↓
7. Service transaction_service.create_transaction() dipanggil
   ↓
8. Supabase insert ke table "transactions"
   ↓
9. Return TransactionResponse ke frontend
```

---

## 9️⃣ DATABASE SCHEMA (Supabase)

### Table: users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,  -- dari Supabase Auth
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: transactions
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT CHECK (type IN ('income', 'expense')),
    amount DECIMAL NOT NULL,
    description TEXT,
    merchant_name TEXT,
    transaction_date DATE,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### Table: categories
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),  -- NULL = default category
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔟 CARA MENJALANKAN

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Setup .env
cp .env.example .env
# Edit .env dengan credentials Supabase kamu

# 3. Jalankan server
uvicorn app.main:app --reload --port 8000

# 4. Buka docs
# http://localhost:8000/docs
```

---

## 📝 TIPS BELAJAR

1. **Mulai dari `main.py`** - Pahami bagaimana app di-setup
2. **Baca router** - Lihat endpoint apa saja yang tersedia
3. **Trace 1 flow** - Misal: POST /api/transactions dari awal sampai akhir
4. **Coba di Swagger** - Buka /docs dan test endpoint langsung
5. **Baca error** - FastAPI kasih error message yang jelas

---

## 🔗 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
