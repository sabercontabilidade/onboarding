"""
Schemas Pydantic para SABER Onboarding
"""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, validator
import re

# Enums
class PapelUsuario(str, Enum):
    COLAB_ONBOARDING = "Colab. Onboarding"
    FISCAL = "Fiscal"
    GERENTE = "Gerente"
    ADMIN = "Admin"

class StatusOnboarding(str, Enum):
    INICIADO = "INICIADO"
    REUNIAO_AGENDADA = "REUNIAO_AGENDADA"
    DOCUMENTACAO = "DOCUMENTACAO"
    REVISAO = "REVISAO"
    CONCLUIDO = "CONCLUIDO"

class StatusRelacionamento(str, Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"
    PENDENTE = "PENDENTE"
    ENCERRADO = "ENCERRADO"

class TipoContato(str, Enum):
    REUNIAO_INICIAL = "REUNIAO_INICIAL"
    D15 = "D15"
    D50 = "D50"
    FOLLOWUP = "FOLLOWUP"
    SUPORTE = "SUPORTE"

class CanalContato(str, Enum):
    PRESENCIAL = "PRESENCIAL"
    VIDEOCHAMADA = "VIDEOCHAMADA"
    TELEFONE = "TELEFONE"
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"

class TipoAgendamento(str, Enum):
    REUNIAO_INICIAL = "REUNIAO_INICIAL"
    D15 = "D15"
    D50 = "D50"
    FOLLOWUP = "FOLLOWUP"
    VISITA_TECNICA = "VISITA_TECNICA"

class StatusAgendamento(str, Enum):
    PENDENTE = "PENDENTE"
    CONCLUIDO = "CONCLUIDO"
    CANCELADO = "CANCELADO"
    REAGENDADO = "REAGENDADO"

class TipoVisita(str, Enum):
    INSTALACAO = "INSTALACAO"
    MANUTENCAO = "MANUTENCAO"
    TREINAMENTO = "TREINAMENTO"
    AUDITORIA = "AUDITORIA"
    CONSULTORIA = "CONSULTORIA"

# Schemas Base
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        arbitrary_types_allowed = True

# Schemas para Usuario
class UsuarioBase(BaseSchema):
    nome: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    papel: PapelUsuario = PapelUsuario.COLAB_ONBOARDING
    google_connected: bool = False

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioUpdate(BaseSchema):
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    papel: Optional[PapelUsuario] = None
    google_connected: Optional[bool] = None

class Usuario(UsuarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas para Cliente
class ClienteBase(BaseSchema):
    nome: str = Field(..., min_length=2, max_length=255)
    cnpj: Optional[str] = None
    data_inicio_contrato: Optional[date] = None
    data_reuniao_inicial: Optional[date] = None
    contatos_empresa: Optional[List[Dict[str, Any]]] = None
    canais: Optional[List[str]] = None
    autorizacoes_documentos: Optional[Dict[str, Any]] = None
    status_onboarding: StatusOnboarding = StatusOnboarding.INICIADO
    status_relacionamento: StatusRelacionamento = StatusRelacionamento.PENDENTE
    data_encerramento: Optional[date] = None
    responsavel_followup_id: Optional[int] = None
    observacoes: Optional[str] = None
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        if v is None:
            return v
        
        # Remove caracteres não numéricos
        cnpj_nums = re.sub(r'[^0-9]', '', v)
        
        if len(cnpj_nums) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        
        # Formata CNPJ: 00.000.000/0000-00
        return f"{cnpj_nums[:2]}.{cnpj_nums[2:5]}.{cnpj_nums[5:8]}/{cnpj_nums[8:12]}-{cnpj_nums[12:]}"

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseSchema):
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    cnpj: Optional[str] = None
    data_inicio_contrato: Optional[date] = None
    data_reuniao_inicial: Optional[date] = None
    contatos_empresa: Optional[List[Dict[str, Any]]] = None
    canais: Optional[List[str]] = None
    autorizacoes_documentos: Optional[Dict[str, Any]] = None
    status_onboarding: Optional[StatusOnboarding] = None
    status_relacionamento: Optional[StatusRelacionamento] = None
    data_encerramento: Optional[date] = None
    responsavel_followup_id: Optional[int] = None
    observacoes: Optional[str] = None
    
    @validator('cnpj')
    def validate_cnpj(cls, v):
        if v is None:
            return v
        
        # Remove caracteres não numéricos
        cnpj_nums = re.sub(r'[^0-9]', '', v)
        
        if len(cnpj_nums) != 14:
            raise ValueError('CNPJ deve ter 14 dígitos')
        
        # Formata CNPJ: 00.000.000/0000-00
        return f"{cnpj_nums[:2]}.{cnpj_nums[2:5]}.{cnpj_nums[5:8]}/{cnpj_nums[8:12]}-{cnpj_nums[12:]}"

class Cliente(ClienteBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas para Contato
class ContatoBase(BaseSchema):
    cliente_id: int
    tipo: TipoContato
    data: date
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    participantes: Optional[List[str]] = None
    descricao: str = Field(..., min_length=5)
    canal: CanalContato
    observacoes: Optional[str] = None

class ContatoCreate(ContatoBase):
    pass

class ContatoUpdate(BaseSchema):
    tipo: Optional[TipoContato] = None
    data: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    participantes: Optional[List[str]] = None
    descricao: Optional[str] = Field(None, min_length=5)
    canal: Optional[CanalContato] = None
    observacoes: Optional[str] = None

class Contato(ContatoBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas para Agendamento
class AgendamentoBase(BaseSchema):
    tipo: TipoAgendamento
    cliente_id: int
    responsavel_id: int
    data_agendada: datetime
    status: StatusAgendamento = StatusAgendamento.PENDENTE
    google_event_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    titulo: str = Field(..., min_length=5, max_length=255)
    descricao: Optional[str] = None
    local: Optional[str] = Field(None, max_length=500)
    link_reuniao: Optional[str] = Field(None, max_length=500)
    observacoes: Optional[str] = None

class AgendamentoCreate(AgendamentoBase):
    pass

class AgendamentoUpdate(BaseSchema):
    tipo: Optional[TipoAgendamento] = None
    responsavel_id: Optional[int] = None
    data_agendada: Optional[datetime] = None
    status: Optional[StatusAgendamento] = None
    google_event_id: Optional[str] = None
    google_calendar_id: Optional[str] = None
    titulo: Optional[str] = Field(None, min_length=5, max_length=255)
    descricao: Optional[str] = None
    local: Optional[str] = Field(None, max_length=500)
    link_reuniao: Optional[str] = Field(None, max_length=500)
    observacoes: Optional[str] = None

class Agendamento(AgendamentoBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas para Visita
class VisitaBase(BaseSchema):
    cliente_id: int
    data: date
    local: str = Field(..., min_length=5, max_length=500)
    tipo_visita: TipoVisita
    pauta: Optional[List[str]] = None
    assuntos: Optional[List[str]] = None
    decisoes: Optional[List[str]] = None
    pendencias: Optional[List[str]] = None
    satisfacao: Optional[int] = Field(None, ge=1, le=10)
    participantes: Optional[List[str]] = None
    anexos: Optional[List[str]] = None
    assinaturas: Optional[Dict[str, Any]] = None
    observacoes: Optional[str] = None

class VisitaCreate(VisitaBase):
    pass

class VisitaUpdate(BaseSchema):
    data: Optional[date] = None
    local: Optional[str] = Field(None, min_length=5, max_length=500)
    tipo_visita: Optional[TipoVisita] = None
    pauta: Optional[List[str]] = None
    assuntos: Optional[List[str]] = None
    decisoes: Optional[List[str]] = None
    pendencias: Optional[List[str]] = None
    satisfacao: Optional[int] = Field(None, ge=1, le=10)
    participantes: Optional[List[str]] = None
    anexos: Optional[List[str]] = None
    assinaturas: Optional[Dict[str, Any]] = None
    observacoes: Optional[str] = None

class Visita(VisitaBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas para GoogleToken
class GoogleTokenBase(BaseSchema):
    user_id: int
    expiry: datetime
    scopes: List[str]

class GoogleTokenCreate(GoogleTokenBase):
    access_token: str
    refresh_token: str

class GoogleTokenUpdate(BaseSchema):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expiry: Optional[datetime] = None
    scopes: Optional[List[str]] = None

class GoogleToken(GoogleTokenBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Schemas compostos (com relacionamentos)
class ClienteComDetalhes(Cliente):
    responsavel_followup: Optional[Usuario] = None
    contatos: List[Contato] = []
    agendamentos: List[Agendamento] = []
    visitas: List[Visita] = []

class AgendamentoComDetalhes(Agendamento):
    cliente: Cliente
    responsavel: Usuario

class ContatoComDetalhes(Contato):
    cliente: Cliente

class VisitaComDetalhes(Visita):
    cliente: Cliente

class UsuarioComDetalhes(Usuario):
    clientes_responsavel: List[Cliente] = []
    agendamentos: List[Agendamento] = []
    google_tokens: Optional[GoogleToken] = None

# Schemas para responses da API
class ApiResponse(BaseSchema):
    success: bool
    message: str
    data: Optional[Any] = None

class ApiError(BaseSchema):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

# Schemas para métricas e dashboard
class MetricasOnboarding(BaseSchema):
    total_clientes: int
    clientes_onboarding: int
    clientes_ativos: int
    reunioes_agendadas: int
    visitas_pendentes: int
    satisfacao_media: Optional[float] = None

class DashboardData(BaseSchema):
    metricas: MetricasOnboarding
    proximos_agendamentos: List[AgendamentoComDetalhes]
    clientes_recentes: List[Cliente]
    atividades_recentes: List[Union[Contato, Agendamento, Visita]]