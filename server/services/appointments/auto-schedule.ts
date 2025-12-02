/**
 * Serviço de agendamentos automáticos
 * Cria agendamentos obrigatórios de follow-up quando um onboarding é iniciado
 */
import { db } from '../../db.js';
import { appointments, clients, users } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { addDays, setHours, setMinutes } from 'date-fns';
import { sendWelcomeEmail, sendAppointmentConfirmation } from '../email/resend.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Configuração dos agendamentos automáticos
 */
const AUTOMATIC_APPOINTMENTS = [
  { days: 15, type: 'followup' as const, title: 'Acompanhamento D+15' },
  { days: 50, type: 'followup' as const, title: 'Acompanhamento D+50' },
  { days: 80, type: 'followup' as const, title: 'Acompanhamento D+80' },
  { days: 100, type: 'followup' as const, title: 'Acompanhamento D+100' },
  { days: 180, type: 'followup' as const, title: 'Avaliação Semestral D+180' },
];

interface AutoScheduleResult {
  created: number;
  appointments: Array<{
    id: string;
    title: string;
    scheduledDate: Date;
    type: string;
  }>;
}

/**
 * Cria agendamentos automáticos para um cliente que iniciou onboarding
 * @param clientId ID do cliente
 * @param assigneeId ID do responsável pelo onboarding
 * @param startDate Data de início do contrato/onboarding
 * @returns Resultado com agendamentos criados
 */
export async function createAutomaticAppointments(
  clientId: string,
  assigneeId: string,
  startDate: Date
): Promise<AutoScheduleResult> {
  const result: AutoScheduleResult = {
    created: 0,
    appointments: [],
  };

  // Buscar dados do cliente
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    console.error(`[AUTO-SCHEDULE] Cliente ${clientId} não encontrado`);
    return result;
  }

  // Buscar dados do responsável
  const [assignee] = await db
    .select()
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);

  console.log(`[AUTO-SCHEDULE] Criando agendamentos automáticos para ${client.companyName}`);

  for (const config of AUTOMATIC_APPOINTMENTS) {
    try {
      const scheduledDate = addDays(startDate, config.days);
      // Horário padrão: 14:00
      const scheduledStart = setMinutes(setHours(scheduledDate, 14), 0);
      const scheduledEnd = setMinutes(setHours(scheduledDate, 15), 0);

      const [appointment] = await db.insert(appointments).values({
        clientId,
        assigneeId,
        title: `${config.title} - ${client.companyName}`,
        description: `Acompanhamento obrigatório após ${config.days} dias do início do contrato.\n\nCliente: ${client.companyName}\nContato: ${client.contactName}`,
        type: config.type,
        scheduledStart,
        scheduledEnd,
        status: 'scheduled',
      }).returning();

      result.appointments.push({
        id: appointment.id,
        title: appointment.title,
        scheduledDate: scheduledStart,
        type: config.type,
      });

      result.created++;

      console.log(`[AUTO-SCHEDULE] Criado: ${config.title} para ${format(scheduledStart, 'dd/MM/yyyy HH:mm')}`);
    } catch (error) {
      console.error(`[AUTO-SCHEDULE] Erro ao criar ${config.title}:`, error);
    }
  }

  // Enviar email de boas-vindas ao cliente
  if (client.contactEmail && assignee) {
    try {
      await sendWelcomeEmail(client.contactEmail, {
        clientName: client.contactName,
        companyName: client.companyName,
        responsibleName: assignee.nome,
      });
      console.log(`[AUTO-SCHEDULE] Email de boas-vindas enviado para ${client.contactEmail}`);
    } catch (error) {
      console.error('[AUTO-SCHEDULE] Erro ao enviar email de boas-vindas:', error);
    }
  }

  console.log(`[AUTO-SCHEDULE] Concluído: ${result.created} agendamentos criados`);
  return result;
}

/**
 * Atualiza agendamentos automáticos quando a data de início muda
 * Recalcula as datas baseado na nova data de início
 */
export async function updateAutomaticAppointments(
  clientId: string,
  newStartDate: Date
): Promise<number> {
  // Buscar agendamentos pendentes do cliente que são followup
  const pendingAppointments = await db
    .select()
    .from(appointments)
    .where(
      eq(appointments.clientId, clientId)
    );

  // Filtrar apenas os que são automáticos (followup com título padrão)
  const automaticAppts = pendingAppointments.filter(apt =>
    apt.status === 'scheduled' &&
    apt.type === 'followup' &&
    AUTOMATIC_APPOINTMENTS.some(config => apt.title.includes(config.title.split(' ')[0]))
  );

  let updated = 0;

  for (const apt of automaticAppts) {
    // Encontrar qual configuração corresponde
    const config = AUTOMATIC_APPOINTMENTS.find(c =>
      apt.title.includes(c.title.split(' ')[0]) // D+15, D+50, etc.
    );

    if (!config) continue;

    const newScheduledDate = addDays(newStartDate, config.days);
    const newScheduledStart = setMinutes(setHours(newScheduledDate, 14), 0);
    const newScheduledEnd = setMinutes(setHours(newScheduledDate, 15), 0);

    await db
      .update(appointments)
      .set({
        scheduledStart: newScheduledStart,
        scheduledEnd: newScheduledEnd,
      })
      .where(eq(appointments.id, apt.id));

    updated++;
    console.log(`[AUTO-SCHEDULE] Atualizado ${apt.title} para ${format(newScheduledStart, 'dd/MM/yyyy HH:mm')}`);
  }

  return updated;
}

/**
 * Verifica se cliente já tem agendamentos automáticos
 */
export async function hasAutomaticAppointments(clientId: string): Promise<boolean> {
  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId));

  return existingAppointments.some(apt =>
    apt.type === 'followup' &&
    AUTOMATIC_APPOINTMENTS.some(config => apt.title.includes(config.title.split(' ')[0]))
  );
}

/**
 * Cancela agendamentos automáticos de um cliente
 * (Usado quando onboarding é cancelado)
 */
export async function cancelAutomaticAppointments(clientId: string): Promise<number> {
  const pendingAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId));

  const automaticAppts = pendingAppointments.filter(apt =>
    apt.status === 'scheduled' &&
    apt.type === 'followup' &&
    AUTOMATIC_APPOINTMENTS.some(config => apt.title.includes(config.title.split(' ')[0]))
  );

  let cancelled = 0;

  for (const apt of automaticAppts) {
    await db
      .update(appointments)
      .set({ status: 'cancelled' })
      .where(eq(appointments.id, apt.id));

    cancelled++;
  }

  console.log(`[AUTO-SCHEDULE] ${cancelled} agendamentos automáticos cancelados para cliente ${clientId}`);
  return cancelled;
}
