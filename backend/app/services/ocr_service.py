"""
OCR Service - Receipt image processing and data extraction.
Supports: Tesseract (default, free) and Google Vision API (premium)
"""

import re
import base64
import httpx
from decimal import Decimal
from datetime import date
from typing import Optional, Tuple, List, Dict, Any
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
    from PIL import Image, ImageEnhance, ImageFilter
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    min_width = 1200
    if image.width < min_width:
        ratio = min_width / image.width
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    if image.mode != 'L':
        image = image.convert('L')
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.8)
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    return image


async def ocr_with_tesseract(image_content: bytes) -> str:
    try:
        import pytesseract
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_content))
        processed = preprocess_image(image)
        config = r'--psm 6 --oem 3 -c preserve_interword_spaces=1'
        try:
            text = pytesseract.image_to_string(processed, lang='ind+eng', config=config)
        except:
            text = pytesseract.image_to_string(processed, lang='eng', config=config)
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
        url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        response = await client.post(url, json=request_body, timeout=30.0)
        if response.status_code != 200:
            raise Exception(f"Google Vision error: {response.text}")
        result = response.json()
        if "responses" in result and result["responses"]:
            annotations = result["responses"][0].get("textAnnotations", [])
            if annotations:
                return annotations[0].get("description", "")
        return ""


async def perform_ocr(image_content: bytes, provider: str = "tesseract") -> str:
    if provider == "google_vision":
        return await ocr_with_google_vision(image_content)
    return await ocr_with_tesseract(image_content)


