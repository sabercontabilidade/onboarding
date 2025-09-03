"""
Serviços de integração com Google Calendar e Gmail
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from sqlalchemy.orm import Session
from backend.models import GoogleToken, Usuario, Agendamento, Cliente
from backend.config import fernet

logger = logging.getLogger(__name__)

class GoogleService:
    """Serviço para integração com APIs do Google"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.send'
    ]
    
    @staticmethod
    def get_user_credentials(db: Session, user_id: int) -> Optional[Credentials]:
        """Obtém credenciais válidas do usuário"""
        try:
            google_token = db.query(GoogleToken).filter(
                GoogleToken.user_id == user_id
            ).first()
            
            if not google_token:
                logger.warning(f"Nenhum token Google encontrado para usuário {user_id}")
                return None
            
            # Descriptografar tokens
            access_token = google_token.access_token
            refresh_token = google_token.refresh_token
            
            # Criar credenciais
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id="YOUR_CLIENT_ID",  # TODO: Configurar via env
                client_secret="YOUR_CLIENT_SECRET",  # TODO: Configurar via env
                scopes=google_token.scopes
            )
            
            # Verificar se token precisa ser renovado
            if credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(Request())
                    
                    # Atualizar token no banco
                    google_token.access_token = credentials.token
                    google_token.expiry = credentials.expiry
                    db.commit()
                    
                    logger.info(f"Token renovado para usuário {user_id}")
                    
                except RefreshError as e:
                    logger.error(f"Erro ao renovar token para usuário {user_id}: {e}")
                    return None
            
            return credentials
            
        except Exception as e:
            logger.error(f"Erro ao obter credenciais para usuário {user_id}: {e}")
            return None
    
    @staticmethod
    def create_calendar_event(
        credentials: Credentials, 
        agendamento: Agendamento, 
        cliente: Cliente
    ) -> Optional[str]:
        """Cria evento no Google Calendar"""
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Preparar dados do evento
            event = {
                'summary': agendamento.titulo,
                'description': f"""
{agendamento.descricao or ''}

Cliente: {cliente.nome}
Tipo: {agendamento.tipo}
Local: {agendamento.local or 'A definir'}

Observações: {agendamento.observacoes or 'Nenhuma'}
                """.strip(),
                'start': {
                    'dateTime': agendamento.data_agendada.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'end': {
                    'dateTime': (agendamento.data_agendada + timedelta(hours=1)).isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'location': agendamento.local,
                'attendees': [
                    {'email': cliente.contatos_empresa[0]['email'] if cliente.contatos_empresa else ''}
                ],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 dia antes
                        {'method': 'email', 'minutes': 60},       # 1 hora antes
                        {'method': 'popup', 'minutes': 15},       # 15 min antes
                    ],
                },
            }
            
            # Criar evento
            created_event = service.events().insert(
                calendarId='primary', 
                body=event
            ).execute()
            
            event_id = created_event.get('id')
            logger.info(f"Evento criado no Google Calendar: {event_id}")
            return event_id
            
        except Exception as e:
            logger.error(f"Erro ao criar evento no Google Calendar: {e}")
            return None
    
    @staticmethod
    def send_email_notification(
        credentials: Credentials,
        recipient_email: str,
        subject: str,
        body: str
    ) -> bool:
        """Envia e-mail via Gmail"""
        try:
            service = build('gmail', 'v1', credentials=credentials)
            
            # Criar mensagem
            message = {
                'raw': GoogleService._create_message(
                    to=recipient_email,
                    subject=subject,
                    message_text=body
                )
            }
            
            # Enviar e-mail
            service.users().messages().send(
                userId='me', 
                body=message
            ).execute()
            
            logger.info(f"E-mail enviado para {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail para {recipient_email}: {e}")
            return False
    
    @staticmethod
    def _create_message(to: str, subject: str, message_text: str) -> str:
        """Cria mensagem de e-mail em formato base64"""
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(message_text, 'html')
        message['to'] = to
        message['subject'] = subject
        
        return base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode()
    
    @staticmethod
    def update_calendar_event(
        credentials: Credentials,
        event_id: str,
        agendamento: Agendamento,
        cliente: Cliente
    ) -> bool:
        """Atualiza evento existente no Google Calendar"""
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Obter evento existente
            event = service.events().get(
                calendarId='primary', 
                eventId=event_id
            ).execute()
            
            # Atualizar dados
            event.update({
                'summary': agendamento.titulo,
                'description': f"""
{agendamento.descricao or ''}

Cliente: {cliente.nome}
Tipo: {agendamento.tipo}
Local: {agendamento.local or 'A definir'}

Observações: {agendamento.observacoes or 'Nenhuma'}
                """.strip(),
                'start': {
                    'dateTime': agendamento.data_agendada.isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'end': {
                    'dateTime': (agendamento.data_agendada + timedelta(hours=1)).isoformat(),
                    'timeZone': 'America/Sao_Paulo',
                },
                'location': agendamento.local,
            })
            
            # Atualizar evento
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Evento atualizado no Google Calendar: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar evento {event_id}: {e}")
            return False
    
    @staticmethod
    def cancel_calendar_event(credentials: Credentials, event_id: str) -> bool:
        """Cancela evento no Google Calendar"""
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            logger.info(f"Evento cancelado no Google Calendar: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao cancelar evento {event_id}: {e}")
            return False