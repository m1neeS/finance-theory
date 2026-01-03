from pydantic_settings import BaseSettings
from typing import Literal, Optional

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str = ""
    
    # OCR Configuration
    ocr_provider: Literal["tesseract", "google_vision"] = "tesseract"
    google_vision_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()  # lowercase 's' untuk instance