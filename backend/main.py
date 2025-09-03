"""
Aplicação principal SABER Onboarding
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine
from backend import models

# Importar routers
from backend.routers import clientes, contatos, agendamentos, visitas, dashboard

# Criar todas as tabelas (caso não existam)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SABER Onboarding API",
    description="Sistema de gerenciamento de onboarding e relacionamento com clientes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS para permitir requisições do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar URLs específicas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers versionados
app.include_router(clientes.router)
app.include_router(contatos.router)
app.include_router(agendamentos.router)
app.include_router(visitas.router)
app.include_router(dashboard.router)

@app.get("/")
async def root():
    """Endpoint de verificação da API"""
    return {
        "message": "SABER Onboarding API está funcionando!",
        "version": "1.0.0",
        "database": "SQLite com SQLAlchemy",
        "timezone": "America/Sao_Paulo",
        "rotas_disponiveis": {
            "clientes": "/api/v1/clientes",
            "contatos": "/api/v1/contatos", 
            "agendamentos": "/api/v1/agendamentos",
            "visitas": "/api/v1/visitas",
            "dashboard": "/api/v1/relacionamento",
            "documentacao": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Endpoint de saúde da aplicação"""
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)