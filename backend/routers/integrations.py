"""
Router para integrações OAuth2 com serviços externos
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.dependencies import get_db
from backend.services.google_service import GoogleService
from backend.models import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

@router.get("/google/init")
async def google_oauth_init(
    user_id: int = Query(..., description="ID do usuário para conectar"),
    db: Session = Depends(get_db)
):
    """
    Inicia processo de consentimento OAuth2 com Google
    
    Redireciona usuário para página de consentimento do Google
    """
    try:
        # Verificar se usuário existe
        user = db.query(Usuario).filter(Usuario.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Criar fluxo OAuth2
        flow = GoogleService.create_oauth_flow()
        
        # Gerar URL de autorização com estado para identificar usuário
        authorization_url, state = flow.authorization_url(
            access_type='offline',  # Para obter refresh token
            include_granted_scopes='true',
            state=str(user_id)  # Incluir user_id no state
        )
        
        logger.info(f"Iniciando OAuth2 para usuário {user_id}")
        
        # Redirecionar para Google
        return RedirectResponse(url=authorization_url)
        
    except Exception as e:
        logger.error(f"Erro ao iniciar OAuth2: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao iniciar autenticação: {str(e)}"
        )

@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: Optional[str] = Query(None, description="Código de autorização do Google"),
    state: Optional[str] = Query(None, description="Estado contendo user_id"),
    error: Optional[str] = Query(None, description="Erro retornado pelo Google"),
    db: Session = Depends(get_db)
):
    """
    Callback do OAuth2 do Google
    
    Recebe o código de autorização, troca por tokens e salva no banco
    """
    try:
        # Verificar se houve erro
        if error:
            logger.error(f"Erro no OAuth2: {error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro na autenticação: {error}"
            )
        
        # Verificar se temos código e state
        if not code or not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código ou estado ausente na resposta do Google"
            )
        
        # Extrair user_id do state
        try:
            user_id = int(state)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado inválido recebido"
            )
        
        # Verificar se usuário existe
        user = db.query(Usuario).filter(Usuario.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Criar fluxo OAuth2
        flow = GoogleService.create_oauth_flow()
        
        # Obter URL completa da requisição
        authorization_response = str(request.url)
        
        # Trocar código por tokens
        flow.fetch_token(authorization_response=authorization_response)
        
        # Obter credenciais
        credentials = flow.credentials
        
        # Salvar tokens no banco
        success = GoogleService.save_user_tokens(db, user_id, credentials)
        
        if success:
            logger.info(f"Usuário {user_id} conectado com sucesso ao Google")
            
            # Redirecionar para página de sucesso (frontend)
            return RedirectResponse(
                url=f"/?google_connected=success&user={user.nome}",
                status_code=status.HTTP_302_FOUND
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao salvar credenciais"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no callback OAuth2: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no processo de autenticação: {str(e)}"
        )

@router.get("/google/status/{user_id}")
async def google_connection_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Verifica status da conexão Google de um usuário
    """
    try:
        user = db.query(Usuario).filter(Usuario.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Verificar se tem credenciais válidas
        credentials = GoogleService.get_user_credentials(db, user_id)
        
        return {
            "user_id": user_id,
            "user_name": user.nome,
            "google_connected": user.google_connected,
            "credentials_valid": credentials is not None,
            "scopes": GoogleService.SCOPES if credentials else [],
            "oauth_init_url": f"/integrations/google/init?user_id={user_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar conexão: {str(e)}"
        )

@router.delete("/google/disconnect/{user_id}")
async def google_disconnect(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Desconecta usuário do Google (remove tokens)
    """
    try:
        from backend.models import GoogleToken
        
        # Remover tokens do banco
        tokens_deleted = db.query(GoogleToken).filter(
            GoogleToken.user_id == user_id
        ).delete()
        
        # Marcar usuário como desconectado
        user = db.query(Usuario).filter(Usuario.id == user_id).first()
        if user:
            user.google_connected = False
        
        db.commit()
        
        logger.info(f"Usuário {user_id} desconectado do Google")
        
        return {
            "message": "Usuário desconectado do Google com sucesso",
            "tokens_removed": tokens_deleted > 0
        }
        
    except Exception as e:
        logger.error(f"Erro ao desconectar usuário: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desconectar: {str(e)}"
        )