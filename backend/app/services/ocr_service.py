"""
OCR Service
Business logic for receipt image processing and data extraction.
Supports dual OCR providers: Tesseract (free) and Google Vision API (paid).
"""

import re
import base64
import httpx
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, Tuple
from uuid import uuid4
from app.config import settings
from app.services.supabase_client import supabase


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file(filename: str, file_size: int) -> Tuple[bool, str]:
    """Validate uploaded file type and size."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
    
    return True, ""


async def upload_receipt(user_id: str, file_content: bytes, filename: str) -> Optional[str]:
    """Upload receipt image to Supabase Storage."""
    ext = filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{user_id}/{uuid4()}.{ext}"
    
    try:
        response = supabase.storage.from_("receipts").upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": f"image/{ext}" if ext != "pdf" else "application/pdf"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("receipts").get_public_url(unique_filename)
        return public_url
    except Exception as e:
        print(f"Upload error: {e}")
        return None


# ============================================
# OCR Provider Implementations
# ============================================

def preprocess_image(image):
    """
    Preprocess image for better OCR accuracy.
    - Convert to grayscale
    - Enhance contrast
    - Reduce noise
    - Resize if too small
    """
    from PIL import Image, ImageEnhance, ImageFilter
    
    # Convert to RGB if necessary (handle RGBA, P mode, etc.)
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    
    # Resize if image is too small (optimal for Tesseract: 300 DPI equivalent)
    min_width = 1000
    if image.width < min_width:
        ratio = min_width / image.width
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    # Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)
    
    # Apply slight blur to reduce noise, then sharpen
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Binarization - convert to black and white for cleaner text
    threshold = 140
    image = image.point(lambda x: 255 if x > threshold else 0, mode='1')
    
    return image


async def ocr_with_tesseract(image_content: bytes) -> str:
    """
    Extract text from image using Tesseract OCR (FREE).
    Includes image preprocessing for better accuracy.
    
    Install:
    - pip install pytesseract pillow
    - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
    - Linux: sudo apt install tesseract-ocr tesseract-ocr-ind
    - Mac: brew install tesseract
    """
    try:
        import pytesseract
        from PIL import Image
        import io
        import os
        
        # Set Tesseract path for Windows
        if os.name == 'nt':  # Windows
            tesseract_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]
            for path in tesseract_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    break
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_content))
        
        # Preprocess image for better OCR accuracy
        processed_image = preprocess_image(image)
        
        # Tesseract config for better receipt recognition
        # --psm 6: Assume uniform block of text
        # --oem 3: Default OCR Engine Mode (LSTM + Legacy)
        custom_config = r'--psm 6 --oem 3 -c preserve_interword_spaces=1'
        
        # Extract text - try with Indonesian first, fallback to English only
        try:
            text = pytesseract.image_to_string(
                processed_image, 
                lang='ind+eng',
                config=custom_config
            )
        except:
            # Fallback if Indonesian language pack not installed
            text = pytesseract.image_to_string(
                processed_image, 
                lang='eng',
                config=custom_config
            )
        
        # If preprocessing didn't help, try original image
        if not text.strip() or len(text.strip()) < 10:
            try:
                text = pytesseract.image_to_string(
                    image, 
                    lang='ind+eng',
                    config=custom_config
                )
            except:
                text = pytesseract.image_to_string(
                    image, 
                    lang='eng',
                    config=custom_config
                )
        
        return text
    except ImportError:
        raise Exception(
            "Tesseract not installed. Install with: pip install pytesseract pillow\n"
            "Also install Tesseract-OCR on your system."
        )
    except Exception as e:
        raise Exception(f"Tesseract OCR error: {str(e)}")


async def ocr_with_google_vision(image_content: bytes) -> str:
    """
    Extract text from image using Google Vision API (PAID).
    More accurate than Tesseract, especially for receipts.
    
    Pricing: ~$1.50 per 1000 images
    Free tier: 1000 images/month
    
    Setup:
    1. Enable Vision API in Google Cloud Console
    2. Create API key
    3. Set GOOGLE_VISION_API_KEY in .env
    """
    if not settings.google_vision_api_key:
        raise Exception(
            "Google Vision API key not configured. "
            "Set GOOGLE_VISION_API_KEY in .env file or switch to Tesseract (free)."
        )
    
    # Encode image to base64
    image_base64 = base64.b64encode(image_content).decode('utf-8')
    
    # Google Vision API endpoint
    url = f"https://vision.googleapis.com/v1/images:annotate?key={settings.google_vision_api_key}"
    
    payload = {
        "requests": [{
            "image": {"content": image_base64},
            "features": [{"type": "TEXT_DETECTION"}]
        }]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=30.0)
        
        if response.status_code != 200:
            raise Exception(f"Google Vision API error: {response.text}")
        
        result = response.json()
        
        # Extract text from response
        try:
            annotations = result["responses"][0].get("textAnnotations", [])
            if annotations:
                return annotations[0]["description"]
            return ""
        except (KeyError, IndexError):
            return ""


async def perform_ocr(image_content: bytes) -> Tuple[str, str]:
    """
    Perform OCR using configured provider.
    Returns: (extracted_text, provider_used)
    """
    provider = settings.ocr_provider
    
    if provider == "google_vision":
        text = await ocr_with_google_vision(image_content)
        return text, "google_vision"
    else:
        text = await ocr_with_tesseract(image_content)
        return text, "tesseract"


# ============================================
# Text Extraction Functions
# ============================================

def extract_amount(text: str) -> Optional[Decimal]:
    """Extract monetary amount from OCR text with improved patterns for Indonesian receipts."""
    
    # Normalize text - fix common OCR errors
    text = text.replace('O', '0').replace('o', '0')  # Common OCR mistake
    text = text.replace('l', '1').replace('I', '1')  # Common OCR mistake for 1
    text = text.replace(' ', '')  # Remove spaces in numbers like "50 000"
    
    # Restore text for pattern matching (keep original for non-number parts)
    original_text = text
    
    # Priority patterns - check these first (most specific)
    priority_patterns = [
        # Bank transfer patterns
        r"(?:Nominal|NOMINAL)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        r"(?:Jumlah|JUMLAH)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        r"(?:Amount|AMOUNT)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        # Total patterns
        r"(?:Total\s*(?:Bayar|Pembayaran|Belanja|Harga))[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        r"(?:TOTAL\s*(?:BAYAR|PEMBAYARAN|BELANJA|HARGA))[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        r"(?:Grand\s*Total|GRAND\s*TOTAL)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        r"(?:Total|TOTAL)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)",
        # Rp patterns
        r"(?:Rp\.?|IDR)\s*([\d.,]+)",
    ]
    
    for pattern in priority_patterns:
        matches = re.findall(pattern, original_text, re.IGNORECASE)
        if matches:
            amounts = []
            for match in matches:
                clean = match.replace(".", "").replace(",", "").strip()
                # Filter out unrealistic amounts (too small or too large)
                try:
                    amount = Decimal(clean)
                    if 100 <= amount <= 100000000000:  # 100 to 100 billion
                        amounts.append(amount)
                except:
                    continue
            if amounts:
                # For total patterns, return the match; for Rp patterns, return max
                return max(amounts)
    
    # Fallback: find any large number that looks like money
    fallback_patterns = [
        r"([\d]{1,3}(?:[.,]\d{3})+)",  # 50.000 or 50,000
        r"([\d]{4,})",  # Any number with 4+ digits
    ]
    
    for pattern in fallback_patterns:
        matches = re.findall(pattern, original_text)
        if matches:
            amounts = []
            for match in matches:
                clean = match.replace(".", "").replace(",", "")
                try:
                    amount = Decimal(clean)
                    if 1000 <= amount <= 100000000000:  # 1000 to 100 billion
                        amounts.append(amount)
                except:
                    continue
            if amounts:
                return max(amounts)
    
    return None


# Indonesian month names mapping
INDONESIAN_MONTHS = {
    'jan': 1, 'januari': 1, 'january': 1,
    'feb': 2, 'februari': 2, 'february': 2,
    'mar': 3, 'maret': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'mei': 5, 'may': 5,
    'jun': 6, 'juni': 6, 'june': 6,
    'jul': 7, 'juli': 7, 'july': 7,
    'agu': 8, 'agustus': 8, 'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'okt': 10, 'oktober': 10, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'des': 12, 'desember': 12, 'dec': 12, 'december': 12
}


def extract_date(text: str) -> Optional[date]:
    """Extract transaction date from OCR text."""
    
    # Pattern for date format: "30 Okt 2025", "10 May 19", "30 Oktober 2025"
    indo_pattern = r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})"
    match = re.search(indo_pattern, text)
    if match:
        day = int(match.group(1))
        month_str = match.group(2).lower()
        year_str = match.group(3)
        
        # Handle 2-digit year
        year = int(year_str)
        if year < 100:
            year = 2000 + year if year < 50 else 1900 + year
        
        # Try to match month name
        month = INDONESIAN_MONTHS.get(month_str[:3])
        if month:
            try:
                return date(year, month, day)
            except:
                pass
    
    # Common date patterns (numeric)
    patterns = [
        (r"(\d{2})[/-](\d{2})[/-](\d{4})", "%d-%m-%Y"),  # DD/MM/YYYY
        (r"(\d{4})[/-](\d{2})[/-](\d{2})", "%Y-%m-%d"),  # YYYY-MM-DD
        (r"(\d{2})[/-](\d{2})[/-](\d{2})", "%d-%m-%y"),  # DD/MM/YY
    ]
    
    for pattern, fmt in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                date_str = "-".join(match.groups())
                return datetime.strptime(date_str, fmt.replace("/", "-")).date()
            except:
                continue
    
    return None


def extract_recipient(text: str) -> Optional[str]:
    """Extract recipient/destination name from bank transfer receipt."""
    # Look for "Tujuan" section in bank transfers
    tujuan_pattern = r"(?:Tujuan|Penerima|Kepada)[:\s]*\n?\s*([A-Za-z\s]+)"
    match = re.search(tujuan_pattern, text, re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        # Clean up - take first line only, remove numbers
        name = name.split('\n')[0].strip()
        if name and len(name) > 2 and not name.isdigit():
            return name
    return None


def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant/store name or recipient from OCR text."""
    text_lower = text.lower()
    
    # Detect if this is a bank transfer receipt
    is_bank_transfer = any(keyword in text_lower for keyword in [
        'transaksi berhasil', 'transfer berhasil', 'tujuan', 'sumber dana',
        'ref id', 'wondr', 'bni', 'bca', 'mandiri', 'bri', 'dana', 'gopay', 'ovo'
    ])
    
    if is_bank_transfer:
        # For bank transfers, extract recipient name
        recipient = extract_recipient(text)
        if recipient:
            return f"Transfer ke {recipient}"
        
        # Try to find bank/app name
        bank_apps = ['wondr', 'bni', 'bca', 'mandiri', 'bri', 'dana', 'gopay', 'ovo', 'shopeepay', 'linkaja']
        for bank in bank_apps:
            if bank in text_lower:
                return bank.upper() if len(bank) <= 3 else bank.capitalize()
    
    # For regular receipts - look in first few lines
    lines = text.strip().split("\n")
    
    for line in lines[:5]:
        line = line.strip()
        # Skip lines that look like dates, amounts, or addresses
        if re.match(r"^\d", line):
            continue
        if any(word in line.lower() for word in ["jl.", "jalan", "telp", "phone", "fax", "transaksi"]):
            continue
        if len(line) > 5 and len(line) < 50:
            return line
    
    return None


