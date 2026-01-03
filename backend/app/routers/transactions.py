"""
Transaction Router
API endpoints for transaction management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List
from uuid import UUID
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services import transaction_service

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=List[TransactionResponse])
@limiter.limit("60/minute")
async def list_transactions(
    request: Request,
    limit: int = Query(50, ge=1, le=100, description="Number of records per page"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve paginated list of user transactions, sorted by date descending."""
    transactions = transaction_service.get_transactions(
        user_id=current_user["id"],
        limit=limit,
        offset=offset
    )
    return transactions


@router.post("", response_model=TransactionResponse, status_code=201)
@limiter.limit("30/minute")
async def create_transaction(
    request: Request,
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new income or expense transaction."""
    transaction = transaction_service.create_transaction(
        user_id=current_user["id"],
        data=data
    )
    
    if not transaction:
        raise HTTPException(status_code=500, detail="Failed to create transaction")
    
    return transaction


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Retrieve a single transaction by ID."""
    transaction = transaction_service.get_transaction_by_id(
        user_id=current_user["id"],
        transaction_id=transaction_id
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction



@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing transaction."""
    existing = transaction_service.get_transaction_by_id(
        user_id=current_user["id"],
        transaction_id=transaction_id
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = transaction_service.update_transaction(
        user_id=current_user["id"],
        transaction_id=transaction_id,
        data=data
    )
    
    return transaction


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a transaction permanently."""
    success = transaction_service.delete_transaction(
        user_id=current_user["id"],
        transaction_id=transaction_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return None


@router.delete("", status_code=204)
async def delete_all_transactions(
    current_user: dict = Depends(get_current_user)
):
    """Delete ALL transactions for the current user."""
    transaction_service.delete_all_transactions(user_id=current_user["id"])
    return None
