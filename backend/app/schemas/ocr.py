"""
OCR Schemas
Pydantic models for OCR processing.
"""

from pydantic import BaseModel
from typing import Optional, Literal, List
from decimal import Decimal
from datetime import date


class ReceiptItem(BaseModel):
    """Single item from receipt."""
    name: str
    quantity: int = 1
    unit_price: Optional[Decimal] = None
    total_price: Decimal


class OCRResult(BaseModel):
    """Extracted data from receipt image."""
    amount: Optional[Decimal] = None
    merchant_name: Optional[str] = None
    transaction_date: Optional[date] = None
    items: List[ReceiptItem] = []  # NEW: List of items from receipt
    subtotal: Optional[Decimal] = None  # NEW: Subtotal before tax/service
    tax: Optional[Decimal] = None  # NEW: Tax amount
    service_charge: Optional[Decimal] = None  # NEW: Service charge
    raw_text: Optional[str] = None
    confidence: float = 0.0
    receipt_url: Optional[str] = None
    success: bool = False
    message: str = ""
    ocr_provider: Optional[str] = None


class OCRProviderInfo(BaseModel):
    """Information about OCR provider configuration."""
    current_provider: Literal["tesseract", "google_vision"]
    is_paid: bool
    description: str
    google_vision_configured: bool