def extract_items(text: str) -> list:
    """
    Extract individual items from receipt text.
    Returns list of dicts with: name, quantity, unit_price, total_price
    """
    items = []
    lines = text.strip().split("\n")
    
    # Skip keywords - lines containing these are not items
    skip_keywords = [
        'total', 'subtotal', 'sub total', 'grand total', 'pajak', 'tax', 'ppn', 'pb1',
        'service', 'diskon', 'discount', 'tunai', 'cash', 'debit', 'credit', 'kartu',
        'kembalian', 'change', 'bayar', 'payment', 'tanggal', 'date', 'waktu', 'time',
        'kasir', 'cashier', 'nota', 'receipt', 'struk', 'terima kasih', 'thank you',
        'member', 'customer', 'pelanggan', 'no.', 'telp', 'phone', 'alamat', 'address',
        'jl.', 'jalan', 'rp', 'idr', '---', '===', '***', 'qty', 'harga', 'jumlah'
    ]
    
    for line in lines:
        line_clean = line.strip()
        line_lower = line_clean.lower()
        
        # Skip empty lines
        if not line_clean or len(line_clean) < 3:
            continue
        
        # Skip lines with skip keywords
        if any(keyword in line_lower for keyword in skip_keywords):
            continue
        
        # Skip lines that are just numbers or symbols
        if re.match(r'^[\d\s.,\-=*]+$', line_clean):
            continue
        
        # Try to extract item with price
        # Pattern 1: "Item Name    25.000" or "Item Name    25,000"
        pattern1 = r'^(.+?)\s{2,}([\d.,]+)$'
        match = re.match(pattern1, line_clean)
        if match:
            name = match.group(1).strip()
            price_str = match.group(2).replace(".", "").replace(",", "")
            try:
                price = Decimal(price_str)
                if 100 <= price <= 100000000 and len(name) > 2:  # Reasonable price range
                    items.append({
                        "name": name,
                        "quantity": 1,
                        "unit_price": None,
                        "total_price": price
                    })
                    continue
            except:
                pass
        
        # Pattern 2: "2 x Item Name @ 15.000    30.000" or "2x Item @ 15000 = 30000"
        pattern2 = r'^(\d+)\s*[xX]\s*(.+?)\s*[@]\s*([\d.,]+)\s*[=]?\s*([\d.,]+)?$'
        match = re.match(pattern2, line_clean)
        if match:
            qty = int(match.group(1))
            name = match.group(2).strip()
            unit_price_str = match.group(3).replace(".", "").replace(",", "")
            total_str = match.group(4).replace(".", "").replace(",", "") if match.group(4) else None
            try:
                unit_price = Decimal(unit_price_str)
                total_price = Decimal(total_str) if total_str else unit_price * qty
                if 100 <= total_price <= 100000000 and len(name) > 1:
                    items.append({
                        "name": name,
                        "quantity": qty,
                        "unit_price": unit_price,
                        "total_price": total_price
                    })
                    continue
            except:
                pass
        
        # Pattern 3: "Item Name 2 @ 15.000" (qty after name)
        pattern3 = r'^(.+?)\s+(\d+)\s*[@xX]\s*([\d.,]+)$'
        match = re.match(pattern3, line_clean)
        if match:
            name = match.group(1).strip()
            qty = int(match.group(2))
            unit_price_str = match.group(3).replace(".", "").replace(",", "")
            try:
                unit_price = Decimal(unit_price_str)
                total_price = unit_price * qty
                if 100 <= total_price <= 100000000 and len(name) > 1:
                    items.append({
                        "name": name,
                        "quantity": qty,
                        "unit_price": unit_price,
                        "total_price": total_price
                    })
                    continue
            except:
                pass
        
        # Pattern 4: Simple "Item Name   Rp 25.000" or "Item Name   Rp25000"
        pattern4 = r'^(.+?)\s+(?:Rp\.?|IDR)\s*([\d.,]+)$'
        match = re.match(pattern4, line_clean, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            price_str = match.group(2).replace(".", "").replace(",", "")
            try:
                price = Decimal(price_str)
                if 100 <= price <= 100000000 and len(name) > 2:
                    items.append({
                        "name": name,
                        "quantity": 1,
                        "unit_price": None,
                        "total_price": price
                    })
                    continue
            except:
                pass
    
    return items


def extract_tax_and_service(text: str) -> tuple:
    """Extract tax (PPN/PB1) and service charge from receipt."""
    tax = None
    service = None
    
    text_lower = text.lower()
    
    # Tax patterns (PPN, PB1, Tax)
    tax_patterns = [
        r'(?:ppn|pb1|tax|pajak)[:\s]*([\d.,]+)',
        r'(?:ppn|pb1|tax|pajak)\s*\d+%[:\s]*([\d.,]+)',
    ]
    
    for pattern in tax_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                tax_str = match.group(1).replace(".", "").replace(",", "")
                tax = Decimal(tax_str)
                if tax > 0 and tax < 10000000:  # Reasonable tax amount
                    break
            except:
                continue
    
    # Service charge patterns
    service_patterns = [
        r'(?:service|servis|sc)[:\s]*([\d.,]+)',
        r'(?:service|servis)\s*\d+%[:\s]*([\d.,]+)',
    ]
    
    for pattern in service_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                service_str = match.group(1).replace(".", "").replace(",", "")
                service = Decimal(service_str)
                if service > 0 and service < 10000000:
                    break
            except:
                continue
    
    return tax, service


def extract_subtotal(text: str) -> Optional[Decimal]:
    """Extract subtotal from receipt."""
    patterns = [
        r'(?:sub\s*total|subtotal)[:\s]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                subtotal_str = match.group(1).replace(".", "").replace(",", "")
                subtotal = Decimal(subtotal_str)
                if 100 <= subtotal <= 100000000000:
                    return subtotal
            except:
                continue
    
    return None


# ============================================
# Main Processing Function
# ============================================

async def process_receipt_image(image_content: bytes, receipt_url: Optional[str] = None) -> dict:
    """
    Process receipt image: perform OCR and extract transaction data.
    Uses configured OCR provider (Tesseract or Google Vision).
    Now includes itemized receipt parsing!
    """
    try:
        # Perform OCR
        text, provider = await perform_ocr(image_content)
        
        if not text:
            return {
                "amount": None,
                "merchant_name": None,
                "transaction_date": date.today(),
                "items": [],
                "subtotal": None,
                "tax": None,
                "service_charge": None,
                "raw_text": None,
                "confidence": 0.0,
                "receipt_url": receipt_url,
                "success": False,
                "message": "Could not extract text from image",
                "ocr_provider": provider
            }
        
        # Extract data from text
        amount = extract_amount(text)
        transaction_date = extract_date(text)
        merchant_name = extract_merchant(text)
        
        # NEW: Extract items, tax, service charge
        items = extract_items(text)
        subtotal = extract_subtotal(text)
        tax, service_charge = extract_tax_and_service(text)
        
        success = amount is not None
        
        # Google Vision generally has higher confidence
        confidence = 0.9 if provider == "google_vision" and success else (0.7 if success else 0.0)
        
        # If we found items, increase confidence
        if items and len(items) > 0:
            confidence = min(confidence + 0.1, 1.0)
        
        return {
            "amount": amount,
            "merchant_name": merchant_name,
            "transaction_date": transaction_date or date.today(),
            "items": items,
            "subtotal": subtotal,
            "tax": tax,
            "service_charge": service_charge,
            "raw_text": text[:1000] if text else None,  # Increased to 1000 chars
            "confidence": confidence,
            "receipt_url": receipt_url,
            "success": success,
            "message": f"Extracted {len(items)} items" if items else ("Data extracted successfully" if success else "Could not extract amount from receipt"),
            "ocr_provider": provider
        }
        
    except Exception as e:
        return {
            "amount": None,
            "merchant_name": None,
            "transaction_date": date.today(),
            "items": [],
            "subtotal": None,
            "tax": None,
            "service_charge": None,
            "raw_text": None,
            "confidence": 0.0,
            "receipt_url": receipt_url,
            "success": False,
            "message": str(e),
            "ocr_provider": settings.ocr_provider
        }


async def process_receipt(text: str, receipt_url: Optional[str] = None) -> dict:
    """
    Process already-extracted OCR text (legacy function for backward compatibility).
    """
    amount = extract_amount(text)
    transaction_date = extract_date(text)
    merchant_name = extract_merchant(text)
    
    success = amount is not None
    
    return {
        "amount": amount,
        "merchant_name": merchant_name,
        "transaction_date": transaction_date or date.today(),
        "raw_text": text[:500] if text else None,
        "confidence": 0.8 if success else 0.0,
        "receipt_url": receipt_url,
        "success": success,
        "message": "Data extracted successfully" if success else "Could not extract amount from receipt"
    }


def get_ocr_provider_info() -> dict:
    """Get information about current OCR provider configuration."""
    provider = settings.ocr_provider
    
    return {
        "current_provider": provider,
        "is_paid": provider == "google_vision",
        "description": (
            "Google Vision API (paid, more accurate)" 
            if provider == "google_vision" 
            else "Tesseract OCR (free, local processing)"
        ),
        "google_vision_configured": bool(settings.google_vision_api_key)
    }
