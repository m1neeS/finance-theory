"""
Report Service
Business logic for generating financial reports.
"""

from typing import List
from decimal import Decimal
from datetime import date
from calendar import monthrange
from app.services.supabase_client import supabase


def get_monthly_report(user_id: str, year: int, month: int) -> dict:
    """
    Generate comprehensive monthly financial report.
    Includes income/expense totals, category breakdown, and daily trend.
    """
    # Calculate date range for the month
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    
    # Get all transactions for the month
    response = supabase.table("transactions") \
        .select("*, categories(id, name, color)") \
        .eq("user_id", user_id) \
        .gte("transaction_date", str(first_day)) \
        .lte("transaction_date", str(last_day)) \
        .execute()
    
    transactions = response.data
    
    # Calculate totals
    total_income = Decimal("0")
    total_expense = Decimal("0")
    
    # Category aggregation (expenses only)
    category_totals = {}
    
    # Daily aggregation
    daily_data = {}
    
    for t in transactions:
        amount = Decimal(str(t["amount"]))
        t_date = t["transaction_date"]
        t_type = t["type"]
        
        # Update totals
        if t_type == "income":
            total_income += amount
        else:
            total_expense += amount
            
            # Category breakdown for expenses
            cat = t.get("categories") or {}
            cat_id = cat.get("id", "uncategorized")
            cat_name = cat.get("name", "Uncategorized")
            cat_color = cat.get("color", "#6B7280")
            
            if cat_id not in category_totals:
                category_totals[cat_id] = {
                    "category_id": cat_id if cat_id != "uncategorized" else None,
                    "category_name": cat_name,
                    "total_amount": Decimal("0"),
                    "color": cat_color
                }
            category_totals[cat_id]["total_amount"] += amount
        
        # Daily trend
        if t_date not in daily_data:
            daily_data[t_date] = {"income": Decimal("0"), "expense": Decimal("0")}
        
        if t_type == "income":
            daily_data[t_date]["income"] += amount
        else:
            daily_data[t_date]["expense"] += amount

    
    # Calculate category percentages
    category_breakdown = []
    for cat_data in category_totals.values():
        percentage = float(cat_data["total_amount"] / total_expense * 100) if total_expense > 0 else 0
        category_breakdown.append({
            "category_id": cat_data["category_id"],
            "category_name": cat_data["category_name"],
            "total_amount": cat_data["total_amount"],
            "percentage": round(percentage, 2),
            "color": cat_data["color"]
        })
    
    category_breakdown.sort(key=lambda x: x["total_amount"], reverse=True)
    
    # Format daily trend (sorted by date)
    daily_trend = [
        {"date": d, "income": daily_data[d]["income"], "expense": daily_data[d]["expense"]}
        for d in sorted(daily_data.keys())
    ]
    
    return {
        "month": month,
        "year": year,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": total_income - total_expense,
        "category_breakdown": category_breakdown,
        "daily_trend": daily_trend
    }
