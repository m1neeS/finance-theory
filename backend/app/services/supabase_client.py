from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Get Supabase client for regular operations"""
    return create_client(settings.supabase_url, settings.supabase_key)

def get_supabase_admin_client() -> Client:
    """Get Supabase client with service role for admin operations (bypasses RLS)"""
    if settings.supabase_service_key:
        return create_client(settings.supabase_url, settings.supabase_service_key)
    return get_supabase_client()

# Use admin client to bypass RLS (backend handles auth via JWT)
supabase: Client = get_supabase_admin_client()