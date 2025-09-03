"""
Service para lógica de clientes
"""
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.models import Cliente, Contato, Agendamento, Visita, Usuario
from backend.schemas import ClienteCreate, ClienteUpdate
from backend.services.agendamento_service import AgendamentoService

logger = logging.getLogger(__name__)

class ClienteService:
    """Service para gerenciar clientes"""
    
    @staticmethod
    def criar_cliente(db: Session, cliente_data: ClienteCreate) -> Cliente:
        """Cria um novo cliente e seus agendamentos obrigatórios"""
        # Cria o cliente
        cliente = Cliente(**cliente_data.model_dump())
        db.add(cliente)
        db.commit()
        db.refresh(cliente)
        
        # Cria agendamentos obrigatórios se há data de início de contrato
        if cliente.data_inicio_contrato and cliente.responsavel_followup_id:
            AgendamentoService.criar_agendamentos_obrigatorios(
                db, cliente, cliente.responsavel_followup_id
            )
            
            # Criar eventos no Google Calendar se responsável conectado
            try:
                from backend.services.google_service import GoogleService
                
                credentials = GoogleService.get_user_credentials(db, cliente.responsavel_followup_id)
                if credentials:
                    # Buscar agendamentos recém-criados para este cliente
                    agendamentos_novos = db.query(Agendamento).filter(
                        Agendamento.cliente_id == cliente.id,
                        Agendamento.google_event_id.is_(None)
                    ).all()
                    
                    responsavel = db.query(Usuario).filter(
                        Usuario.id == cliente.responsavel_followup_id
                    ).first()
                    
                    for agendamento in agendamentos_novos:
                        # Criar evento no Google Calendar
                        event_id = GoogleService.create_calendar_event(
                            credentials, agendamento, cliente
                        )
                        
                        if event_id:
                            agendamento.google_event_id = event_id
                            agendamento.google_calendar_id = 'primary'
                            
                            # Enviar e-mail de agendamento
                            if responsavel:
                                GoogleService.send_appointment_email(
                                    credentials, agendamento, cliente, responsavel
                                )
                    
                    db.commit()
                    logger.info(f"Eventos criados no Google Calendar para cliente {cliente.id}")
                    
            except Exception as e:
                logger.warning(f"Erro ao criar eventos Google para cliente {cliente.id}: {e}")
                # Não falha a criação do cliente por erro na integração
        
        return cliente
    
    @staticmethod
    def atualizar_cliente(db: Session, cliente_id: int, cliente_data: ClienteUpdate) -> Optional[Cliente]:
        """Atualiza cliente e recria agendamentos se necessário"""
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        if not cliente:
            return None
        
        # Guarda valores originais para comparação
        data_inicio_original = cliente.data_inicio_contrato
        responsavel_original = cliente.responsavel_followup_id
        
        # Atualiza campos do cliente
        update_data = cliente_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(cliente, field, value)
        
        db.commit()
        db.refresh(cliente)
        
        # Se data de início ou responsável mudaram, atualiza agendamentos
        if (cliente.data_inicio_contrato != data_inicio_original or 
            cliente.responsavel_followup_id != responsavel_original):
            AgendamentoService.atualizar_agendamentos_cliente(
                db, cliente, cliente.responsavel_followup_id
            )
        
        return cliente
    
    @staticmethod
    def buscar_clientes(db: Session, termo_busca: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Cliente]:
        """Busca clientes por nome ou CNPJ"""
        query = db.query(Cliente)
        
        if termo_busca:
            # Remove formatação do CNPJ para busca
            termo_limpo = ''.join(filter(str.isalnum, termo_busca))
            query = query.filter(
                or_(
                    Cliente.nome.ilike(f"%{termo_busca}%"),
                    Cliente.cnpj.ilike(f"%{termo_busca}%"),
                    Cliente.cnpj.ilike(f"%{termo_limpo}%")
                )
            )
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def obter_cliente_completo(db: Session, cliente_id: int) -> Optional[Cliente]:
        """Obtém cliente com todos os relacionamentos carregados"""
        return db.query(Cliente).filter(Cliente.id == cliente_id).first()
    
    @staticmethod
    def obter_contatos_cliente(db: Session, cliente_id: int) -> List[Contato]:
        """Obtém todos os contatos de um cliente"""
        return db.query(Contato).filter(Contato.cliente_id == cliente_id).order_by(Contato.data.desc()).all()
    
    @staticmethod
    def obter_agendamentos_cliente(db: Session, cliente_id: int) -> List[Agendamento]:
        """Obtém todos os agendamentos de um cliente"""
        return db.query(Agendamento).filter(Agendamento.cliente_id == cliente_id).order_by(Agendamento.data_agendada.asc()).all()
    
    @staticmethod
    def obter_visitas_cliente(db: Session, cliente_id: int) -> List[Visita]:
        """Obtém todas as visitas de um cliente"""
        return db.query(Visita).filter(Visita.cliente_id == cliente_id).order_by(Visita.data.desc()).all()