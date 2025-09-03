"""
Router para gerenciamento de visitas (relacionamento)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.schemas import Visita, VisitaCreate, VisitaUpdate
from backend.models import Visita as VisitaModel

router = APIRouter(prefix="/api/v1/visitas", tags=["visitas"])

@router.post("/", response_model=Visita, status_code=status.HTTP_201_CREATED)
async def criar_visita(
    visita_data: VisitaCreate,
    db: Session = Depends(get_db)
):
    """
    Cria uma nova visita técnica
    """
    try:
        visita = VisitaModel(**visita_data.model_dump())
        db.add(visita)
        db.commit()
        db.refresh(visita)
        return visita
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar visita: {str(e)}"
        )

@router.put("/{visita_id}", response_model=Visita)
async def atualizar_visita(
    visita_id: int,
    visita_data: VisitaUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza uma visita existente
    """
    # Busca a visita
    visita = db.query(VisitaModel).filter(VisitaModel.id == visita_id).first()
    if not visita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visita não encontrada"
        )
    
    try:
        # Atualiza campos da visita
        update_data = visita_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(visita, field, value)
        
        db.commit()
        db.refresh(visita)
        return visita
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar visita: {str(e)}"
        )

@router.get("/{visita_id}", response_model=Visita)
async def obter_visita(
    visita_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de uma visita específica
    """
    visita = db.query(VisitaModel).filter(VisitaModel.id == visita_id).first()
    if not visita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visita não encontrada"
        )
    return visita

@router.get("/", response_model=List[Visita])
async def listar_visitas(
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    tipo_visita: Optional[str] = Query(None, description="Filtrar por tipo de visita"),
    satisfacao_min: Optional[int] = Query(None, ge=1, le=10, description="Satisfação mínima"),
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros"),
    db: Session = Depends(get_db)
):
    """
    Lista visitas com filtros opcionais
    """
    query = db.query(VisitaModel)
    
    if cliente_id:
        query = query.filter(VisitaModel.cliente_id == cliente_id)
    
    if tipo_visita:
        query = query.filter(VisitaModel.tipo_visita == tipo_visita)
    
    if satisfacao_min:
        query = query.filter(VisitaModel.satisfacao >= satisfacao_min)
    
    return query.order_by(VisitaModel.data.desc()).offset(skip).limit(limit).all()

@router.delete("/{visita_id}")
async def excluir_visita(
    visita_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove uma visita do sistema
    """
    visita = db.query(VisitaModel).filter(VisitaModel.id == visita_id).first()
    if not visita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visita não encontrada"
        )
    
    try:
        db.delete(visita)
        db.commit()
        return {"message": "Visita excluída com sucesso"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao excluir visita: {str(e)}"
        )