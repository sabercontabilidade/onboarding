"""
Router para gerenciamento de agendamentos
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.schemas import Agendamento, AgendamentoCreate, AgendamentoUpdate
from backend.models import Agendamento as AgendamentoModel, Usuario
from backend.services.google_service import GoogleService

router = APIRouter(prefix="/api/v1/agendamentos", tags=["agendamentos"])

@router.post("/", response_model=Agendamento, status_code=status.HTTP_201_CREATED)
async def criar_agendamento(
    agendamento_data: AgendamentoCreate,
    db: Session = Depends(get_db)
):
    """
    Cria agendamento manual (tipo customizado)
    """
    try:
        agendamento = AgendamentoModel(**agendamento_data.model_dump())
        db.add(agendamento)
        db.commit()
        db.refresh(agendamento)
        return agendamento
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar agendamento: {str(e)}"
        )

@router.put("/{agendamento_id}", response_model=Agendamento)
async def atualizar_agendamento(
    agendamento_id: int,
    agendamento_data: AgendamentoUpdate,
    db: Session = Depends(get_db)
):
    """
    Reagenda e atualiza Google Calendar (se estiver conectado)
    """
    # Busca o agendamento
    agendamento = db.query(AgendamentoModel).filter(
        AgendamentoModel.id == agendamento_id
    ).first()
    
    if not agendamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    
    try:
        # Atualiza campos do agendamento
        update_data = agendamento_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agendamento, field, value)
        
        # TODO: Integração com Google Calendar
        # if agendamento.google_event_id:
        #     await atualizar_evento_google_calendar(agendamento)
        
        db.commit()
        db.refresh(agendamento)
        return agendamento
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar agendamento: {str(e)}"
        )

@router.get("/{agendamento_id}", response_model=Agendamento)
async def obter_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de um agendamento específico
    """
    agendamento = db.query(AgendamentoModel).filter(
        AgendamentoModel.id == agendamento_id
    ).first()
    
    if not agendamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    return agendamento

@router.get("/", response_model=List[Agendamento])
async def listar_agendamentos(
    status_filter: Optional[str] = Query(None, description="Filtrar por status"),
    tipo_filter: Optional[str] = Query(None, description="Filtrar por tipo"),
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    db: Session = Depends(get_db)
):
    """
    Lista agendamentos com filtros opcionais
    """
    query = db.query(AgendamentoModel)
    
    if status_filter:
        query = query.filter(AgendamentoModel.status == status_filter)
    
    if tipo_filter:
        query = query.filter(AgendamentoModel.tipo == tipo_filter)
    
    return query.order_by(AgendamentoModel.data_agendada.asc()).offset(skip).limit(limit).all()

@router.get("/disponibilidade/{user_id}")
async def consultar_disponibilidade(
    user_id: int,
    days_ahead: int = Query(7, ge=1, le=30, description="Dias para frente a consultar"),
    db: Session = Depends(get_db)
):
    """
    Consulta disponibilidade no Google Calendar dentro do horário comercial (8h-18h)
    """
    # Verificar se o usuário existe
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Obter credenciais do usuário
    credentials = GoogleService.get_user_credentials(db, user_id)
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário não possui credenciais do Google Calendar válidas. Configure a integração com o Google primeiro."
        )
    
    try:
        # Definir período de consulta
        start_date = datetime.now()
        end_date = start_date + timedelta(days=days_ahead)
        
        # Consultar slots disponíveis
        available_slots = GoogleService.get_available_slots(
            credentials=credentials,
            start_date=start_date,
            end_date=end_date,
            business_hours_start=8,
            business_hours_end=18,
            slot_duration_minutes=60
        )
        
        return {
            "user_id": user_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "business_hours": {
                "start": "08:00",
                "end": "18:00"
            },
            "slot_duration_minutes": 60,
            "available_slots": available_slots,
            "total_slots": len(available_slots)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao consultar disponibilidade: {str(e)}"
        )

@router.delete("/{agendamento_id}")
async def cancelar_agendamento(
    agendamento_id: int,
    db: Session = Depends(get_db)
):
    """
    Cancela um agendamento (marca como CANCELADO)
    """
    agendamento = db.query(AgendamentoModel).filter(
        AgendamentoModel.id == agendamento_id
    ).first()
    
    if not agendamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    
    try:
        agendamento.status = "CANCELADO"
        
        # TODO: Cancelar no Google Calendar se necessário
        # if agendamento.google_event_id:
        #     await cancelar_evento_google_calendar(agendamento)
        
        db.commit()
        return {"message": "Agendamento cancelado com sucesso"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao cancelar agendamento: {str(e)}"
        )