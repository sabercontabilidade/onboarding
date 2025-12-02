/**
 * Serviço de agendamento de jobs
 * Usa node-schedule para executar tarefas em horários específicos
 */
import schedule from 'node-schedule';
import { syncAppointmentsJob } from './jobs/sync-appointments.js';
import { dailyRemindersJob } from './jobs/daily-reminders.js';

const TIMEZONE = 'America/Sao_Paulo';

interface JobInfo {
  id: string;
  name: string;
  schedule: string;
  nextRun: Date | null;
  lastRun: Date | null;
  running: boolean;
}

class JobScheduler {
  private jobs: Map<string, schedule.Job> = new Map();
  private jobInfo: Map<string, { name: string; schedule: string; lastRun: Date | null }> = new Map();
  private started: boolean = false;

  /**
   * Inicia todos os jobs agendados
   */
  start(): void {
    if (this.started) {
      console.log('[SCHEDULER] Já iniciado');
      return;
    }

    console.log('[SCHEDULER] Iniciando scheduler de jobs...');

    // Job 1: Sincronização de agendamentos com Google Calendar (a cada hora, minuto 0)
    const syncJob = schedule.scheduleJob(
      { rule: '0 * * * *', tz: TIMEZONE },
      async () => {
        this.updateLastRun('sync_appointments');
        await syncAppointmentsJob();
      }
    );
    this.jobs.set('sync_appointments', syncJob);
    this.jobInfo.set('sync_appointments', {
      name: 'Sincronização Google Calendar',
      schedule: 'A cada hora (minuto 0)',
      lastRun: null,
    });

    // Job 2: Lembretes diários (às 08:00)
    const reminderJob = schedule.scheduleJob(
      { hour: 8, minute: 0, tz: TIMEZONE },
      async () => {
        this.updateLastRun('daily_reminders');
        await dailyRemindersJob();
      }
    );
    this.jobs.set('daily_reminders', reminderJob);
    this.jobInfo.set('daily_reminders', {
      name: 'Lembretes Diários',
      schedule: 'Todo dia às 08:00',
      lastRun: null,
    });

    this.started = true;
    console.log('[SCHEDULER] Jobs agendados:');
    this.logScheduledJobs();
  }

  /**
   * Encerra todos os jobs gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[SCHEDULER] Encerrando scheduler...');
    await schedule.gracefulShutdown();
    this.jobs.clear();
    this.started = false;
    console.log('[SCHEDULER] Encerrado com sucesso');
  }

  /**
   * Retorna status de todos os jobs
   */
  getStatus(): { running: boolean; jobs: JobInfo[] } {
    const jobsInfo: JobInfo[] = [];

    for (const [id, job] of Array.from(this.jobs.entries())) {
      const info = this.jobInfo.get(id);
      jobsInfo.push({
        id,
        name: info?.name || id,
        schedule: info?.schedule || 'N/A',
        nextRun: job.nextInvocation(),
        lastRun: info?.lastRun || null,
        running: true,
      });
    }

    return {
      running: this.started,
      jobs: jobsInfo,
    };
  }

  /**
   * Executa um job manualmente
   */
  async runJobNow(jobId: string): Promise<boolean> {
    console.log(`[SCHEDULER] Executando job manualmente: ${jobId}`);

    switch (jobId) {
      case 'sync_appointments':
        this.updateLastRun(jobId);
        await syncAppointmentsJob();
        return true;

      case 'daily_reminders':
        this.updateLastRun(jobId);
        await dailyRemindersJob();
        return true;

      default:
        console.warn(`[SCHEDULER] Job desconhecido: ${jobId}`);
        return false;
    }
  }

  /**
   * Verifica se o scheduler está rodando
   */
  isRunning(): boolean {
    return this.started;
  }

  /**
   * Atualiza timestamp da última execução
   */
  private updateLastRun(jobId: string): void {
    const info = this.jobInfo.get(jobId);
    if (info) {
      info.lastRun = new Date();
    }
  }

  /**
   * Loga informações dos jobs agendados
   */
  private logScheduledJobs(): void {
    for (const [id, job] of Array.from(this.jobs.entries())) {
      const info = this.jobInfo.get(id);
      const next = job.nextInvocation();
      console.log(`  - ${info?.name || id}: próxima execução ${next?.toISOString() || 'não agendado'}`);
    }
  }
}

// Singleton
export const jobScheduler = new JobScheduler();

/**
 * Inicializa o scheduler (chamado no startup do servidor)
 */
export function initScheduler(): void {
  jobScheduler.start();
}

/**
 * Encerra o scheduler (chamado no shutdown do servidor)
 */
export async function shutdownScheduler(): Promise<void> {
  await jobScheduler.shutdown();
}
