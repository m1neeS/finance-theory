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

INDONESIAN_MONTHS = {
    'januari': 1, 'jan': 1, 'februari': 2, 'feb': 2, 'maret': 3, 'mar': 3,
    'april': 4, 'apr': 4, 'mei': 5, 'juni': 6, 'jun': 6, 'juli': 7, 'jul': 7,
    'agustus': 8, 'agu': 8, 'ags': 8, 'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'okt': 10, 'november': 11, 'nov': 11, 'desember': 12, 'des': 12
}


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
        public_url = supabase.storage.from_("receipts").get_public_url(unique_filename)
        return public_url
    except Exception as e:
        print(f"Upload error: {e}")
        return None


def preprocess_image(image):
    """Preprocess image for better OCR accuracy."""
    from PIL import Image, ImageEnhance, ImageFilter
    
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    
    min_width = 1000
    if image.width < min_width:
        ratio = min_width / image.width
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    if image.mode != 'L':
        image = image.convert('L')
    
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)
    
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    threshold = 140
    image = image.point(lambda x: 255 if x > threshold else 0, mode='1')
    
    return image


async def ocr_with_tesseract(image_content: bytes) -> str:
    """Extract text from image using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        import io
        import os
        
        if os.name == 'nt':
            tesseract_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]
            for path in tesseract_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    break
        
        image = Image.open(io.BytesIO(image_content))
        processed_image = preprocess_image(image)
        custom_config = r'--psm 6 --oem 3 -c preserve_interword_spaces=1'
        
        try:
            text = pytesseract.image_to_string(processed_image, lang='ind+eng', config=custom_config)
        except:
            text = pytesseract.image_to_string(processed_image, lang='eng', config=custom_config)
        
        if not text.strip() or len(text.strip()) < 10:
            try:
                text = pytesseract.image_to_string(image, lang='ind+eng', config=custom_config)
            except:
                text = pytesseract.image_to_string(image, lang='eng', config=custom_config)
        
        return text
    except ImportError:
        raise Exception("Tesseract not installed.")
    except Exception as e:
        raise Exception(f"Tesseract OCR error: {str(e)}")


async def ocr_with_google_vision(image_content: bytes) -> str:
    """Extract text from image using Google Cloud Vision API."""
    if not settings.GOOGLE_VISION_API_KEY:
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
            f"https://vision.googleapis.com/v1/images:annotate?key={settings.GOOGLE_VISION_API_KEY}",
            json=request_body,
            timeout=30.0
        )
        
        if response.status_code != 200:
            raise Exception(f"Google Vision API error: {response.text}")
        
        result = response.json()
        
        if "responses" in result and result["responses"]:
            annotations = result["responses"][0].get("textAnnotations", [])
            if annotations:
                return annotations[0].get("description", "")
        
        return ""


async def perform_ocr(image_content: bytes, use_google_vision: bool = False) -> str:
    """Perform OCR using the specified provider."""
    if use_google_vision and settings.GOOGLE_VISION_API_KEY:
        return await ocr_with_google_vision(image_content)
    return await ocr_with_tesseract(image_content)


def extract_amount(text: str) -> Optional[Decimal]:
    """Extract total amount from receipt text."""
    patterns = [
        r'(?:TOTAL|GRAND\s*TOTAL|AMOUNT|JUMLAH|BAYAR|TUNAI|CASH|DEBIT|KREDIT|PAYMENT)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
        r'(?:Rp\.?|IDR)\s*([\d.,]+)\s*(?:TOTAL|GRAND|BAYAR)',
        r'(?:TOTAL|GRAND\s*TOTAL)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
        r'(?:Rp\.?|IDR)\s*([\d]{1,3}(?:[.,]\d{3})+)',
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
    """Extract date from receipt text."""
    patterns = [
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', 'dmy'),
        (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', 'ymd'),
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b', 'dmy_short'),
        (r'(\d{1,2})\s+(' + '|'.join(INDONESIAN_MONTHS.keys()) + r')\s+(\d{4})', 'indo'),
        (r'(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})', 'eng'),
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
                    year = int(groups[2])
                    year = 2000 + year if year < 100 else year
                    return date(year, int(groups[1]), int(groups[0]))
                elif fmt == 'indo':
                    month = INDONESIAN_MONTHS.get(groups[1].lower(), 1)
                    return date(int(groups[2]), month, int(groups[0]))
                elif fmt == 'eng':
                    month_map = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
                    month = month_map.get(groups[1].lower()[:3], 1)
                    return date(int(groups[2]), month, int(groups[0]))
            except:
                continue
    
    return None


def extract_recipient(text: str) -> Optional[str]:
    """Extract recipient/payee from receipt text."""
    patterns = [
        r'(?:TRANSFER\s+KE|KIRIM\s+KE|PENERIMA|RECIPIENT|TO|KEPADA)[\s:]+([A-Za-z\s]+)',
        r'(?:NAMA|NAME)[\s:]+([A-Za-z\s]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            recipient = match.group(1).strip()
            if len(recipient) > 2:
                return recipient[:50]
    
    return None


def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant/store name from receipt text."""
    lines = text.strip().split('\n')
    
    skip_words = ['struk', 'receipt', 'invoice', 'nota', 'kasir', 'tanggal', 'date', 'waktu', 'time']
    
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and not any(word in line.lower() for word in skip_words):
            if not re.match(r'^[\d\s:/-]+$', line):
                return line[:100]
    
    return None


