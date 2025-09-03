"""
Router para gerenciamento de clientes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.schemas import (
    Cliente, ClienteCreate, ClienteUpdate, 
    Contato, Agendamento, Visita
)
from backend.services.cliente_service import ClienteService

router = APIRouter(prefix="/api/v1/clientes", tags=["clientes"])

@router.post("/", response_model=Cliente, status_code=status.HTTP_201_CREATED)
async def criar_cliente(
    cliente_data: ClienteCreate,
    db: Session = Depends(get_db)
):
    """
    Cria um novo cliente e gera agendamentos obrigatórios (D+15, D+50, D+80, D+100, D+180)
    """
    try:
        cliente = ClienteService.criar_cliente(db, cliente_data)
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar cliente: {str(e)}"
        )

@router.put("/{cliente_id}", response_model=Cliente)
async def atualizar_cliente(
    cliente_id: int,
    cliente_data: ClienteUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza cliente. Se datas forem adicionadas, cria ou atualiza agendamentos
    """
    cliente = ClienteService.atualizar_cliente(db, cliente_id, cliente_data)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    return cliente

@router.get("/", response_model=List[Cliente])
async def buscar_clientes(
    termo_busca: Optional[str] = Query(None, description="Busca por nome ou CNPJ"),
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    db: Session = Depends(get_db)
):
    """
    Busca clientes por nome ou CNPJ
    """
    return ClienteService.buscar_clientes(db, termo_busca, skip, limit)

@router.get("/{cliente_id}", response_model=Cliente)
async def obter_cliente(
    cliente_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes completos de um cliente
    """
    cliente = ClienteService.obter_cliente_completo(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    return cliente

@router.get("/{cliente_id}/contatos", response_model=List[Contato])
async def obter_contatos_cliente(
    cliente_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém todos os contatos de um cliente
    """
    # Verifica se cliente existe
    cliente = ClienteService.obter_cliente_completo(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return ClienteService.obter_contatos_cliente(db, cliente_id)

@router.get("/{cliente_id}/agendamentos", response_model=List[Agendamento])
async def obter_agendamentos_cliente(
    cliente_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém todos os agendamentos de um cliente
    """
    # Verifica se cliente existe
    cliente = ClienteService.obter_cliente_completo(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return ClienteService.obter_agendamentos_cliente(db, cliente_id)

@router.get("/{cliente_id}/visitas", response_model=List[Visita])
async def obter_visitas_cliente(
    cliente_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém todas as visitas de um cliente
    """
    # Verifica se cliente existe
    cliente = ClienteService.obter_cliente_completo(db, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return ClienteService.obter_visitas_cliente(db, cliente_id)