def extract_amount(text: str) -> Optional[Decimal]:
    amount_keywords = r'(?:TOTAL|GRAND\s*TOTAL|AMOUNT|JUMLAH|BAYAR|TUNAI|CASH|DEBIT|KREDIT|PAYMENT)'
    currency = r'(?:Rp\.?|IDR)?'
    number = r'([\d.,]+)'
    
    patterns = [
        amount_keywords + r'[\s:]*' + currency + r'\s*' + number,
        currency + r'\s*' + number + r'\s*(?:TOTAL|GRAND|BAYAR)',
        r'(?:TOTAL|GRAND\s*TOTAL)[\s:]*' + currency + r'\s*' + number,
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
    month_pattern = '|'.join(INDONESIAN_MONTHS.keys())
    patterns = [
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', 'dmy'),
        (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', 'ymd'),
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b', 'dmy_short'),
        (r'(\d{1,2})\s+(' + month_pattern + r')\s+(\d{4})', 'indo'),
        (r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})', 'eng_short'),
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
                elif fmt == 'eng_short':
                    eng_months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
                    month = eng_months.get(groups[1].lower(), 1)
                    year = int(groups[2])
                    if year < 100:
                        year = 2000 + year
                    return date(year, month, int(groups[0]))
            except:
                continue
    return None


def extract_merchant(text: str) -> Optional[str]:
    lines = text.strip().split('\n')
    skip_words = ['struk', 'receipt', 'invoice', 'nota', 'kasir', 'tanggal', 'date', 'waktu', 'time', 'npwp', 'pos', 'check']
    digits_only_pattern = re.compile(r'^[\d\s:/-]+$')
    
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and not any(word in line.lower() for word in skip_words):
            if not digits_only_pattern.match(line):
                return line[:100]
    return None


def extract_items(text: str) -> List[Dict[str, Any]]:
    """
    Extract items from receipt text with multiple pattern matching.
    Supports various Indonesian receipt formats.
    """
    items = []
    lines = text.strip().split('\n')
    
    skip_keywords = [
        'total', 'subtotal', 'sub total', 'grand', 'tax', 'pajak', 'ppn', 'service',
        'diskon', 'discount', 'tunai', 'cash', 'kembalian', 'change', 'bayar',
        'payment', 'debit', 'kredit', 'credit', 'card', 'kartu', 'member',
        'tanggal', 'date', 'waktu', 'time', 'kasir', 'cashier', 'struk', 'receipt',
        'check no', 'pos', 'thank', 'terima kasih', 'please', 'silakan', 'npwp',
        'alamat', 'address', 'telp', 'phone', 'www', 'http', '.com', '.id'
    ]
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
        
        line_lower = line.lower()
        if any(kw in line_lower for kw in skip_keywords):
            continue
        
        item = try_extract_item(line)
        if item:
            items.append(item)
    
    return items


def try_extract_item(line: str) -> Optional[Dict[str, Any]]:
    """Try multiple patterns to extract item from a line."""
    
    # Pattern 1: "1 Item Name    11,500" or "1 Item Name 11.500"
    # Format: qty name price (BreadTalk style)
    m = re.match(r'^(\d+)\s+(.+?)\s{2,}([\d.,]+)$', line)
    if m:
        qty, name, price = m.groups()
        return make_item(name, int(qty), price)
    
    # Pattern 2: "1 Item Name 11,500" (single space)
    m = re.match(r'^(\d+)\s+(.+?)\s+([\d]{1,3}[.,][\d]{3})$', line)
    if m:
        qty, name, price = m.groups()
        return make_item(name, int(qty), price)
    
    # Pattern 3: "Item Name    11,500" (no qty)
    m = re.match(r'^([A-Za-z].+?)\s{2,}([\d.,]+)$', line)
    if m:
        name, price = m.groups()
        return make_item(name, 1, price)
    
    # Pattern 4: "Item Name x2 22,000" or "Item Name X2 22.000"
    m = re.match(r'^(.+?)\s*[xX](\d+)\s+([\d.,]+)$', line)
    if m:
        name, qty, price = m.groups()
        return make_item(name, int(qty), price)
    
    # Pattern 5: "Item Name 2x11,000 22,000" (qty x unit_price total)
    m = re.match(r'^(.+?)\s+(\d+)\s*[xX]\s*([\d.,]+)\s+([\d.,]+)$', line)
    if m:
        name, qty, unit_price, total = m.groups()
        return make_item(name, int(qty), total)
    
    # Pattern 6: "Item Name @ 11,000 x 2 22,000"
    m = re.match(r'^(.+?)\s*@\s*([\d.,]+)\s*[xX]\s*(\d+)\s+([\d.,]+)$', line)
    if m:
        name, unit_price, qty, total = m.groups()
        return make_item(name, int(qty), total)
    
    # Pattern 7: "Item Name Rp 11.500" or "Item Name Rp11,500"
    m = re.match(r'^(.+?)\s+(?:Rp\.?|IDR)\s*([\d.,]+)$', line, re.IGNORECASE)
    if m:
        name, price = m.groups()
        return make_item(name, 1, price)
    
    # Pattern 8: Simple "Item Name 11500" (no separator)
    m = re.match(r'^([A-Za-z][A-Za-z\s]+?)\s+(\d{4,})$', line)
    if m:
        name, price = m.groups()
        return make_item(name, 1, price)
    
    return None


def make_item(name: str, qty: int, price_str: str) -> Optional[Dict[str, Any]]:
    """Create item dict with validation."""
    name = name.strip()
    
    # Clean name - remove trailing numbers/special chars
    name = re.sub(r'[\d.,]+$', '', name).strip()
    name = re.sub(r'^[\d\s]+', '', name).strip()
    
    if len(name) < 2:
        return None
    
    # Parse price
    price_clean = price_str.replace(".", "").replace(",", "")
    if not price_clean.isdigit():
        return None
    
    price = int(price_clean)
    
    # Validate price range (100 - 100jt)
    if price < 100 or price > 100000000:
        return None
    
    return {
        "name": name,
        "quantity": qty,
        "price": price,
        "selected": True
    }


def extract_tax_and_service(text: str) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    tax = None
    service = None
    
    tax_pattern = re.compile(r'(?:TAX|PAJAK|PPN|VAT)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)', re.IGNORECASE)
    service_pattern = re.compile(r'(?:SERVICE|SERVIS|SVC)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)', re.IGNORECASE)
    
    tax_match = tax_pattern.search(text)
    if tax_match:
        try:
            clean = tax_match.group(1).replace(".", "").replace(",", "")
            if clean.isdigit():
                tax = Decimal(clean)
        except:
            pass
    
    service_match = service_pattern.search(text)
    if service_match:
        try:
            clean = service_match.group(1).replace(".", "").replace(",", "")
            if clean.isdigit():
                service = Decimal(clean)
        except:
            pass
    
    return tax, service


async def process_receipt_image(image_content: bytes, provider: str = "tesseract") -> Dict[str, Any]:
    raw_text = await perform_ocr(image_content, provider)
    
    amount = extract_amount(raw_text)
    transaction_date = extract_date(raw_text)
    merchant = extract_merchant(raw_text)
    items = extract_items(raw_text)
    tax, service_charge = extract_tax_and_service(raw_text)
    
    return {
        "amount": float(amount) if amount else None,
        "date": transaction_date.isoformat() if transaction_date else None,
        "merchant": merchant,
        "items": items,
        "tax": float(tax) if tax else None,
        "service_charge": float(service_charge) if service_charge else None,
        "raw_text": raw_text,
        "ocr_provider": provider
    }


async def process_receipt(user_id: str, file_content: bytes, filename: str, provider: str = "tesseract") -> Dict[str, Any]:
    receipt_url = await upload_receipt(user_id, file_content, filename)
    result = await process_receipt_image(file_content, provider)
    result["receipt_url"] = receipt_url
    return result


def get_ocr_provider_info() -> Dict[str, Any]:
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
        "default_provider": "tesseract"
    }
