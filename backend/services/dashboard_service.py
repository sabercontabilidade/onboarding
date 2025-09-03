"""
Service para métricas e dashboard
"""
from datetime import datetime, date, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.models import Cliente, Agendamento, Contato, Visita, Usuario

class DashboardService:
    """Service para gerar dados do dashboard de relacionamento"""
    
    @staticmethod
    def obter_metricas_dashboard(db: Session) -> Dict[str, Any]:
        """Obtém métricas principais do dashboard"""
        hoje = date.today()
        proximos_7_dias = hoje + timedelta(days=7)
        proximos_30_dias = hoje + timedelta(days=30)
        
        # Contadores básicos
        total_clientes = db.query(Cliente).count()
        clientes_ativos = db.query(Cliente).filter(Cliente.status_relacionamento == "ATIVO").count()
        clientes_onboarding = db.query(Cliente).filter(Cliente.status_onboarding != "CONCLUIDO").count()
        
        # Agendamentos próximos
        agendamentos_hoje = db.query(Agendamento).filter(
            func.date(Agendamento.data_agendada) == hoje,
            Agendamento.status == "PENDENTE"
        ).count()
        
        agendamentos_7_dias = db.query(Agendamento).filter(
            and_(
                func.date(Agendamento.data_agendada) >= hoje,
                func.date(Agendamento.data_agendada) <= proximos_7_dias,
                Agendamento.status == "PENDENTE"
            )
        ).count()
        
        # Visitas atrasadas (agendamentos de visita técnica não realizados)
        visitas_atrasadas = db.query(Agendamento).filter(
            Agendamento.tipo == "VISITA_TECNICA",
            Agendamento.status == "PENDENTE",
            func.date(Agendamento.data_agendada) < hoje
        ).count()
        
        # Satisfação média das visitas dos últimos 90 dias
        data_90_dias = hoje - timedelta(days=90)
        satisfacao_query = db.query(func.avg(Visita.satisfacao)).filter(
            Visita.data >= data_90_dias,
            Visita.satisfacao.isnot(None)
        ).scalar()
        satisfacao_media = round(satisfacao_query, 1) if satisfacao_query else None
        
        # Contatos recentes (últimos 30 dias)
        contatos_recentes = db.query(Contato).filter(
            Contato.data >= (hoje - timedelta(days=30))
        ).count()
        
        return {
            "resumo": {
                "total_clientes": total_clientes,
                "clientes_ativos": clientes_ativos,
                "clientes_onboarding": clientes_onboarding,
                "agendamentos_hoje": agendamentos_hoje,
                "agendamentos_proximos_7_dias": agendamentos_7_dias,
                "visitas_atrasadas": visitas_atrasadas,
                "satisfacao_media": satisfacao_media,
                "contatos_recentes": contatos_recentes
            }
        }
    
    @staticmethod
    def obter_proximos_contatos(db: Session, limit: int = 10) -> List[Agendamento]:
        """Obtém próximos agendamentos pendentes"""
        return db.query(Agendamento).filter(
            Agendamento.status == "PENDENTE",
            Agendamento.data_agendada >= datetime.now()
        ).order_by(Agendamento.data_agendada.asc()).limit(limit).all()
    
    @staticmethod
    def obter_agendamentos_atrasados(db: Session, limit: int = 10) -> List[Agendamento]:
        """Obtém agendamentos atrasados"""
        return db.query(Agendamento).filter(
            Agendamento.status == "PENDENTE",
            Agendamento.data_agendada < datetime.now()
        ).order_by(Agendamento.data_agendada.desc()).limit(limit).all()
    
    @staticmethod
    def obter_visitas_recentes(db: Session, limit: int = 5) -> List[Visita]:
        """Obtém visitas recentes com suas avaliações"""
        return db.query(Visita).order_by(Visita.data.desc()).limit(limit).all()
    
    @staticmethod
    def obter_estatisticas_satisfacao(db: Session) -> Dict[str, Any]:
        """Obtém estatísticas detalhadas de satisfação"""
        hoje = date.today()
        
        # Satisfação por período
        periodos = {
            "ultimos_30_dias": hoje - timedelta(days=30),
            "ultimos_90_dias": hoje - timedelta(days=90),
            "ultimo_ano": hoje - timedelta(days=365)
        }
        
        estatisticas = {}
        for periodo, data_inicio in periodos.items():
            stats = db.query(
                func.avg(Visita.satisfacao).label('media'),
                func.min(Visita.satisfacao).label('minima'),
                func.max(Visita.satisfacao).label('maxima'),
                func.count(Visita.satisfacao).label('total')
            ).filter(
                Visita.data >= data_inicio,
                Visita.satisfacao.isnot(None)
            ).first()
            
            estatisticas[periodo] = {
                "media": round(stats.media, 1) if stats.media else None,
                "minima": stats.minima,
                "maxima": stats.maxima,
                "total_avaliacoes": stats.total
            }
        
        # Distribuição de notas
        distribuicao = db.query(
            Visita.satisfacao,
            func.count(Visita.satisfacao).label('quantidade')
        ).filter(
            Visita.data >= periodos["ultimos_90_dias"],
            Visita.satisfacao.isnot(None)
        ).group_by(Visita.satisfacao).order_by(Visita.satisfacao).all()
        
        estatisticas["distribuicao_notas"] = {
            str(nota): quantidade for nota, quantidade in distribuicao
        }
        
        return estatisticas
    
    @staticmethod
    def obter_clientes_sem_contato(db: Session, dias: int = 30) -> List[Cliente]:
        """Obtém clientes que não têm contato há X dias"""
        data_limite = date.today() - timedelta(days=dias)
        
        # Clientes que não têm contatos recentes
        clientes_com_contato_recente = db.query(Contato.cliente_id).filter(
            Contato.data >= data_limite
        ).distinct().subquery()
        
        return db.query(Cliente).filter(
            Cliente.status_relacionamento == "ATIVO",
            ~Cliente.id.in_(clientes_com_contato_recente)
        ).all()