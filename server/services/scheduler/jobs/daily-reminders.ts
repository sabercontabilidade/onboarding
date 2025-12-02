/**
 * Job de lembretes diários
 * Executa às 08:00 para enviar lembretes de agendamentos do dia
 */
import { db } from '../../../db.js';
import { appointments, users, clients } from '../../../../shared/schema.js';
import { eq, and, gte, lt } from 'drizzle-orm';
import { sendDailyReminder } from '../../email/resend.js';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserAppointments {
  user: {
    id: string;
    nome: string;
    email: string;
  };
  appointments: Array<{
    title: string;
    time: string;
    clientName: string;
    type: string;
  }>;
}

/**
 * Envia lembretes diários para usuários com agendamentos no dia
 */
export async function dailyRemindersJob(): Promise<void> {
  console.log('[REMINDER-JOB] Iniciando envio de lembretes diários...');

  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  try {
    // Buscar todos os agendamentos de hoje
    const todayAppointments = await db
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
          gte(appointments.scheduledStart, dayStart),
          lt(appointments.scheduledStart, dayEnd)
        )
      );

    if (todayAppointments.length === 0) {
      console.log('[REMINDER-JOB] Nenhum agendamento para hoje');
      return;
    }

    console.log(`[REMINDER-JOB] Encontrados ${todayAppointments.length} agendamentos para hoje`);

    // Agrupar agendamentos por usuário
    const userAppointmentsMap = new Map<string, UserAppointments>();

    for (const { appointment, client, assignee } of todayAppointments) {
      if (!assignee?.email) continue;

      if (!userAppointmentsMap.has(assignee.id)) {
        userAppointmentsMap.set(assignee.id, {
          user: {
            id: assignee.id,
            nome: assignee.nome,
            email: assignee.email,
          },
          appointments: [],
        });
      }

      const userAppts = userAppointmentsMap.get(assignee.id)!;

      // Mapear tipo de agendamento para texto legível
      const typeLabels: Record<string, string> = {
        meeting: 'Reunião',
        visit: 'Visita',
        call: 'Ligação',
        followup: 'Follow-up',
      };

      userAppts.appointments.push({
        title: appointment.title,
        time: format(new Date(appointment.scheduledStart), 'HH:mm', { locale: ptBR }),
        clientName: client?.companyName || 'N/A',
        type: typeLabels[appointment.type] || appointment.type,
      });
    }

    // Enviar emails para cada usuário
    let sent = 0;
    let failed = 0;

    for (const [userId, data] of Array.from(userAppointmentsMap.entries())) {
      // Ordenar agendamentos por horário
      data.appointments.sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));

      try {
        const success = await sendDailyReminder(data.user.email, {
          userName: data.user.nome,
          appointments: data.appointments,
        });

        if (success) {
          sent++;
          console.log(`[REMINDER-JOB] Lembrete enviado para ${data.user.email} (${data.appointments.length} agendamentos)`);
        } else {
          failed++;
          console.warn(`[REMINDER-JOB] Falha ao enviar para ${data.user.email}`);
        }
      } catch (error) {
        failed++;
        console.error(`[REMINDER-JOB] Erro ao enviar para ${data.user.email}:`, error);
      }
    }

    console.log(`[REMINDER-JOB] Concluído: ${sent} enviados, ${failed} falhas`);
  } catch (error) {
    console.error('[REMINDER-JOB] Erro fatal no job de lembretes:', error);
  }
}
