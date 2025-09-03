"""
Router para gerenciamento de contatos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.schemas import Contato, ContatoCreate, ContatoUpdate
from backend.models import Contato as ContatoModel
from backend.services.agendamento_service import AgendamentoService

router = APIRouter(prefix="/api/v1/contatos", tags=["contatos"])

@router.post("/", response_model=Contato, status_code=status.HTTP_201_CREATED)
async def criar_contato(
    contato_data: ContatoCreate,
    db: Session = Depends(get_db)
):
    """
    Cria contato e marca agendamento correspondente como CONCLUIDO (se existir)
    """
    try:
        # Cria o contato
        contato = ContatoModel(**contato_data.model_dump())
        db.add(contato)
        db.commit()
        db.refresh(contato)
        
        # Marca agendamento correspondente como concluído
        AgendamentoService.marcar_agendamento_concluido(
            db, contato.cliente_id, contato.tipo
        )
        
        return contato
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar contato: {str(e)}"
        )

@router.put("/{contato_id}", response_model=Contato)
async def atualizar_contato(
    contato_id: int,
    contato_data: ContatoUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza um contato existente
    """
    # Busca o contato
    contato = db.query(ContatoModel).filter(ContatoModel.id == contato_id).first()
    if not contato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contato não encontrado"
        )
    
    try:
        # Atualiza campos do contato
        update_data = contato_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contato, field, value)
        
        db.commit()
        db.refresh(contato)
        return contato
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao atualizar contato: {str(e)}"
        )

@router.get("/{contato_id}", response_model=Contato)
async def obter_contato(
    contato_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de um contato específico
    """
    contato = db.query(ContatoModel).filter(ContatoModel.id == contato_id).first()
    if not contato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contato não encontrado"
        )
    return contato