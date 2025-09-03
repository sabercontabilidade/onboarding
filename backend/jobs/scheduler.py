"""
Configuração e gerenciamento do APScheduler
"""
import logging
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from backend.jobs.sync_agendamentos import sync_agendamentos_job
from backend.jobs.remind_today import remind_today_job

logger = logging.getLogger(__name__)

# Timezone de São Paulo
SP_TZ = pytz.timezone('America/Sao_Paulo')

class JobScheduler:
    """Gerenciador de jobs automáticos"""
    
    def __init__(self):
        # Configurar executor com pool de threads
        executors = {
            'default': ThreadPoolExecutor(20),
        }
        
        # Configurar scheduler
        self.scheduler = BackgroundScheduler(
            executors=executors,
            timezone=SP_TZ,
            job_defaults={
                'coalesce': True,  # Combina execuções em atraso
                'max_instances': 1  # Apenas uma instância por job
            }
        )
        
        self._setup_jobs()
    
    def _setup_jobs(self):
        """Configura todos os jobs automáticos"""
        
        # Job 1: Sync agendamentos (a cada hora)
        self.scheduler.add_job(
            func=sync_agendamentos_job,
            trigger=IntervalTrigger(hours=1),
            id='sync_agendamentos',
            name='Sincronizar Agendamentos com Google Calendar',
            replace_existing=True,
            misfire_grace_time=300  # 5 minutos de tolerância
        )
        
        # Job 2: Lembrete diário (todo dia às 08:00)
        self.scheduler.add_job(
            func=remind_today_job,
            trigger=CronTrigger(hour=8, minute=0, timezone=SP_TZ),
            id='remind_today',
            name='Enviar Lembretes Diários',
            replace_existing=True,
            misfire_grace_time=1800  # 30 minutos de tolerância
        )
        
        logger.info("Jobs configurados com sucesso")
    
    def start(self):
        """Inicia o scheduler"""
        try:
            self.scheduler.start()
            logger.info("Scheduler iniciado com sucesso")
            self._log_scheduled_jobs()
        except Exception as e:
            logger.error(f"Erro ao iniciar scheduler: {e}")
    
    def shutdown(self):
        """Para o scheduler graciosamente"""
        try:
            self.scheduler.shutdown(wait=True)
            logger.info("Scheduler parado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao parar scheduler: {e}")
    
    def _log_scheduled_jobs(self):
        """Log dos jobs agendados"""
        jobs = self.scheduler.get_jobs()
        logger.info(f"Jobs ativos: {len(jobs)}")
        
        for job in jobs:
            next_run = job.next_run_time
            if next_run:
                logger.info(f"  - {job.name}: próxima execução em {next_run.strftime('%d/%m/%Y %H:%M:%S %Z')}")
            else:
                logger.info(f"  - {job.name}: não agendado")
    
    def get_job_status(self) -> dict:
        """Retorna status de todos os jobs"""
        jobs = self.scheduler.get_jobs()
        
        status = {
            'scheduler_running': self.scheduler.running,
            'total_jobs': len(jobs),
            'jobs': []
        }
        
        for job in jobs:
            # APScheduler 4.x: next_run_time pode não estar disponível diretamente
            try:
                next_run = job.next_run_time
                next_run_str = next_run.isoformat() if next_run else None
            except AttributeError:
                # Fallback para versões mais recentes
                next_run_str = "Agendado"
            
            job_info = {
                'id': job.id,
                'name': job.name,
                'next_run': next_run_str,
                'trigger': str(job.trigger)
            }
            status['jobs'].append(job_info)
        
        return status
    
    def run_job_now(self, job_id: str) -> bool:
        """Executa um job imediatamente"""
        try:
            job = self.scheduler.get_job(job_id)
            if job:
                job.func()
                logger.info(f"Job {job_id} executado manualmente")
                return True
            else:
                logger.warning(f"Job {job_id} não encontrado")
                return False
        except Exception as e:
            logger.error(f"Erro ao executar job {job_id}: {e}")
            return False

# Instância global do scheduler
job_scheduler = JobScheduler()