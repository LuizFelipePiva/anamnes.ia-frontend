"""
Supabase client dependency for dependency injection.
Allows easier testing and mocking.
"""
from supabase import Client, create_client

from app.config import SUPABASE_KEY, SUPABASE_URL


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    
    This function is designed to be used as a FastAPI dependency,
    making it easy to mock in tests.
    
    Returns:
        Client: Configured Supabase client instance
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)
