"""
Configuração da aplicação SABER Onboarding
"""
import os
from pydantic_settings import BaseSettings
from cryptography.fernet import Fernet

class Settings(BaseSettings):
    """Configurações da aplicação"""
    database_url: str = "sqlite:///./saber_onboarding.db"
    secret_key: str = Fernet.generate_key().decode()
    timezone: str = "America/Sao_Paulo"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Força SQLite independente da env var DATABASE_URL
        self.database_url = "sqlite:///./backend/saber_onboarding.db"
    
    class Config:
        env_file = ".env"

settings = Settings()

# Fernet para criptografia dos tokens Google
fernet = Fernet(settings.secret_key.encode())