"""
Serviços de integração com Google Calendar e Gmail
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google_auth_oauthlib.flow import Flow
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
    
    CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    REDIRECT_URI = os.getenv('REPLIT_DOMAIN', 'http://localhost:5000') + '/integrations/google/callback'
    
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
            access_token = fernet.decrypt(google_token.access_token_encrypted).decode()
            refresh_token = fernet.decrypt(google_token.refresh_token_encrypted).decode()
            
            # Criar credenciais
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=GoogleService.CLIENT_ID,
                client_secret=GoogleService.CLIENT_SECRET,
                scopes=google_token.scopes
            )
            
            # Verificar se token precisa ser renovado
            if credentials.expired and credentials.refresh_token:
                try:
                    credentials.refresh(Request())
                    
                    # Atualizar token no banco (criptografado)
                    google_token.access_token_encrypted = fernet.encrypt(credentials.token.encode())
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
                        {'method': 'email', 'minutes': 24 * 60},  # 24h antes
                        {'method': 'email', 'minutes': 60},       # 1h antes
                        {'method': 'popup', 'minutes': 10},       # 10min antes
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
    
    @staticmethod
    def create_oauth_flow() -> Flow:
        """Cria fluxo OAuth2 para autenticação"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GoogleService.CLIENT_ID,
                    "client_secret": GoogleService.CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GoogleService.REDIRECT_URI]
                }
            },
            scopes=GoogleService.SCOPES
        )
        flow.redirect_uri = GoogleService.REDIRECT_URI
        return flow
    
    @staticmethod
    def save_user_tokens(db: Session, user_id: int, credentials: Credentials) -> bool:
        """Salva tokens do usuário no banco (criptografados)"""
        try:
            # Verificar se já existe token para o usuário
            existing_token = db.query(GoogleToken).filter(
                GoogleToken.user_id == user_id
            ).first()
            
            # Criptografar tokens
            access_token_encrypted = fernet.encrypt(credentials.token.encode())
            refresh_token_encrypted = fernet.encrypt(credentials.refresh_token.encode())
            
            if existing_token:
                # Atualizar tokens existentes
                existing_token.access_token_encrypted = access_token_encrypted
                existing_token.refresh_token_encrypted = refresh_token_encrypted
                existing_token.expiry = credentials.expiry
                existing_token.scopes = credentials.scopes
            else:
                # Criar novo registro de token
                new_token = GoogleToken(
                    user_id=user_id,
                    access_token_encrypted=access_token_encrypted,
                    refresh_token_encrypted=refresh_token_encrypted,
                    expiry=credentials.expiry,
                    scopes=credentials.scopes
                )
                db.add(new_token)
            
            # Marcar usuário como conectado
            user = db.query(Usuario).filter(Usuario.id == user_id).first()
            if user:
                user.google_connected = True
            
            db.commit()
            logger.info(f"Tokens salvos com sucesso para usuário {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar tokens para usuário {user_id}: {e}")
            db.rollback()
            return False
    
    @staticmethod
    def send_appointment_email(
        credentials: Credentials,
        agendamento: Agendamento,
        cliente: Cliente,
        responsavel: Usuario
    ) -> bool:
        """Envia e-mail de agendamento com pauta e checklist"""
        try:
            if not cliente.contatos_empresa or len(cliente.contatos_empresa) == 0:
                logger.warning(f"Cliente {cliente.id} não tem contatos de e-mail")
                return False
            
            email_cliente = cliente.contatos_empresa[0].get('email')
            if not email_cliente:
                logger.warning(f"Cliente {cliente.id} não tem e-mail válido")
                return False
            
            data_formatada = agendamento.data_agendada.strftime("%d/%m/%Y às %H:%M")
            
            subject = f"Agendamento Confirmado - {agendamento.titulo}"
            
            # Template de e-mail com pauta e checklist
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #007bff; margin-bottom: 20px; text-align: center;">✅ Agendamento Confirmado</h2>
                    
                    <p>Olá <strong>{cliente.nome}</strong>,</p>
                    
                    <p>Seu agendamento foi confirmado com sucesso! Segue os detalhes:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">📋 Detalhes do Agendamento</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li style="margin: 10px 0;"><strong>📅 Data/Hora:</strong> {data_formatada}</li>
                            <li style="margin: 10px 0;"><strong>📝 Título:</strong> {agendamento.titulo}</li>
                            <li style="margin: 10px 0;"><strong>🏷️ Tipo:</strong> {agendamento.tipo}</li>
                            <li style="margin: 10px 0;"><strong>📍 Local:</strong> {agendamento.local or 'A ser definido'}</li>
                            <li style="margin: 10px 0;"><strong>👤 Responsável:</strong> {responsavel.nome}</li>
                        </ul>
                    </div>
                    
                    {f'<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;"><h4 style="color: #0056b3; margin-top: 0;">📋 Descrição</h4><p>{agendamento.descricao}</p></div>' if agendamento.descricao else ''}
                    
                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #28a745; margin-top: 0;">📝 Pauta da Reunião</h3>
                        <ul>
                            <li>Apresentação dos serviços SABER Onboarding</li>
                            <li>Análise das necessidades da empresa</li>
                            <li>Definição do cronograma de implementação</li>
                            <li>Esclarecimento de dúvidas</li>
                            <li>Próximos passos do processo</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #856404; margin-top: 0;">✅ Checklist de Preparação</h3>
                        <p>Para otimizar nossa reunião, por favor:</p>
                        <ul>
                            <li>☐ Tenha em mãos os documentos da empresa (CNPJ, contrato social)</li>
                            <li>☐ Prepare uma lista das principais dificuldades atuais</li>
                            <li>☐ Defina os objetivos que deseja alcançar</li>
                            <li>☐ Confirme a participação dos decisores-chave</li>
                            <li>☐ Teste sua conexão de internet (se for videochamada)</li>
                        </ul>
                    </div>
                    
                    {f'<div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;"><h4 style="color: #721c24; margin-top: 0;">📌 Observações</h4><p>{agendamento.observacoes}</p></div>' if agendamento.observacoes else ''}
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px;">Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.</p>
                        <p style="color: #007bff; font-weight: bold;">Atenciosamente,<br>Equipe SABER Onboarding</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return GoogleService.send_email_notification(
                credentials, email_cliente, subject, body
            )
            
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail de agendamento: {e}")
            return False