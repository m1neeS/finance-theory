"""
OCR Service - Receipt image processing and data extraction.
Supports: Tesseract (default, free) and Google Vision API (premium, optional)
"""

import re
import base64
import httpx
from decimal import Decimal
from datetime import date
from typing import Optional, Tuple
from uuid import uuid4
from app.config import settings
from app.services.supabase_client import supabase

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024

INDONESIAN_MONTHS = {
    'januari': 1, 'jan': 1, 'februari': 2, 'feb': 2, 'maret': 3, 'mar': 3,
    'april': 4, 'apr': 4, 'mei': 5, 'juni': 6, 'jun': 6, 'juli': 7, 'jul': 7,
    'agustus': 8, 'agu': 8, 'ags': 8, 'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'okt': 10, 'november': 11, 'nov': 11, 'desember': 12, 'des': 12
}


def validate_file(filename: str, file_size: int) -> Tuple[bool, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Max: {MAX_FILE_SIZE // (1024*1024)}MB"
    return True, ""


async def upload_receipt(user_id: str, file_content: bytes, filename: str) -> Optional[str]:
    ext = filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{user_id}/{uuid4()}.{ext}"
    try:
        supabase.storage.from_("receipts").upload(
            path=unique_filename, file=file_content,
            file_options={"content-type": f"image/{ext}" if ext != "pdf" else "application/pdf"}
        )
        return supabase.storage.from_("receipts").get_public_url(unique_filename)
    except Exception as e:
        print(f"Upload error: {e}")
        return None


def preprocess_image(image):
    """Preprocess image for better OCR accuracy."""
    from PIL import Image, ImageEnhance, ImageFilter
    
    # Convert to RGB if needed
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    
    # Resize if too small
    min_width = 1200
    if image.width < min_width:
        ratio = min_width / image.width
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    # Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.8)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)
    
    # Denoise
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    return image


async def ocr_with_tesseract(image_content: bytes) -> str:
    """Extract text using Tesseract OCR (default, free)."""
    try:
        import pytesseract
        from PIL import Image
        import io
        
        image = Image.open(io.BytesIO(image_content))
        
        # Try with preprocessing first
        processed = preprocess_image(image)
        config = r'--psm 6 --oem 3 -c preserve_interword_spaces=1'
        
        try:
            text = pytesseract.image_to_string(processed, lang='ind+eng', config=config)
        except:
            text = pytesseract.image_to_string(processed, lang='eng', config=config)
        
        # If result is poor, try original image
        if not text.strip() or len(text.strip()) < 20:
            try:
                text = pytesseract.image_to_string(image, lang='ind+eng', config=config)
            except:
                text = pytesseract.image_to_string(image, lang='eng', config=config)
        
        return text
    except ImportError:
        raise Exception("Tesseract not available")
    except Exception as e:
        raise Exception(f"Tesseract error: {str(e)}")


async def ocr_with_google_vision(image_content: bytes) -> str:
    """Extract text using Google Cloud Vision API (premium)."""
    api_key = getattr(settings, 'GOOGLE_VISION_API_KEY', None)
    if not api_key:
        raise Exception("Google Vision API key not configured")
    
    base64_image = base64.b64encode(image_content).decode("utf-8")
    request_body = {
        "requests": [{
            "image": {"content": base64_image},
            "features": [{"type": "TEXT_DETECTION", "maxResults": 1}]
        }]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://vision.googleapis.com/v1/images:annotate?key={api_key}",
            json=request_body, timeout=30.0
        )
        if response.status_code != 200:
            raise Exception(f"Google Vision error: {response.text}")
        
        result = response.json()
        if "responses" in result and result["responses"]:
            annotations = result["responses"][0].get("textAnnotations", [])
            if annotations:
                return annotations[0].get("description", "")
        return ""


async def perform_ocr(image_content: bytes, provider: str = "tesseract") -> str:
    """Perform OCR with specified provider. Default: tesseract"""
    if provider == "google_vision":
        return await ocr_with_google_vision(image_content)
    return await ocr_with_tesseract(image_content)


def extract_amount(text: str) -> Optional[Decimal]:
    """Extract total amount from receipt."""
    patterns = [
        r'(?:TOTAL|GRAND\s*TOTAL|AMOUNT|JUMLAH|BAYAR|TUNAI|CASH|DEBIT|KREDIT|PAYMENT)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
        r'(?:Rp\.?|IDR)\s*([\d.,]+)\s*(?:TOTAL|GRAND|BAYAR)',
        r'(?:TOTAL|GRAND\s*TOTAL)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
    ]
    
    amounts = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                clean = match.replace(".", "").replace(",", "")
                if clean.isdigit() and len(clean) >= 3:
                    amounts.append(Decimal(clean))
            except:
                continue
    
    if amounts:
        return max(amounts)
    
    # Fallback: find largest number
    all_amounts = re.findall(r'([\d]{1,3}(?:[.,]\d{3})+)', text)
    parsed = []
    for amt in all_amounts:
        try:
            clean = amt.replace(".", "").replace(",", "")
            if clean.isdigit() and len(clean) >= 4:
                parsed.append(Decimal(clean))
        except:
            continue
    
    return max(parsed) if parsed else None


def extract_date(text: str) -> Optional[date]:
    """Extract date from receipt."""
    patterns = [
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', 'dmy'),
        (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', 'ymd'),
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b', 'dmy_short'),
        (r'(\d{1,2})\s+(' + '|'.join(INDONESIAN_MONTHS.keys()) + r')\s+(\d{4})', 'indo'),
    ]
    
    for pattern, fmt in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                groups = match.groups()
                if fmt == 'dmy':
                    return date(int(groups[2]), int(groups[1]), int(groups[0]))
                elif fmt == 'ymd':
                    return date(int(groups[0]), int(groups[1]), int(groups[2]))
                elif fmt == 'dmy_short':
                    year = 2000 + int(groups[2]) if int(groups[2]) < 100 else int(groups[2])
                    return date(year, int(groups[1]), int(groups[0]))
                elif fmt == 'indo':
                    month = INDONESIAN_MONTHS.get(groups[1].lower(), 1)
                    return date(int(groups[2]), month, int(groups[0]))
            except:
                continue
    return None


def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant name from receipt."""
    lines = text.strip().split('\n')
    skip_words = ['struk', 'receipt', 'invoice', 'nota', 'kasir', 'tanggal', 'date', 'waktu', 'time', 'npwp']
    
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and not any(word in line.lower() for word in skip_words):
            if not re.match(r'^[\d\s:/-]+$', line):
                return line[:100]
    return None


def extract_items(text: str) -> list:
    """Extract items from receipt with multiple patterns."""
    items = []
    lines = text.split('\n')
    
    skip_keywords = [
        'TOTAL', 'SUBTOTAL', 'GRAND', 'TAX', 'PPN', 'PAJAK', 'DISKON', 'DISCOUNT',
        'TUNAI', 'CASH', 'KEMBALI', 'CHANGE', 'TERIMA KASIH', 'THANK', 'STRUK',
        'RECEIPT', 'INVOICE', 'NOTA', 'KASIR', 'TANGGAL', 'DATE', 'WAKTU', 'TIME',
        'ALAMAT', 'ADDRESS', 'TELP', 'PHONE', 'NPWP', 'MEMBER', 'CARD'
    ]
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue
        
        # Skip lines with keywords
        if any(kw in line.upper() for kw in skip_keywords):
            continue
        
        # Skip separator lines
        if re.match(r'^[-=*_]+$', line):
            continue
        
        # Pattern 1: "Item Name    25.000" (spaces separator)
        match = re.match(r'^(.+?)\s{2,}([\d.,]+)$', line)
        if match:
            name, price = match.groups()
            name = name.strip()
            if len(name) > 2 and not re.match(r'^[\d\s]+$', name):
                try:
                    price_clean = price.replace('.', '').replace(',', '')
                    if price_clean.isdigit() and int(price_clean) >= 100:
                        items.append({"name": name[:100], "price": int(price_clean), "quantity": 1})
                        continue
                except:
                    pass
        
        # Pattern 2: "2 x Item @ 15.000  30.000"
        match = re.match(r'^(\d+)\s*[xX]\s*(.+?)\s*@\s*[\d.,]+\s+([\d.,]+)$', line)
        if match:
            qty, name, total = match.groups()
            name = name.strip()
            if len(name) > 2:
                try:
                    total_clean = total.replace('.', '').replace(',', '')
                    if total_clean.isdigit() and int(total_clean) >= 100:
                        items.append({"name": name[:100], "price": int(total_clean), "quantity": int(qty)})
                        continue
                except:
                    pass
        
        # Pattern 3: "Item Name Rp 25.000"
        match = re.match(r'^(.+?)\s+(?:Rp\.?|IDR)\s*([\d.,]+)$', line, re.IGNORECASE)
        if match:
            name, price = match.groups()
            name = name.strip()
            if len(name) > 2 and not re.match(r'^[\d\s]+$', name):
                try:
                    price_clean = price.replace('.', '').replace(',', '')
                    if price_clean.isdigit() and int(price_clean) >= 100:
                        items.append({"name": name[:100], "price": int(price_clean), "quantity": 1})
                        continue
                except:
                    pass
        
        # Pattern 4: "1 Item Name 25.000" (qty at start)
        match = re.match(r'^(\d+)\s+(.+?)\s+([\d.,]+)$', line)
        if match:
            qty, name, price = match.groups()
            name = name.strip()
            if len(name) > 2 and not re.match(r'^[\d\s@xX]+$', name):
                try:
                    price_clean = price.replace('.', '').replace(',', '')
                    if price_clean.isdigit() and int(price_clean) >= 100:
                        items.append({"name": name[:100], "price": int(price_clean), "quantity": int(qty)})
                        continue
                except:
                    pass
        
        # Pattern 5: "Item Name 25000" (no dots)
        match = re.match(r'^(.+?)\s+(\d{4,})$', line)
        if match:
            name, price = match.groups()
            name = name.strip()
            if len(name) > 2 and not re.match(r'^[\d\s]+$', name):
                try:
                    if int(price) >= 100:
                        items.append({"name": name[:100], "price": int(price), "quantity": 1})
                except:
                    pass
    
    return items


def extract_tax_and_service(text: str) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """Extract tax and service charge."""
    tax = service = None
    
    tax_match = re.search(r'(?:TAX|PPN|PAJAK|VAT)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)', text, re.IGNORECASE)
    if tax_match:
        try:
            clean = tax_match.group(1).replace(".", "").replace(",", "")
            if clean.isdigit():
                tax = Decimal(clean)
        except:
            pass
    
    service_match = re.search(r'(?:SERVICE|SERVIS|SC)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)', text, re.IGNORECASE)
    if service_match:
        try:
            clean = service_match.group(1).replace(".", "").replace(",", "")
            if clean.isdigit():
                service = Decimal(clean)
        except:
            pass
    
    return tax, service


async def process_receipt_image(image_content: bytes, provider: str = "tesseract") -> dict:
    """Process receipt and extract data."""
    raw_text = await perform_ocr(image_content, provider)
    
    amount = extract_amount(raw_text)
    transaction_date = extract_date(raw_text)
    merchant = extract_merchant(raw_text)
    items = extract_items(raw_text)
    tax, service = extract_tax_and_service(raw_text)
    
    return {
        "raw_text": raw_text,
        "amount": float(amount) if amount else None,
        "date": transaction_date.isoformat() if transaction_date else None,
        "merchant": merchant,
        "items": items,
        "tax": float(tax) if tax else None,
        "service_charge": float(service) if service else None,
        "ocr_provider": provider
    }


async def process_receipt(
    user_id: str,
    file_content: bytes,
    filename: str,
    provider: str = "tesseract"
) -> dict:
    """Full receipt processing: upload, OCR, extract."""
    is_valid, error_msg = validate_file(filename, len(file_content))
    if not is_valid:
        raise ValueError(error_msg)
    
    receipt_url = await upload_receipt(user_id, file_content, filename)
    ocr_result = await process_receipt_image(file_content, provider)
    ocr_result["receipt_url"] = receipt_url
    
    return ocr_result


def get_ocr_provider_info() -> dict:
    """Get available OCR providers info."""
    google_available = bool(getattr(settings, 'GOOGLE_VISION_API_KEY', None))
    return {
        "providers": [
            {
                "id": "tesseract",
                "name": "Tesseract OCR",
                "description": "Free, open-source OCR engine",
                "available": True,
                "is_default": True
            },
            {
                "id": "google_vision",
                "name": "Google Vision AI",
                "description": "Premium OCR with higher accuracy",
                "available": google_available,
                "is_default": False
            }
        ],
        "default": "tesseract"
    }
