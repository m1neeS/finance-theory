"""
Dashboard Schemas
Pydantic models for dashboard and report data.
"""

from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from uuid import UUID
from datetime import date


class DashboardSummary(BaseModel):
    """Summary of user's financial status."""
    total_balance: Decimal
    total_income: Decimal
    total_expense: Decimal
    month: int
    year: int


class CategoryBreakdown(BaseModel):
    """Spending breakdown by category."""
    category_id: Optional[UUID] = None
    category_name: str
    total_amount: Decimal
    percentage: float
    color: Optional[str] = None


class DailyTrend(BaseModel):
    """Daily spending trend data point."""
    date: date
    income: Decimal
    expense: Decimal


class MonthlyReport(BaseModel):
    """Complete monthly financial report."""
    month: int
    year: int
    total_income: Decimal
    total_expense: Decimal
    net_balance: Decimal
    category_breakdown: List[CategoryBreakdown]
    daily_trend: List[DailyTrend]
