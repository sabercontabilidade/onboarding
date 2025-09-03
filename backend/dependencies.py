"""
Dependências compartilhadas da aplicação
"""
from sqlalchemy.orm import Session
from backend.database import SessionLocal

def get_db():
    """Dependency para obter sessão do banco de dados"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()