from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.services.supabase_client import supabase

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class UserProfile(BaseModel):
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    # Try to get profile from users table
    response = supabase.table("users").select("*").eq("id", current_user["id"]).execute()

    if response.data:
        user_data = response.data[0]
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data.get("full_name")
        )

    # Return basic info if no profile exists
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"]
    )

@router.post("/profile", response_model=UserResponse)
async def create_or_update_profile(
    profile: UserProfile,
    current_user: dict = Depends(get_current_user)
):
    """Create or update user profile"""
    user_data = {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": profile.full_name
    }
    
    # Upsert user profile
    response = supabase.table("users").upsert(user_data).execute()
    
    if response.data:
        data = response.data[0]
        return UserResponse(
            id=data["id"],
            email=data["email"],
            full_name=data.get("full_name")
        )
    
    raise HTTPException(status_code=500, detail="Failed to save profile")
