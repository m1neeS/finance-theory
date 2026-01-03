"""
Category Schemas
Pydantic models for category data validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CategoryCreate(BaseModel):
    """Schema for creating a custom category."""
    name: str = Field(..., min_length=1, max_length=50, description="Category name")
    icon: Optional[str] = Field("📁", max_length=10, description="Emoji icon")
    color: Optional[str] = Field("#6B7280", max_length=7, description="Hex color code")


class CategoryResponse(BaseModel):
    """Schema for category response."""
    id: UUID
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
