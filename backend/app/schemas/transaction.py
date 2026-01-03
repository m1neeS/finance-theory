"""
Transaction Schemas
Pydantic models for transaction data validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""
    type: Literal["income", "expense"] = Field(..., description="Transaction type")
    amount: Decimal = Field(..., gt=0, description="Transaction amount")
    category_id: Optional[UUID] = Field(None, description="Category ID (optional)")
    description: Optional[str] = Field(None, max_length=500)
    merchant_name: Optional[str] = Field(None, max_length=200)
    transaction_date: date = Field(default_factory=date.today)
    receipt_url: Optional[str] = None


class TransactionUpdate(BaseModel):
    """Schema for updating an existing transaction. All fields optional."""
    type: Optional[Literal["income", "expense"]] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[UUID] = None
    description: Optional[str] = Field(None, max_length=500)
    merchant_name: Optional[str] = Field(None, max_length=200)
    transaction_date: Optional[date] = None
    receipt_url: Optional[str] = None


class TransactionResponse(BaseModel):
    """Schema for transaction response."""
    id: UUID
    type: str
    amount: Decimal
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    transaction_date: date
    receipt_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
