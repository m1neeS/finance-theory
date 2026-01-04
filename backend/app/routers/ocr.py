"""
OCR Router - Receipt image processing endpoints.
Supports: Tesseract (default, free) and Google Vision API (premium)
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user
from app.schemas.ocr import OCRResult, OCRProviderInfo
from app.services import ocr_service

router = APIRouter(prefix="/api/ocr", tags=["OCR"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/provider")
async def get_ocr_provider(current_user: dict = Depends(get_current_user)):
    """Get available OCR providers and their status."""
    return ocr_service.get_ocr_provider_info()


@router.post("/process")
@limiter.limit("10/minute")
async def process_receipt(
    request: Request,
    file: UploadFile = File(...),
    provider: str = Form(default="tesseract"),
    current_user: dict = Depends(get_current_user)
):
    """
    Process receipt image with OCR.
    
    Args:
        file: Receipt image (JPG, PNG, PDF)
        provider: "tesseract" (default, free) or "google_vision" (premium)
    
    Returns: Extracted transaction data
    """
    content = await file.read()
    is_valid, error_msg = ocr_service.validate_file(file.filename, len(content))
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Validate provider
    if provider not in ["tesseract", "google_vision"]:
        provider = "tesseract"
    
    try:
        result = await ocr_service.process_receipt(
            user_id=current_user["id"],
            file_content=content,
            filename=file.filename,
            provider=provider
        )
        
        return {
            "success": True,
            "message": "Receipt processed successfully",
            "amount": result.get("amount"),
            "merchant_name": result.get("merchant"),
            "transaction_date": result.get("date"),
            "items": result.get("items", []),
            "tax": result.get("tax"),
            "service_charge": result.get("service_charge"),
            "receipt_url": result.get("receipt_url"),
            "raw_text": result.get("raw_text"),
            "ocr_provider": result.get("ocr_provider")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
