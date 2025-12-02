/**
 * Job de sincronização de agendamentos com Google Calendar
 * Executa a cada hora para sincronizar agendamentos pendentes
 */
import { db } from '../../../db.js';
import { appointments, users, clients } from '../../../../shared/schema.js';
import { eq, and, isNull, gt, lte } from 'drizzle-orm';
import { createCalendarEvent } from '../../google/calendar.js';
import { isUserConnected } from '../../google/oauth.js';
import { addDays } from 'date-fns';

/**
 * Sincroniza agendamentos pendentes com Google Calendar
 * - Busca agendamentos sem googleEventId
 * - Cria eventos no calendário do responsável
 * - Atualiza googleEventId no banco
 */
export async function syncAppointmentsJob(): Promise<void> {
  console.log('[SYNC-JOB] Iniciando sincronização de agendamentos...');

  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  try {
    // Buscar agendamentos pendentes sem google_event_id nos próximos 30 dias
    const pendingAppointments = await db
      .select({
        appointment: appointments,
        client: clients,
        assignee: users,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(users, eq(appointments.assigneeId, users.id))
      .where(
        and(
          eq(appointments.status, 'scheduled'),
          isNull(appointments.googleEventId),
          gt(appointments.scheduledStart, now),
          lte(appointments.scheduledStart, thirtyDaysFromNow)
        )
      );

    console.log(`[SYNC-JOB] Encontrados ${pendingAppointments.length} agendamentos para sincronizar`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const { appointment, client, assignee } of pendingAppointments) {
      if (!assignee) {
        console.log(`[SYNC-JOB] Agendamento ${appointment.id} sem responsável, pulando...`);
        skipped++;
        continue;
      }

      // Verificar se usuário está conectado ao Google
      const connected = await isUserConnected(assignee.id);
      if (!connected) {
        console.log(`[SYNC-JOB] Usuário ${assignee.id} não conectado ao Google, pulando...`);
        skipped++;
        continue;
      }

      try {
        // Criar evento no Google Calendar
        const result = await createCalendarEvent(assignee.id, {
          title: appointment.title,
          description: appointment.description || `Cliente: ${client?.companyName || 'N/A'}`,
          startTime: new Date(appointment.scheduledStart),
          endTime: new Date(appointment.scheduledEnd),
          location: appointment.location || undefined,
          attendees: client?.contactEmail ? [client.contactEmail] : [],
          meetingUrl: appointment.meetingUrl || undefined,
        });

        if (result) {
          // Atualizar agendamento com googleEventId
          await db
            .update(appointments)
            .set({ googleEventId: result.eventId })
            .where(eq(appointments.id, appointment.id));

          synced++;
          console.log(`[SYNC-JOB] Agendamento ${appointment.id} sincronizado -> ${result.eventId}`);
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`[SYNC-JOB] Erro ao sincronizar agendamento ${appointment.id}:`, error);
        errors++;
      }
    }

    console.log(`[SYNC-JOB] Concluído: ${synced} sincronizados, ${skipped} pulados, ${errors} erros`);
  } catch (error) {
    console.error('[SYNC-JOB] Erro fatal no job de sincronização:', error);
  }
}
