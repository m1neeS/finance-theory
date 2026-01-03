"""
Category Router
API endpoints for category management.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID

from app.dependencies import get_current_user
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(current_user: dict = Depends(get_current_user)):
    """Retrieve all categories (default + user's custom categories)."""
    categories = category_service.get_categories(user_id=current_user["id"])
    return categories


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new custom category."""
    category = category_service.create_category(
        user_id=current_user["id"],
        data=data
    )
    
    if not category:
        raise HTTPException(status_code=500, detail="Failed to create category")
    
    return category


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a custom category.
    Transactions will be reassigned to 'Others' category.
    Default categories cannot be deleted.
    """
    success = category_service.delete_category(
        user_id=current_user["id"],
        category_id=category_id
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Category not found or cannot delete default category"
        )
    
    return None
