"""
Service para lógica de agendamentos
"""
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models import Cliente, Agendamento, Usuario
from backend.schemas import AgendamentoCreate

class AgendamentoService:
    """Service para gerenciar agendamentos"""
    
    @staticmethod
    def criar_agendamentos_obrigatorios(db: Session, cliente: Cliente, responsavel_id: int) -> List[Agendamento]:
        """Cria agendamentos obrigatórios para um novo cliente (D+15, D+50, D+80, D+100, D+180)"""
        agendamentos = []
        
        if not cliente.data_inicio_contrato:
            return agendamentos
        
        # Define os períodos obrigatórios
        periodos = [
            {"dias": 15, "tipo": "D15", "titulo": "Acompanhamento D+15"},
            {"dias": 50, "tipo": "D50", "titulo": "Acompanhamento D+50"},
            {"dias": 80, "tipo": "FOLLOWUP", "titulo": "Acompanhamento D+80"},
            {"dias": 100, "tipo": "FOLLOWUP", "titulo": "Acompanhamento D+100"},
            {"dias": 180, "tipo": "FOLLOWUP", "titulo": "Acompanhamento D+180"}
        ]
        
        for periodo in periodos:
            data_agendada = cliente.data_inicio_contrato + timedelta(days=periodo["dias"])
            # Converte para datetime (horário padrão 14:00)
            data_agendada_dt = datetime.combine(data_agendada, datetime.min.time().replace(hour=14))
            
            agendamento_data = AgendamentoCreate(
                tipo=periodo["tipo"],
                cliente_id=cliente.id,
                responsavel_id=responsavel_id,
                data_agendada=data_agendada_dt,
                titulo=f"{periodo['titulo']} - {cliente.nome}",
                descricao=f"Acompanhamento obrigatório após {periodo['dias']} dias do início do contrato",
                status="PENDENTE"
            )
            
            agendamento = Agendamento(**agendamento_data.model_dump())
            db.add(agendamento)
            agendamentos.append(agendamento)
        
        db.commit()
        return agendamentos
    
    @staticmethod
    def marcar_agendamento_concluido(db: Session, cliente_id: int, tipo_contato: str) -> Optional[Agendamento]:
        """Marca agendamento correspondente como concluído quando um contato é criado"""
        # Mapeamento de tipos de contato para tipos de agendamento
        tipo_mapping = {
            "REUNIAO_INICIAL": "REUNIAO_INICIAL",
            "D15": "D15", 
            "D50": "D50",
            "FOLLOWUP": "FOLLOWUP"
        }
        
        tipo_agendamento = tipo_mapping.get(tipo_contato)
        if not tipo_agendamento:
            return None
        
        # Busca agendamento pendente do cliente para o tipo específico
        agendamento = db.query(Agendamento).filter(
            Agendamento.cliente_id == cliente_id,
            Agendamento.tipo == tipo_agendamento,
            Agendamento.status == "PENDENTE"
        ).first()
        
        if agendamento:
            agendamento.status = "CONCLUIDO"
            db.commit()
            db.refresh(agendamento)
        
        return agendamento
    
    @staticmethod
    def atualizar_agendamentos_cliente(db: Session, cliente: Cliente, responsavel_id: Optional[int] = None) -> List[Agendamento]:
        """Atualiza ou cria agendamentos quando cliente é modificado"""
        agendamentos_existentes = db.query(Agendamento).filter(
            Agendamento.cliente_id == cliente.id,
            Agendamento.status == "PENDENTE"
        ).all()
        
        # Se não há data de início de contrato, não cria agendamentos
        if not cliente.data_inicio_contrato:
            return []
        
        # Se não há agendamentos existentes, cria todos
        if not agendamentos_existentes:
            return AgendamentoService.criar_agendamentos_obrigatorios(
                db, cliente, responsavel_id or cliente.responsavel_followup_id
            )
        
        # Atualiza agendamentos existentes com nova data base se necessário
        for agendamento in agendamentos_existentes:
            # Calcula nova data baseada no tipo
            dias_map = {"D15": 15, "D50": 50, "FOLLOWUP": 80}  # Usa primeiro FOLLOWUP como referência
            if agendamento.tipo in dias_map:
                nova_data = cliente.data_inicio_contrato + timedelta(days=dias_map[agendamento.tipo])
                nova_data_dt = datetime.combine(nova_data, agendamento.data_agendada.time())
                agendamento.data_agendada = nova_data_dt
        
        db.commit()
        return agendamentos_existentes