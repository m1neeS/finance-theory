"""
OCR Router
API endpoints for receipt image processing.
Supports dual OCR providers: Tesseract (free) and Google Vision API (paid).
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


@router.get("/provider", response_model=OCRProviderInfo)
async def get_ocr_provider(
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about current OCR provider configuration.
    
    Returns:
    - current_provider: "tesseract" (free) or "google_vision" (paid)
    - is_paid: whether current provider is paid
    - description: human-readable description
    """
    return ocr_service.get_ocr_provider_info()


@router.post("/process", response_model=OCRResult)
@limiter.limit("10/minute")  # OCR is expensive, limit heavily
async def process_receipt(
    request: Request,
    file: UploadFile = File(..., description="Receipt image (JPG, PNG, PDF)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and process receipt image using configured OCR provider.
    
    OCR Provider is configured via OCR_PROVIDER environment variable:
    - "tesseract": Free, local processing (requires Tesseract installed)
    - "google_vision": Paid, cloud-based (requires GOOGLE_VISION_API_KEY)
    
    Returns extracted transaction data for user confirmation.
    """
    # Validate file
    content = await file.read()
    is_valid, error_msg = ocr_service.validate_file(file.filename, len(content))
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Upload to storage
    receipt_url = await ocr_service.upload_receipt(
        user_id=current_user["id"],
        file_content=content,
        filename=file.filename
    )
    
    # Process image with configured OCR provider
    result = await ocr_service.process_receipt_image(content, receipt_url)
    
    return result


@router.post("/extract", response_model=OCRResult)
@limiter.limit("20/minute")
async def extract_from_text(
    request: Request,
    text: str = Form(..., description="OCR text to extract data from"),
    receipt_url: Optional[str] = Form(None, description="Receipt image URL"),
    current_user: dict = Depends(get_current_user)
):
    """
    Extract transaction data from pre-extracted OCR text.
    Use this if you already have OCR text from another source.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="OCR text cannot be empty")
    
    result = await ocr_service.process_receipt(text, receipt_url)
    return result
