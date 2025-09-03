"""
Modelos SQLAlchemy para SABER Onboarding
"""
import re
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    JSON, ForeignKey, Date, Time, Enum, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from pytz import timezone
from backend.database import Base
from backend.config import settings, fernet

# Timezone configurado
tz = timezone(settings.timezone)

def get_current_timestamp():
    """Retorna timestamp atual no timezone configurado"""
    return datetime.now(tz).replace(tzinfo=None)

def validate_cnpj(cnpj: str) -> str:
    """Valida e normaliza CNPJ"""
    if not cnpj:
        return cnpj
    
    # Remove caracteres não numéricos
    cnpj_nums = re.sub(r'[^0-9]', '', cnpj)
    
    if len(cnpj_nums) != 14:
        raise ValueError("CNPJ deve ter 14 dígitos")
    
    # Formata CNPJ: 00.000.000/0000-00
    return f"{cnpj_nums[:2]}.{cnpj_nums[2:5]}.{cnpj_nums[5:8]}/{cnpj_nums[8:12]}-{cnpj_nums[12:]}"

class Usuario(Base):
    """Modelo de usuários do sistema"""
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(320), nullable=False, unique=True, index=True)
    papel = Column(String(100), nullable=False, default="Colab. Onboarding")  # Colab. Onboarding, Fiscal, etc.
    google_connected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    clientes_responsavel = relationship("Cliente", back_populates="responsavel_followup", foreign_keys="Cliente.responsavel_followup_id")
    agendamentos = relationship("Agendamento", back_populates="responsavel")
    google_tokens = relationship("GoogleToken", back_populates="usuario", uselist=False)
    
    def __repr__(self):
        return f"<Usuario(id={self.id}, nome='{self.nome}', papel='{self.papel}')>"

class Cliente(Base):
    """Modelo de clientes"""
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    cnpj = Column(String(18), nullable=True, index=True)  # Formato: 00.000.000/0000-00
    data_inicio_contrato = Column(Date, nullable=True)
    data_reuniao_inicial = Column(Date, nullable=True)
    contatos_empresa = Column(JSON, nullable=True)  # Lista de contatos da empresa
    canais = Column(JSON, nullable=True)  # Canais de comunicação preferidos
    autorizacoes_documentos = Column(JSON, nullable=True)  # Status das autorizações
    status_onboarding = Column(
        Enum("INICIADO", "REUNIAO_AGENDADA", "DOCUMENTACAO", "REVISAO", "CONCLUIDO", name="status_onboarding_enum"),
        default="INICIADO"
    )
    status_relacionamento = Column(
        Enum("ATIVO", "INATIVO", "PENDENTE", "ENCERRADO", name="status_relacionamento_enum"),
        default="PENDENTE"
    )
    data_encerramento = Column(Date, nullable=True)
    responsavel_followup_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    responsavel_followup = relationship("Usuario", back_populates="clientes_responsavel")
    contatos = relationship("Contato", back_populates="cliente", cascade="all, delete-orphan")
    agendamentos = relationship("Agendamento", back_populates="cliente", cascade="all, delete-orphan")
    visitas = relationship("Visita", back_populates="cliente", cascade="all, delete-orphan")
    
    def get_cnpj_normalizado(self):
        """Retorna CNPJ sem formatação"""
        if self.cnpj:
            return re.sub(r'[^0-9]', '', self.cnpj)
        return None
    
    def validar_cnpj(self, cnpj_value):
        """Valida CNPJ antes de salvar"""
        if cnpj_value:
            return validate_cnpj(cnpj_value)
        return cnpj_value
    
    def __repr__(self):
        return f"<Cliente(id={self.id}, nome='{self.nome}', cnpj='{self.cnpj}')>"

class Contato(Base):
    """Modelo de contatos/interações com clientes"""
    __tablename__ = "contatos"
    
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo = Column(
        Enum("REUNIAO_INICIAL", "D15", "D50", "FOLLOWUP", "SUPORTE", name="tipo_contato_enum"),
        nullable=False
    )
    data = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=True)
    hora_fim = Column(Time, nullable=True)
    participantes = Column(JSON, nullable=True)  # Lista de participantes
    descricao = Column(Text, nullable=False)
    canal = Column(
        Enum("PRESENCIAL", "VIDEOCHAMADA", "TELEFONE", "EMAIL", "WHATSAPP", name="canal_contato_enum"),
        nullable=False
    )
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    cliente = relationship("Cliente", back_populates="contatos")
    
    def __repr__(self):
        return f"<Contato(id={self.id}, tipo='{self.tipo}', cliente_id={self.cliente_id})>"

