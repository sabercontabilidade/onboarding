"""
Router para dashboard e métricas de relacionamento
"""
from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.schemas import Agendamento, Visita, Cliente
from backend.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/relacionamento", tags=["dashboard"])

@router.get("/dashboard")
async def obter_dashboard_relacionamento(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtém dados completos do dashboard de relacionamento:
    - Próximos contatos
    - Visitas atrasadas  
    - Satisfação média
    - Métricas gerais
    """
    try:
        # Métricas principais
        metricas = DashboardService.obter_metricas_dashboard(db)
        
        # Próximos agendamentos
        proximos_contatos = DashboardService.obter_proximos_contatos(db, limit=10)
        
        # Agendamentos atrasados
        agendamentos_atrasados = DashboardService.obter_agendamentos_atrasados(db, limit=10)
        
        # Visitas recentes
        visitas_recentes = DashboardService.obter_visitas_recentes(db, limit=5)
        
        # Estatísticas de satisfação
        stats_satisfacao = DashboardService.obter_estatisticas_satisfacao(db)
        
        # Clientes sem contato recente
        clientes_sem_contato = DashboardService.obter_clientes_sem_contato(db, dias=30)
        
        return {
            "metricas": metricas,
            "proximos_contatos": proximos_contatos,
            "agendamentos_atrasados": agendamentos_atrasados,
            "visitas_recentes": visitas_recentes,
            "estatisticas_satisfacao": stats_satisfacao,
            "clientes_sem_contato_recente": clientes_sem_contato,
            "ultima_atualizacao": "now"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter dados do dashboard: {str(e)}"
        )

@router.get("/metricas")
async def obter_metricas(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtém apenas as métricas principais do dashboard
    """
    return DashboardService.obter_metricas_dashboard(db)

@router.get("/proximos-contatos", response_model=List[Agendamento])
async def obter_proximos_contatos(
    limit: int = Query(10, ge=1, le=50, description="Número máximo de agendamentos"),
    db: Session = Depends(get_db)
):
    """
    Obtém próximos agendamentos pendentes
    """
    return DashboardService.obter_proximos_contatos(db, limit)

@router.get("/agendamentos-atrasados", response_model=List[Agendamento])
async def obter_agendamentos_atrasados(
    limit: int = Query(10, ge=1, le=50, description="Número máximo de agendamentos"),
    db: Session = Depends(get_db)
):
    """
    Obtém agendamentos que passaram da data
    """
    return DashboardService.obter_agendamentos_atrasados(db, limit)

@router.get("/visitas-recentes", response_model=List[Visita])
async def obter_visitas_recentes(
    limit: int = Query(5, ge=1, le=20, description="Número máximo de visitas"),
    db: Session = Depends(get_db)
):
    """
    Obtém visitas recentes com suas avaliações
    """
    return DashboardService.obter_visitas_recentes(db, limit)

@router.get("/satisfacao")
async def obter_estatisticas_satisfacao(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Obtém estatísticas detalhadas de satisfação das visitas
    """
    return DashboardService.obter_estatisticas_satisfacao(db)

@router.get("/clientes-sem-contato", response_model=List[Cliente])
async def obter_clientes_sem_contato(
    dias: int = Query(30, ge=1, le=365, description="Dias sem contato"),
    db: Session = Depends(get_db)
):
    """
    Obtém clientes que não têm contato há X dias
    """
    return DashboardService.obter_clientes_sem_contato(db, dias)