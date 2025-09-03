"""
Router para monitoramento e controle dos jobs automáticos
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from backend.jobs.scheduler import job_scheduler

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

@router.get("/status")
async def get_jobs_status() -> Dict[str, Any]:
    """
    Obtém status de todos os jobs automáticos
    """
    try:
        return job_scheduler.get_job_status()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status dos jobs: {str(e)}"
        )

@router.post("/run/{job_id}")
async def run_job_manually(job_id: str):
    """
    Executa um job específico manualmente
    
    Jobs disponíveis:
    - sync_agendamentos: Sincroniza agendamentos com Google Calendar
    - remind_today: Envia lembretes diários
    """
    valid_jobs = ["sync_agendamentos", "remind_today"]
    
    if job_id not in valid_jobs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job inválido. Jobs disponíveis: {valid_jobs}"
        )
    
    try:
        success = job_scheduler.run_job_now(job_id)
        if success:
            return {"message": f"Job {job_id} executado com sucesso"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha ao executar job {job_id}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao executar job {job_id}: {str(e)}"
        )

@router.get("/info")
async def get_jobs_info():
    """
    Informações sobre os jobs automáticos configurados
    """
    return {
        "jobs_configurados": [
            {
                "id": "sync_agendamentos",
                "nome": "Sincronizar Agendamentos",
                "descricao": "Busca agendamentos pendentes e cria eventos no Google Calendar",
                "frequencia": "A cada hora",
                "funcionalidades": [
                    "Busca agendamentos dos próximos 30 dias sem google_event_id",
                    "Cria evento no Google Calendar",
                    "Envia e-mail de confirmação para o cliente",
                    "Salva google_event_id no banco"
                ]
            },
            {
                "id": "remind_today",
                "nome": "Lembretes Diários",
                "descricao": "Envia e-mail com agendamentos do dia para cada responsável",
                "frequencia": "Diariamente às 08:00 (America/Sao_Paulo)",
                "funcionalidades": [
                    "Busca agendamentos pendentes do dia",
                    "Agrupa por responsável",
                    "Envia e-mail com lista formatada",
                    "Inclui dicas e estatísticas"
                ]
            }
        ],
        "timezone": "America/Sao_Paulo",
        "configuracoes": {
            "max_instances_por_job": 1,
            "coalesce": True,
            "thread_pool_size": 20
        }
    }