class Agendamento(Base):
    """Modelo de agendamentos"""
    __tablename__ = "agendamentos"
    
    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(
        Enum("REUNIAO_INICIAL", "D15", "D50", "FOLLOWUP", "VISITA_TECNICA", name="tipo_agendamento_enum"),
        nullable=False
    )
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data_agendada = Column(DateTime, nullable=False)
    status = Column(
        Enum("PENDENTE", "CONCLUIDO", "CANCELADO", "REAGENDADO", name="status_agendamento_enum"),
        default="PENDENTE"
    )
    google_event_id = Column(String(255), nullable=True)  # ID do evento no Google Calendar
    google_calendar_id = Column(String(255), nullable=True)  # ID do calendário usado
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    local = Column(String(500), nullable=True)
    link_reuniao = Column(String(500), nullable=True)  # Para videochamadas
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    cliente = relationship("Cliente", back_populates="agendamentos")
    responsavel = relationship("Usuario", back_populates="agendamentos")
    
    def __repr__(self):
        return f"<Agendamento(id={self.id}, tipo='{self.tipo}', status='{self.status}')>"

class Visita(Base):
    """Modelo de visitas técnicas"""
    __tablename__ = "visitas"
    
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    data = Column(Date, nullable=False)
    local = Column(String(500), nullable=False)
    tipo_visita = Column(
        Enum("INSTALACAO", "MANUTENCAO", "TREINAMENTO", "AUDITORIA", "CONSULTORIA", name="tipo_visita_enum"),
        nullable=False
    )
    pauta = Column(JSON, nullable=True)  # Lista de tópicos da pauta
    assuntos = Column(JSON, nullable=True)  # Assuntos discutidos
    decisoes = Column(JSON, nullable=True)  # Decisões tomadas
    pendencias = Column(JSON, nullable=True)  # Pendências identificadas
    satisfacao = Column(Integer, nullable=True)  # Nota de 1 a 10
    participantes = Column(JSON, nullable=True)  # Lista de participantes
    anexos = Column(JSON, nullable=True)  # URLs ou paths de anexos
    assinaturas = Column(JSON, nullable=True)  # Dados das assinaturas digitais
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    cliente = relationship("Cliente", back_populates="visitas")
    
    def __repr__(self):
        return f"<Visita(id={self.id}, tipo='{self.tipo_visita}', cliente_id={self.cliente_id})>"

class GoogleToken(Base):
    """Modelo para armazenar tokens do Google de forma criptografada"""
    __tablename__ = "google_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, unique=True)
    access_token_encrypted = Column(Text, nullable=False)
    refresh_token_encrypted = Column(Text, nullable=False)
    expiry = Column(DateTime, nullable=False)
    scopes = Column(JSON, nullable=False)  # Lista de scopes autorizados
    created_at = Column(DateTime, default=get_current_timestamp)
    updated_at = Column(DateTime, default=get_current_timestamp, onupdate=get_current_timestamp)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="google_tokens")
    
    @property
    def access_token(self) -> str:
        """Descriptografa e retorna o access token"""
        return fernet.decrypt(self.access_token_encrypted.encode()).decode()
    
    @access_token.setter
    def access_token(self, value: str):
        """Criptografa e armazena o access token"""
        self.access_token_encrypted = fernet.encrypt(value.encode()).decode()
    
    @property
    def refresh_token(self) -> str:
        """Descriptografa e retorna o refresh token"""
        return fernet.decrypt(self.refresh_token_encrypted.encode()).decode()
    
    @refresh_token.setter
    def refresh_token(self, value: str):
        """Criptografa e armazena o refresh token"""
        self.refresh_token_encrypted = fernet.encrypt(value.encode()).decode()
    
    def __repr__(self):
        return f"<GoogleToken(id={self.id}, user_id={self.user_id}, expiry={self.expiry})>"