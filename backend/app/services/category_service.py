"""
Category Service
Business logic for category management.
"""

from uuid import UUID
from typing import List, Optional
from app.services.supabase_client import supabase
from app.schemas.category import CategoryCreate


def get_categories(user_id: str) -> List[dict]:
    """
    Retrieve all categories available to user.
    Returns default categories + user's custom categories.
    """
    response = supabase.table("categories") \
        .select("*") \
        .or_(f"is_default.eq.true,user_id.eq.{user_id}") \
        .order("is_default", desc=True) \
        .order("name") \
        .execute()
    
    return response.data


def get_category_by_id(category_id: UUID) -> Optional[dict]:
    """Retrieve a single category by ID."""
    response = supabase.table("categories") \
        .select("*") \
        .eq("id", str(category_id)) \
        .execute()
    
    return response.data[0] if response.data else None


def create_category(user_id: str, data: CategoryCreate) -> dict:
    """Create a new custom category for the user."""
    category_data = {
        "user_id": user_id,
        "name": data.name,
        "icon": data.icon,
        "color": data.color,
        "is_default": False
    }
    
    response = supabase.table("categories").insert(category_data).execute()
    return response.data[0] if response.data else None



def delete_category(user_id: str, category_id: UUID) -> bool:
    """
    Delete a custom category.
    Reassigns all transactions to 'Others' category before deletion.
    Returns False if category is default or not found.
    """
    # Check if category exists and is not default
    category = get_category_by_id(category_id)
    if not category:
        return False
    
    if category.get("is_default"):
        return False
    
    # Verify ownership
    if category.get("user_id") != user_id:
        return False
    
    # Get "Others" category for reassignment
    others = supabase.table("categories") \
        .select("id") \
        .eq("name", "Others") \
        .eq("is_default", True) \
        .execute()
    
    others_id = others.data[0]["id"] if others.data else None
    
    # Reassign transactions to "Others"
    if others_id:
        supabase.table("transactions") \
            .update({"category_id": others_id}) \
            .eq("category_id", str(category_id)) \
            .eq("user_id", user_id) \
            .execute()
    
    # Delete the category
    response = supabase.table("categories") \
        .delete() \
        .eq("id", str(category_id)) \
        .eq("user_id", user_id) \
        .execute()
    
    return len(response.data) > 0
