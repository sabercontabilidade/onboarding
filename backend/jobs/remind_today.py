"""
Job para enviar lembretes diários dos agendamentos
"""
import logging
from datetime import datetime, date, timedelta
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from backend.database import SessionLocal
from backend.models import Agendamento, Usuario, Cliente
from backend.services.google_service import GoogleService

logger = logging.getLogger(__name__)

def remind_today_job():
    """
    Job executado diariamente às 08:00 para enviar lembretes
    
    Envia e-mail com todos os agendamentos do dia para cada responsável
    """
    logger.info("Iniciando job de lembretes diários...")
    
    db = SessionLocal()
    try:
        hoje = date.today()
        
        # Buscar agendamentos de hoje agrupados por responsável
        agendamentos_hoje = db.query(Agendamento).join(Cliente).join(Usuario).filter(
            and_(
                func.date(Agendamento.data_agendada) == hoje,
                Agendamento.status == "PENDENTE"
            )
        ).all()
        
        if not agendamentos_hoje:
            logger.info("Nenhum agendamento para hoje")
            return
        
        # Agrupar por responsável
        agendamentos_por_responsavel = defaultdict(list)
        for agendamento in agendamentos_hoje:
            responsavel_id = agendamento.responsavel_id
            agendamentos_por_responsavel[responsavel_id].append(agendamento)
        
        logger.info(f"Encontrados agendamentos para {len(agendamentos_por_responsavel)} responsáveis")
        
        enviados = 0
        erros = 0
        
        for responsavel_id, agendamentos in agendamentos_por_responsavel.items():
            try:
                # Obter dados do responsável
                responsavel = db.query(Usuario).filter(Usuario.id == responsavel_id).first()
                if not responsavel:
                    logger.warning(f"Responsável {responsavel_id} não encontrado")
                    continue
                
                # Verificar credenciais Google
                credentials = GoogleService.get_user_credentials(db, responsavel.id)
                if not credentials:
                    logger.warning(f"Credenciais Google não disponíveis para {responsavel.nome}")
                    continue
                
                # Enviar e-mail com agendamentos do dia
                sucesso = _enviar_lembrete_diario(
                    credentials, responsavel, agendamentos, db
                )
                
                if sucesso:
                    enviados += 1
                    logger.info(f"Lembrete enviado para {responsavel.nome}")
                else:
                    erros += 1
                    
            except Exception as e:
                logger.error(f"Erro ao processar responsável {responsavel_id}: {e}")
                erros += 1
        
        logger.info(f"Job concluído: {enviados} lembretes enviados, {erros} erros")
        
    except Exception as e:
        logger.error(f"Erro geral no job de lembretes: {e}")
    finally:
        db.close()

def _enviar_lembrete_diario(
    credentials, 
    responsavel: Usuario, 
    agendamentos: list, 
    db: Session
) -> bool:
    """Envia e-mail com agendamentos do dia para o responsável"""
    try:
        hoje_formatado = date.today().strftime("%d/%m/%Y")
        
        subject = f"Agendamentos do dia - {hoje_formatado}"
        
        # Construir lista de agendamentos
        lista_agendamentos = ""
        for agendamento in agendamentos:
            # Obter cliente
            cliente = db.query(Cliente).filter(Cliente.id == agendamento.cliente_id).first()
            
            hora = agendamento.data_agendada.strftime("%H:%M")
            
            lista_agendamentos += f"""
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">{hora}</td>
                <td style="padding: 10px;">{agendamento.titulo}</td>
                <td style="padding: 10px;">{cliente.nome if cliente else 'N/A'}</td>
                <td style="padding: 10px;">{agendamento.tipo}</td>
                <td style="padding: 10px;">{agendamento.local or 'A definir'}</td>
            </tr>
            """
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
            <div style="max-width: 800px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                    Agendamentos de Hoje - {hoje_formatado}
                </h2>
                
                <p>Olá <strong>{responsavel.nome}</strong>,</p>
                
                <p>Você tem <strong>{len(agendamentos)} agendamento(s)</strong> para hoje:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Horário</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Título</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Cliente</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Local</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista_agendamentos}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #007bff;">
                    <h4 style="margin: 0 0 10px 0; color: #0056b3;">💡 Dicas para o dia:</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Verifique se todos os materiais necessários estão preparados</li>
                        <li>Confirme endereços e horários com os clientes</li>
                        <li>Lembre-se de atualizar o status dos agendamentos após as reuniões</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                    Este é um lembrete automático do sistema SABER Onboarding.<br>
                    Para acessar mais detalhes, faça login no sistema.
                </p>
            </div>
        </body>
        </html>
        """
        
        return GoogleService.send_email_notification(
            credentials, responsavel.email, subject, body
        )
        
    except Exception as e:
        logger.error(f"Erro ao enviar lembrete para {responsavel.nome}: {e}")
        return False

def _obter_estatisticas_agendamentos(agendamentos: list) -> dict:
    """Obtém estatísticas dos agendamentos para incluir no e-mail"""
    tipos = defaultdict(int)
    total_tempo = timedelta()
    
    for agendamento in agendamentos:
        tipos[agendamento.tipo] += 1
        # Assumindo 1 hora por agendamento como padrão
        total_tempo += timedelta(hours=1)
    
    return {
        'total': len(agendamentos),
        'tipos': dict(tipos),
        'tempo_estimado': str(total_tempo).split(':')[0] + 'h'  # Apenas horas
    }