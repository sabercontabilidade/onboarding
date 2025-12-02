/**
 * Serviço de integração com Gmail API
 * Permite enviar emails usando a conta Google conectada do usuário
 */
import { google } from 'googleapis';
import { getAuthenticatedClient } from './oauth.js';

/**
 * Codificar email para formato RFC 2822 (base64url)
 */
function encodeEmail(email: {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const mimeType = email.isHtml ? 'text/html' : 'text/plain';

  const emailLines = [
    `To: ${email.to}`,
    email.cc ? `Cc: ${email.cc}` : '',
    email.bcc ? `Bcc: ${email.bcc}` : '',
    email.replyTo ? `Reply-To: ${email.replyTo}` : '',
    `Subject: =?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${mimeType}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(email.body).toString('base64'),
  ].filter(Boolean);

  const rawEmail = emailLines.join('\r\n');

  // Encode para base64url (RFC 4648)
  return Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Enviar email usando Gmail API
 */
export async function sendEmail(
  userId: string,
  email: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string;
    bcc?: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const oauth2Client = await getAuthenticatedClient(userId);

    if (!oauth2Client) {
      return {
        success: false,
        error: 'Usuário não conectado ao Google ou tokens inválidos',
      };
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const encodedMessage = encodeEmail(email);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`[GMAIL] Email enviado para ${email.to} - MessageId: ${response.data.id}`);

    return {
      success: true,
      messageId: response.data.id || undefined,
    };
  } catch (error: any) {
    console.error('[GMAIL] Erro ao enviar email:', error);

    // Tratamento de erros específicos
    if (error.code === 401 || error.code === 403) {
      return {
        success: false,
        error: 'Permissões insuficientes. Reconecte sua conta Google com permissões de Gmail.',
      };
    }

    return {
      success: false,
      error: error.message || 'Erro ao enviar email',
    };
  }
}

/**
 * Enviar email de boas-vindas para novo usuário
 */
export async function sendWelcomeEmailViaGmail(
  senderUserId: string,
  recipientEmail: string,
  userName: string,
  tempPassword?: string
): Promise<{ success: boolean; error?: string }> {
  const loginUrl = process.env.APP_URL || 'http://localhost:5000';

  const subject = 'Bem-vindo ao SABER Onboarding!';

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af;">Bem-vindo ao SABER Onboarding!</h1>

      <p>Olá, <strong>${userName}</strong>!</p>

      <p>Sua conta foi criada com sucesso no sistema SABER Onboarding.</p>

      ${tempPassword ? `
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Suas credenciais de acesso:</strong></p>
          <p style="margin: 8px 0;">Email: ${recipientEmail}</p>
          <p style="margin: 8px 0;">Senha temporária: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p style="color: #dc2626;"><strong>Importante:</strong> Altere sua senha no primeiro acesso.</p>
      ` : ''}

      <p>
        <a href="${loginUrl}/login"
           style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Acessar o Sistema
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        Este é um email automático do sistema SABER Onboarding.<br>
        Em caso de dúvidas, entre em contato com o administrador.
      </p>
    </div>
  `;

  return sendEmail(senderUserId, {
    to: recipientEmail,
    subject,
    body,
    isHtml: true,
  });
}

/**
 * Enviar email de lembrete de agendamento
 */
export async function sendAppointmentReminderViaGmail(
  senderUserId: string,
  recipientEmail: string,
  appointment: {
    title: string;
    date: Date;
    time: string;
    location?: string;
    meetingUrl?: string;
    clientName: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const subject = `Lembrete: ${appointment.title}`;

  const formattedDate = appointment.date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af;">Lembrete de Agendamento</h1>

      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af;">
        <h2 style="margin-top: 0; color: #1e3a8a;">${appointment.title}</h2>

        <p><strong>Data:</strong> ${formattedDate}</p>
        <p><strong>Horário:</strong> ${appointment.time}</p>
        <p><strong>Cliente:</strong> ${appointment.clientName}</p>

        ${appointment.location ? `<p><strong>Local:</strong> ${appointment.location}</p>` : ''}

        ${appointment.meetingUrl ? `
          <p>
            <a href="${appointment.meetingUrl}"
               style="display: inline-block; background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              Entrar na Reunião
            </a>
          </p>
        ` : ''}
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        Este é um lembrete automático do sistema SABER Onboarding.
      </p>
    </div>
  `;

  return sendEmail(senderUserId, {
    to: recipientEmail,
    subject,
    body,
    isHtml: true,
  });
}

/**
 * Enviar email de atualização de status do cliente
 */
export async function sendClientStatusUpdateViaGmail(
  senderUserId: string,
  recipientEmail: string,
  data: {
    clientName: string;
    oldStatus: string;
    newStatus: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    onboarding: 'Em Onboarding',
    active: 'Ativo',
    inactive: 'Inativo',
  };

  const subject = `Atualização de Status: ${data.clientName}`;

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af;">Atualização de Status do Cliente</h1>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
        <h2 style="margin-top: 0;">${data.clientName}</h2>

        <p>
          <strong>Status anterior:</strong>
          <span style="color: #6b7280;">${statusLabels[data.oldStatus] || data.oldStatus}</span>
        </p>

        <p>
          <strong>Novo status:</strong>
          <span style="color: #059669; font-weight: bold;">${statusLabels[data.newStatus] || data.newStatus}</span>
        </p>

        ${data.notes ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p><strong>Observações:</strong></p>
            <p style="color: #374151;">${data.notes}</p>
          </div>
        ` : ''}
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        Este é um email automático do sistema SABER Onboarding.
      </p>
    </div>
  `;

  return sendEmail(senderUserId, {
    to: recipientEmail,
    subject,
    body,
    isHtml: true,
  });
}

/**
 * Verificar se o usuário tem escopo do Gmail autorizado
 */
export async function hasGmailScope(userId: string): Promise<boolean> {
  try {
    const oauth2Client = await getAuthenticatedClient(userId);
    if (!oauth2Client) return false;

    const credentials = oauth2Client.credentials;
    const scopes = credentials.scope?.split(' ') || [];

    return scopes.some(scope =>
      scope.includes('gmail.send') ||
      scope.includes('gmail.compose') ||
      scope.includes('mail.google.com')
    );
  } catch {
    return false;
  }
}
