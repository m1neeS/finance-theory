"""
Dashboard Service
Business logic for dashboard calculations.
"""

from typing import List
from decimal import Decimal
from datetime import date, timedelta
from collections import defaultdict
from app.services.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)


def get_summary(user_id: str) -> dict:
    """
    Calculate dashboard summary for ALL transactions.
    Returns total balance, income, and expense.
    """
    today = date.today()
    logger.info(f"Getting summary for user_id: {user_id}")
    
    # Get ALL transactions (no date filter)
    response = supabase.table("transactions") \
        .select("type, amount") \
        .eq("user_id", user_id) \
        .execute()
    
    logger.info(f"Found {len(response.data)} transactions for user {user_id}")
    
    total_income = Decimal("0")
    total_expense = Decimal("0")
    
    for t in response.data:
        amount = Decimal(str(t["amount"]))
        if t["type"] == "income":
            total_income += amount
        else:
            total_expense += amount
    
    result = {
        "total_balance": total_income - total_expense,
        "total_income": total_income,
        "total_expense": total_expense,
        "month": today.month,
        "year": today.year
    }
    logger.info(f"Summary result: {result}")
    return result


def get_category_breakdown(user_id: str) -> List[dict]:
    """
    Calculate expense breakdown by category for ALL transactions.
    Returns list with category name, amount, and percentage.
    """
    # Get ALL expense transactions (no date filter)
    response = supabase.table("transactions") \
        .select("amount, category_id, description") \
        .eq("user_id", user_id) \
        .eq("type", "expense") \
        .execute()
    
    # Aggregate by description (as category name)
    category_totals = {}
    total_expense = Decimal("0")
    
    for t in response.data:
        amount = Decimal(str(t["amount"]))
        total_expense += amount
        
        cat_name = t.get("description") or "Lainnya"
        
        if cat_name not in category_totals:
            category_totals[cat_name] = {
                "category_name": cat_name,
                "total_amount": Decimal("0"),
                "color": "#6B7280"
            }
        category_totals[cat_name]["total_amount"] += amount
    
    # Calculate percentages
    breakdown = []
    for cat_data in category_totals.values():
        percentage = float(cat_data["total_amount"] / total_expense * 100) if total_expense > 0 else 0
        breakdown.append({
            "category_id": None,
            "category_name": cat_data["category_name"],
            "total_amount": cat_data["total_amount"],
            "percentage": round(percentage, 2),
            "color": cat_data["color"]
        })
    
    # Sort by amount descending
    breakdown.sort(key=lambda x: x["total_amount"], reverse=True)
    return breakdown


def get_monthly_trend(user_id: str, months: int = 6) -> List[dict]:
    """
    Get income vs expense trend for the last N months.
    Returns list with month, income, and expense.
    """
    today = date.today()
    
    # Get all transactions
    response = supabase.table("transactions") \
        .select("type, amount, transaction_date") \
        .eq("user_id", user_id) \
        .execute()
    
    # Aggregate by month
    monthly_data = defaultdict(lambda: {"income": Decimal("0"), "expense": Decimal("0")})
    
    for t in response.data:
        amount = Decimal(str(t["amount"]))
        trans_date = t.get("transaction_date", "")
        if trans_date:
            year_month = trans_date[:7]  # "YYYY-MM"
            if t["type"] == "income":
                monthly_data[year_month]["income"] += amount
            else:
                monthly_data[year_month]["expense"] += amount
    
    # Sort by month and get last N months
    sorted_months = sorted(monthly_data.keys(), reverse=True)[:months]
    sorted_months.reverse()  # Oldest first
    
    result = []
    month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    
    for ym in sorted_months:
        year, month = ym.split('-')
        result.append({
            "month": f"{month_names[int(month)]} {year[2:]}",
            "income": float(monthly_data[ym]["income"]),
            "expense": float(monthly_data[ym]["expense"])
        })
    
    return result


def get_recent_transactions(user_id: str, limit: int = 5) -> List[dict]:
    """Get most recent transactions for dashboard display."""
    response = supabase.table("transactions") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("transaction_date", desc=True) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    
    transactions = []
    for t in response.data:
        t["category_name"] = t.get("description") or "Uncategorized"
        transactions.append(t)
    
    return transactions