def extract_items(text: str) -> list:
    """Extract individual items from receipt text with improved patterns."""
    items = []
    lines = text.split('\n')
    
    skip_keywords = [
        'TOTAL', 'SUBTOTAL', 'GRAND', 'TAX', 'PPN', 'PAJAK', 'DISKON', 'DISCOUNT',
        'TUNAI', 'CASH', 'KEMBALI', 'CHANGE', 'TERIMA KASIH', 'THANK', 'SELAMAT',
        'WELCOME', 'STRUK', 'RECEIPT', 'INVOICE', 'NOTA', 'KASIR', 'TANGGAL',
        'DATE', 'WAKTU', 'TIME', 'ALAMAT', 'ADDRESS', 'TELP', 'PHONE', 'FAX',
        'EMAIL', 'NPWP'
    ]
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Skip lines with keywords
        line_upper = line.upper()
        should_skip = False
        for kw in skip_keywords:
            if kw in line_upper:
                should_skip = True
                break
        if should_skip:
            continue
        
        # Skip separator lines
        if re.match(r'^[-=*]+$', line):
            continue
        
        # Skip lines that are just currency amounts
        if re.match(r'^(?:Rp\.?|IDR)?\s*[\d.,]+$', line, re.IGNORECASE):
            continue
        
        # Pattern 1: "Item Name    25.000" (multiple spaces separator)
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
        
        # Pattern 2: "2 x Item Name @ 15.000    30.000" (qty x name @ unit_price total)
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
        
        # Pattern 3: "Item Name 2 @ 15.000" (qty after name)
        match = re.match(r'^(.+?)\s+(\d+)\s*@\s*([\d.,]+)$', line)
        if match:
            name, qty, price = match.groups()
            name = name.strip()
            if len(name) > 2:
                try:
                    price_clean = price.replace('.', '').replace(',', '')
                    if price_clean.isdigit() and int(price_clean) >= 100:
                        total = int(price_clean) * int(qty)
                        items.append({"name": name[:100], "price": total, "quantity": int(qty)})
                        continue
                except:
                    pass
        
        # Pattern 4: "Item Name   Rp 25.000"
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
        
        # Pattern 5: "1 Item Name 25.000" (qty at start, minimarket style)
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
        
        # Pattern 6: "Item Name 25000" (no dots, simple format)
        match = re.match(r'^(.+?)\s+(\d{4,})$', line)
        if match:
            name, price = match.groups()
            name = name.strip()
            if len(name) > 2 and not re.match(r'^[\d\s]+$', name):
                try:
                    if int(price) >= 100:
                        items.append({"name": name[:100], "price": int(price), "quantity": 1})
                        continue
                except:
                    pass
        
        # Pattern 7: Tab-separated items
        if '\t' in line:
            parts = line.split('\t')
            if len(parts) >= 2:
                name = parts[0].strip()
                price_str = parts[-1].strip()
                if len(name) > 2:
                    try:
                        price_clean = re.sub(r'[^\d]', '', price_str)
                        if price_clean and int(price_clean) >= 100:
                            items.append({"name": name[:100], "price": int(price_clean), "quantity": 1})
                            continue
                    except:
                        pass
    
    return items


