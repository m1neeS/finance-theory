"""
Transaction Service
Business logic for transaction CRUD operations.
"""

from uuid import UUID
from typing import Optional, List
from app.services.supabase_client import supabase
from app.schemas.transaction import TransactionCreate, TransactionUpdate


def create_transaction(user_id: str, data: TransactionCreate) -> dict:
    """Create a new transaction for the specified user."""
    transaction_data = {
        "user_id": user_id,
        "type": data.type,
        "amount": float(data.amount),
        "description": data.description,
        "merchant_name": data.merchant_name,
        "transaction_date": str(data.transaction_date),
        "receipt_url": data.receipt_url
    }
    
    # Only add category_id if provided
    if data.category_id:
        transaction_data["category_id"] = str(data.category_id)
    
    response = supabase.table("transactions").insert(transaction_data).execute()
    return response.data[0] if response.data else None


def get_transactions(user_id: str, limit: int = 50, offset: int = 0) -> List[dict]:
    """Retrieve paginated list of transactions for the specified user."""
    response = supabase.table("transactions") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("transaction_date", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    # Use description as category name for now
    transactions = []
    for t in response.data:
        t["category_name"] = t.get("description") or "Uncategorized"
        transactions.append(t)
    
    return transactions


def get_transaction_by_id(user_id: str, transaction_id: UUID) -> Optional[dict]:
    """Retrieve a single transaction by ID. Returns None if not found."""
    response = supabase.table("transactions") \
        .select("*") \
        .eq("id", str(transaction_id)) \
        .eq("user_id", user_id) \
        .execute()
    
    if response.data:
        t = response.data[0]
        t["category_name"] = t.get("description") or "Uncategorized"
        return t
    return None



def update_transaction(user_id: str, transaction_id: UUID, data: TransactionUpdate) -> Optional[dict]:
    """Update an existing transaction. Only non-null fields are updated."""
    update_data = {}
    
    if data.type is not None:
        update_data["type"] = data.type
    if data.amount is not None:
        update_data["amount"] = float(data.amount)
    if data.category_id is not None:
        update_data["category_id"] = str(data.category_id)
    if data.description is not None:
        update_data["description"] = data.description
    if data.merchant_name is not None:
        update_data["merchant_name"] = data.merchant_name
    if data.transaction_date is not None:
        update_data["transaction_date"] = str(data.transaction_date)
    if data.receipt_url is not None:
        update_data["receipt_url"] = data.receipt_url
    
    if not update_data:
        return get_transaction_by_id(user_id, transaction_id)
    
    response = supabase.table("transactions") \
        .update(update_data) \
        .eq("id", str(transaction_id)) \
        .eq("user_id", user_id) \
        .execute()
    
    return response.data[0] if response.data else None


def delete_transaction(user_id: str, transaction_id: UUID) -> bool:
    """Delete a transaction. Returns True if successful."""
    response = supabase.table("transactions") \
        .delete() \
        .eq("id", str(transaction_id)) \
        .eq("user_id", user_id) \
        .execute()
    
    return len(response.data) > 0


def delete_all_transactions(user_id: str) -> None:
    """Delete ALL transactions for a user."""
    supabase.table("transactions") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()
