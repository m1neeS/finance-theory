from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, transactions, categories, dashboard, ocr

app = FastAPI(title="FinanceTheory API", description="Personal Finance Tracker with AI OCR")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(dashboard.router)
app.include_router(ocr.router)

@app.get("/")
def root():
    return {"message": "FinanceTheory API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