def extract_tax_and_service(text: str) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """Extract tax and service charge from receipt."""
    tax = None
    service = None
    
    tax_patterns = [
        r'(?:TAX|PPN|PAJAK|VAT)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
        r'(?:Rp\.?|IDR)?\s*([\d.,]+)\s*(?:TAX|PPN|PAJAK)',
    ]
    
    for pattern in tax_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                clean = match.group(1).replace(".", "").replace(",", "")
                if clean.isdigit():
                    tax = Decimal(clean)
                    break
            except:
                continue
    
    service_patterns = [
        r'(?:SERVICE|SERVIS|SC)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
    ]
    
    for pattern in service_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                clean = match.group(1).replace(".", "").replace(",", "")
                if clean.isdigit():
                    service = Decimal(clean)
                    break
            except:
                continue
    
    return tax, service


def extract_subtotal(text: str) -> Optional[Decimal]:
    """Extract subtotal from receipt."""
    patterns = [
        r'(?:SUBTOTAL|SUB\s*TOTAL|SUB-TOTAL)[\s:]*(?:Rp\.?|IDR)?\s*([\d.,]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                clean = match.group(1).replace(".", "").replace(",", "")
                if clean.isdigit():
                    return Decimal(clean)
            except:
                continue
    
    return None


async def process_receipt_image(
    image_content: bytes,
    use_google_vision: bool = False
) -> dict:
    """Process receipt image and extract structured data."""
    raw_text = await perform_ocr(image_content, use_google_vision)
    
    amount = extract_amount(raw_text)
    transaction_date = extract_date(raw_text)
    recipient = extract_recipient(raw_text)
    merchant = extract_merchant(raw_text)
    items = extract_items(raw_text)
    tax, service = extract_tax_and_service(raw_text)
    subtotal = extract_subtotal(raw_text)
    
    return {
        "raw_text": raw_text,
        "amount": float(amount) if amount else None,
        "date": transaction_date.isoformat() if transaction_date else None,
        "recipient": recipient,
        "merchant": merchant,
        "items": items,
        "tax": float(tax) if tax else None,
        "service_charge": float(service) if service else None,
        "subtotal": float(subtotal) if subtotal else None,
        "ocr_provider": "google_vision" if use_google_vision else "tesseract"
    }


async def process_receipt(
    user_id: str,
    file_content: bytes,
    filename: str,
    use_google_vision: bool = False
) -> dict:
    """Full receipt processing: upload, OCR, and data extraction."""
    is_valid, error_msg = validate_file(filename, len(file_content))
    if not is_valid:
        raise ValueError(error_msg)
    
    receipt_url = await upload_receipt(user_id, file_content, filename)
    
    ocr_result = await process_receipt_image(file_content, use_google_vision)
    ocr_result["receipt_url"] = receipt_url
    
    return ocr_result


def get_ocr_provider_info() -> dict:
    """Get information about available OCR providers."""
    return {
        "tesseract": {
            "available": True,
            "description": "Free, open-source OCR engine",
            "accuracy": "Good for clear receipts"
        },
        "google_vision": {
            "available": bool(settings.GOOGLE_VISION_API_KEY),
            "description": "Google Cloud Vision API (requires API key)",
            "accuracy": "Excellent for all receipt types"
        },
        "default": "google_vision" if settings.GOOGLE_VISION_API_KEY else "tesseract"
    }
