"""
Aplicação principal SABER Onboarding
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine
from backend import models

# Importar routers
from backend.routers import clientes, contatos, agendamentos, visitas, dashboard, jobs, integrations

# Importar scheduler
from backend.jobs.scheduler import job_scheduler

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Criar todas as tabelas (caso não existam)
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    # Startup
    logging.info("Iniciando aplicação SABER Onboarding...")
    job_scheduler.start()
    
    yield
    
    # Shutdown
    logging.info("Parando aplicação SABER Onboarding...")
    job_scheduler.shutdown()

app = FastAPI(
    title="SABER Onboarding API",
    description="Sistema de gerenciamento de onboarding e relacionamento com clientes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
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
app.include_router(jobs.router)
app.include_router(integrations.router)

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
            "jobs": "/api/v1/jobs",
            "documentacao": "/docs"
        },
        "jobs_automaticos": {
            "sync_agendamentos": "Executa a cada hora",
            "remind_today": "Executa diariamente às 08:00"
        }
    }

@app.get("/health")
async def health_check():
    """Endpoint de saúde da aplicação"""
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)