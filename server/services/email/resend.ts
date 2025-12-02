/**
 * Serviço de email transacional usando Resend
 * Documentação: https://resend.com/docs
 */
import { Resend } from 'resend';
import {
  buildAppointmentEmailHtml,
  buildDailyReminderHtml,
  buildWelcomeEmailHtml,
  buildNotificationEmailHtml,
  buildRescheduleEmailHtml,
  buildCancellationEmailHtml,
  buildPasswordResetEmailHtml,
  buildUserWelcomeEmailHtml,
  type AppointmentEmailData,
  type DailyReminderData,
  type WelcomeEmailData,
  type NotificationEmailData,
  type PasswordResetEmailData,
  type UserWelcomeEmailData,
} from './templates.js';

// Inicializar cliente Resend
const resend = new Resend(process.env.EMAIL_API_KEY);
const FROM_EMAIL = process.env.EMAIL_REMETENT || 'onboarding@sabercontabil.com.br';
const FROM_NAME = 'SABER Onboarding';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

interface EmailResult {
  id: string;
  success: boolean;
}

/**
 * Verifica se o serviço de email está configurado
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.EMAIL_API_KEY && process.env.EMAIL_REMETENT);
}

/**
 * Envia email transacional via Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult | null> {
  if (!isEmailConfigured()) {
    console.warn('[EMAIL] Serviço não configurado. Defina EMAIL_API_KEY e EMAIL_REMETENT.');
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('[EMAIL] Erro ao enviar email:', error);
      return null;
    }

    console.log(`[EMAIL] Email enviado com sucesso: ${data?.id}`);
    return { id: data?.id || '', success: true };
  } catch (err) {
    console.error('[EMAIL] Erro inesperado:', err);
    return null;
  }
}

/**
 * Envia confirmação de agendamento
 */
export async function sendAppointmentConfirmation(
  clientEmail: string,
  data: AppointmentEmailData
): Promise<boolean> {
  const html = buildAppointmentEmailHtml(data);

  const result = await sendEmail({
    to: clientEmail,
    subject: `✅ Agendamento Confirmado: ${data.title}`,
    html,
    tags: [
      { name: 'type', value: 'appointment_confirmation' },
      { name: 'appointment_type', value: data.type },
    ],
  });

  return result !== null;
}

/**
 * Envia lembrete diário de agendamentos para um usuário
 */
export async function sendDailyReminder(
  userEmail: string,
  data: DailyReminderData
): Promise<boolean> {
  if (data.appointments.length === 0) {
    return true; // Nada a enviar
  }

  const html = buildDailyReminderHtml(data);

  const result = await sendEmail({
    to: userEmail,
    subject: `📅 Você tem ${data.appointments.length} agendamento(s) hoje`,
    html,
    tags: [
      { name: 'type', value: 'daily_reminder' },
      { name: 'count', value: String(data.appointments.length) },
    ],
  });

  return result !== null;
}

/**
 * Envia email de boas-vindas ao novo cliente
 */
export async function sendWelcomeEmail(
  clientEmail: string,
  data: WelcomeEmailData
): Promise<boolean> {
  const html = buildWelcomeEmailHtml(data);

  const result = await sendEmail({
    to: clientEmail,
    subject: `🎉 Bem-vindo à SABER Contábil, ${data.clientName}!`,
    html,
    tags: [
      { name: 'type', value: 'welcome' },
    ],
  });

  return result !== null;
}

/**
 * Envia notificação genérica por email
 */
export async function sendNotificationEmail(
  userEmail: string,
  data: NotificationEmailData
): Promise<boolean> {
  const html = buildNotificationEmailHtml(data);

  const result = await sendEmail({
    to: userEmail,
    subject: `🔔 ${data.title}`,
    html,
    tags: [
      { name: 'type', value: 'notification' },
    ],
  });

  return result !== null;
}

/**
 * Envia notificação de reagendamento
 */
export async function sendRescheduleNotification(
  clientEmail: string,
  data: {
    clientName: string;
    oldDateTime: string;
    newDateTime: string;
    title: string;
    reason?: string;
  }
): Promise<boolean> {
  const html = buildRescheduleEmailHtml(data);

  const result = await sendEmail({
    to: clientEmail,
    subject: `📅 Agendamento Reagendado: ${data.title}`,
    html,
    tags: [
      { name: 'type', value: 'reschedule' },
    ],
  });

  return result !== null;
}

/**
 * Envia notificação de cancelamento
 */
export async function sendCancellationNotification(
  clientEmail: string,
  data: {
    clientName: string;
    title: string;
    dateTime: string;
    reason?: string;
  }
): Promise<boolean> {
  const html = buildCancellationEmailHtml(data);

  const result = await sendEmail({
    to: clientEmail,
    subject: `❌ Agendamento Cancelado: ${data.title}`,
    html,
    tags: [
      { name: 'type', value: 'cancellation' },
    ],
  });

  return result !== null;
}

/**
 * Envia email para múltiplos destinatários (batch)
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Envia email de recuperação de senha
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  data: PasswordResetEmailData
): Promise<boolean> {
  const html = buildPasswordResetEmailHtml(data);

  const result = await sendEmail({
    to: userEmail,
    subject: '🔐 Recuperação de Senha - SABER Onboarding',
    html,
    tags: [
      { name: 'type', value: 'password_reset' },
    ],
  });

  return result !== null;
}

/**
 * Envia email de boas-vindas para novo usuário do sistema
 */
export async function sendUserWelcomeEmail(
  userEmail: string,
  data: UserWelcomeEmailData
): Promise<boolean> {
  const html = buildUserWelcomeEmailHtml(data);

  const result = await sendEmail({
    to: userEmail,
    subject: `🎉 Bem-vindo(a) ao SABER Onboarding, ${data.userName}!`,
    html,
    tags: [
      { name: 'type', value: 'user_welcome' },
    ],
  });

  return result !== null;
}
