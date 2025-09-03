"""
Job para sincronizar agendamentos com Google Calendar
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from backend.database import SessionLocal
from backend.models import Agendamento, Usuario, Cliente, GoogleToken
from backend.services.google_service import GoogleService

logger = logging.getLogger(__name__)

def sync_agendamentos_job():
    """
    Job executado a cada hora para sincronizar agendamentos com Google Calendar
    
    Busca agendamentos pendentes nos próximos 30 dias sem google_event_id,
    cria evento no Google Calendar e envia e-mail via Gmail (se usuário autenticado)
    """
    logger.info("Iniciando job de sincronização de agendamentos...")
    
    db = SessionLocal()
    try:
        # Data limite (próximos 30 dias)
        data_limite = datetime.now() + timedelta(days=30)
        
        # Buscar agendamentos que precisam ser sincronizados
        agendamentos = db.query(Agendamento).join(Cliente).join(Usuario).filter(
            and_(
                Agendamento.status == "PENDENTE",
                Agendamento.google_event_id.is_(None),
                Agendamento.data_agendada <= data_limite,
                Agendamento.data_agendada > datetime.now()
            )
        ).all()
        
        logger.info(f"Encontrados {len(agendamentos)} agendamentos para sincronizar")
        
        sincronizados = 0
        erros = 0
        
        for agendamento in agendamentos:
            try:
                # Obter responsável do agendamento
                responsavel = db.query(Usuario).filter(
                    Usuario.id == agendamento.responsavel_id
                ).first()
                
                if not responsavel:
                    logger.warning(f"Responsável não encontrado para agendamento {agendamento.id}")
                    continue
                
                # Verificar se usuário tem tokens Google válidos
                credentials = GoogleService.get_user_credentials(db, responsavel.id)
                if not credentials:
                    logger.warning(f"Credenciais Google não disponíveis para usuário {responsavel.id}")
                    continue
                
                # Obter cliente
                cliente = db.query(Cliente).filter(
                    Cliente.id == agendamento.cliente_id
                ).first()
                
                if not cliente:
                    logger.warning(f"Cliente não encontrado para agendamento {agendamento.id}")
                    continue
                
                # Criar evento no Google Calendar
                event_id = GoogleService.create_calendar_event(
                    credentials, agendamento, cliente
                )
                
                if event_id:
                    # Salvar event_id no banco
                    agendamento.google_event_id = event_id
                    agendamento.google_calendar_id = 'primary'
                    db.commit()
                    
                    logger.info(f"Agendamento {agendamento.id} sincronizado com sucesso")
                    
                    # Enviar e-mail de notificação se cliente tem e-mail
                    if cliente.contatos_empresa and len(cliente.contatos_empresa) > 0:
                        email_cliente = cliente.contatos_empresa[0].get('email')
                        if email_cliente:
                            _enviar_email_agendamento(
                                credentials, email_cliente, agendamento, cliente, responsavel
                            )
                    
                    sincronizados += 1
                else:
                    logger.error(f"Falha ao criar evento para agendamento {agendamento.id}")
                    erros += 1
                    
            except Exception as e:
                logger.error(f"Erro ao processar agendamento {agendamento.id}: {e}")
                erros += 1
                db.rollback()
        
        logger.info(f"Job concluído: {sincronizados} sincronizados, {erros} erros")
        
    except Exception as e:
        logger.error(f"Erro geral no job de sincronização: {e}")
    finally:
        db.close()

def _enviar_email_agendamento(
    credentials, 
    email_cliente: str, 
    agendamento: Agendamento, 
    cliente: Cliente, 
    responsavel: Usuario
):
    """Envia e-mail de notificação sobre novo agendamento"""
    try:
        data_formatada = agendamento.data_agendada.strftime("%d/%m/%Y às %H:%M")
        
        subject = f"Agendamento confirmado - {agendamento.titulo}"
        
        body = f"""
        <html>
        <body>
            <h2>Agendamento Confirmado</h2>
            
            <p>Olá <strong>{cliente.nome}</strong>,</p>
            
            <p>Seu agendamento foi confirmado com os seguintes detalhes:</p>
            
            <ul>
                <li><strong>Título:</strong> {agendamento.titulo}</li>
                <li><strong>Data/Hora:</strong> {data_formatada}</li>
                <li><strong>Tipo:</strong> {agendamento.tipo}</li>
                <li><strong>Local:</strong> {agendamento.local or 'A ser definido'}</li>
                <li><strong>Responsável:</strong> {responsavel.nome}</li>
            </ul>
            
            {f'<p><strong>Descrição:</strong> {agendamento.descricao}</p>' if agendamento.descricao else ''}
            {f'<p><strong>Observações:</strong> {agendamento.observacoes}</p>' if agendamento.observacoes else ''}
            
            <p>Em caso de dúvidas, entre em contato conosco.</p>
            
            <p>Atenciosamente,<br>
            Equipe SABER Onboarding</p>
        </body>
        </html>
        """
        
        GoogleService.send_email_notification(
            credentials, email_cliente, subject, body
        )
        
        logger.info(f"E-mail de agendamento enviado para {email_cliente}")
        
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail de agendamento: {e}")