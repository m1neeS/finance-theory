"""
Dashboard Router
API endpoints for dashboard and reports.
"""

from fastapi import APIRouter, Depends, Query
from typing import List

from app.dependencies import get_current_user
from app.schemas.dashboard import DashboardSummary, CategoryBreakdown, MonthlyReport
from app.schemas.transaction import TransactionResponse
from app.services import dashboard_service, report_service

router = APIRouter(tags=["Dashboard & Reports"])


@router.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    """Get financial summary for current month (balance, income, expense)."""
    summary = dashboard_service.get_summary(user_id=current_user["id"])
    return summary


@router.get("/api/dashboard/by-category", response_model=List[CategoryBreakdown])
async def get_category_breakdown(current_user: dict = Depends(get_current_user)):
    """Get expense breakdown by category for current month."""
    breakdown = dashboard_service.get_category_breakdown(user_id=current_user["id"])
    return breakdown


@router.get("/api/dashboard/recent", response_model=List[TransactionResponse])
async def get_recent_transactions(
    limit: int = Query(5, ge=1, le=20, description="Number of transactions"),
    current_user: dict = Depends(get_current_user)
):
    """Get most recent transactions for dashboard display."""
    transactions = dashboard_service.get_recent_transactions(
        user_id=current_user["id"],
        limit=limit
    )
    return transactions


@router.get("/api/dashboard/monthly-trend")
async def get_monthly_trend(
    months: int = Query(6, ge=1, le=12, description="Number of months"),
    current_user: dict = Depends(get_current_user)
):
    """Get income vs expense trend for the last N months."""
    trend = dashboard_service.get_monthly_trend(
        user_id=current_user["id"],
        months=months
    )
    return trend


@router.get("/api/reports/monthly/{year}/{month}", response_model=MonthlyReport)
async def get_monthly_report(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive monthly financial report."""
    if month < 1 or month > 12:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    report = report_service.get_monthly_report(
        user_id=current_user["id"],
        year=year,
        month=month
    )
    return report
