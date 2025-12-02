/**
 * Templates de email HTML para o sistema SABER Onboarding
 */

export interface AppointmentEmailData {
  clientName: string;
  title: string;
  dateTime: string;
  type: string;
  location?: string;
  responsibleName: string;
  description?: string;
}

export interface DailyReminderData {
  userName: string;
  appointments: Array<{
    title: string;
    time: string;
    clientName: string;
    type: string;
  }>;
}

export interface WelcomeEmailData {
  clientName: string;
  companyName: string;
  responsibleName: string;
}

export interface NotificationEmailData {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

const baseStyles = `
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f9f9f9;
`;

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const headerStyles = `
  text-align: center;
  margin-bottom: 20px;
`;

const footerStyles = `
  text-align: center;
  color: #64748b;
  font-size: 14px;
`;

/**
 * Template de confirmação de agendamento
 */
export function buildAppointmentEmailHtml(data: AppointmentEmailData): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #16a34a; text-align: center;">✅ Agendamento Confirmado</h2>
        <p>Olá <strong>${data.clientName}</strong>,</p>
        <p>Seu agendamento foi confirmado com sucesso!</p>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>📅 Data/Hora:</strong></td><td>${data.dateTime}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>📝 Título:</strong></td><td>${data.title}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>🏷️ Tipo:</strong></td><td>${data.type}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>📍 Local:</strong></td><td>${data.location || 'A definir'}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>👤 Responsável:</strong></td><td>${data.responsibleName}</td></tr>
          </table>
        </div>
        ${data.description ? `<p style="background-color: #fef3c7; padding: 15px; border-radius: 8px;"><strong>Observações:</strong> ${data.description}</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de lembrete diário de agendamentos
 */
export function buildDailyReminderHtml(data: DailyReminderData): string {
  const appointmentsList = data.appointments.map(apt => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px;">${apt.time}</td>
      <td style="padding: 12px;"><strong>${apt.title}</strong></td>
      <td style="padding: 12px;">${apt.clientName}</td>
      <td style="padding: 12px;"><span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${apt.type}</span></td>
    </tr>
  `).join('');

  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #f59e0b; text-align: center;">📅 Lembrete de Agendamentos</h2>
        <p>Olá <strong>${data.userName}</strong>,</p>
        <p>Você tem <strong>${data.appointments.length}</strong> agendamento(s) para hoje:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 12px; text-align: left;">Horário</th>
              <th style="padding: 12px; text-align: left;">Título</th>
              <th style="padding: 12px; text-align: left;">Cliente</th>
              <th style="padding: 12px; text-align: left;">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${appointmentsList}
          </tbody>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Tenha um ótimo dia!<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de email de boas-vindas
 */
export function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #16a34a; text-align: center;">🎉 Bem-vindo!</h2>
        <p>Olá <strong>${data.clientName}</strong>,</p>
        <p>É com grande satisfação que damos as boas-vindas à <strong>${data.companyName}</strong> como novo cliente da SABER Contábil!</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p style="margin: 0;"><strong>Seu responsável de onboarding:</strong> ${data.responsibleName}</p>
          <p style="margin: 10px 0 0 0;">Em breve entraremos em contato para agendar nossa primeira reunião e iniciar o processo de integração.</p>
        </div>
        <p>Estamos à disposição para qualquer dúvida!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de notificação genérica
 */
export function buildNotificationEmailHtml(data: NotificationEmailData): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #3b82f6; text-align: center;">🔔 ${data.title}</h2>
        <p>Olá <strong>${data.userName}</strong>,</p>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">${data.message}</p>
        </div>
        ${data.actionUrl ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              ${data.actionText || 'Ver Detalhes'}
            </a>
          </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de reagendamento
 */
export function buildRescheduleEmailHtml(data: {
  clientName: string;
  oldDateTime: string;
  newDateTime: string;
  title: string;
  reason?: string;
}): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #f59e0b; text-align: center;">📅 Agendamento Reagendado</h2>
        <p>Olá <strong>${data.clientName}</strong>,</p>
        <p>Seu agendamento foi reagendado:</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📝 Evento:</strong> ${data.title}</p>
          <p style="text-decoration: line-through; color: #9ca3af;"><strong>Data anterior:</strong> ${data.oldDateTime}</p>
          <p style="color: #16a34a;"><strong>Nova data:</strong> ${data.newDateTime}</p>
          ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de cancelamento
 */
export function buildCancellationEmailHtml(data: {
  clientName: string;
  title: string;
  dateTime: string;
  reason?: string;
}): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #ef4444; text-align: center;">❌ Agendamento Cancelado</h2>
        <p>Olá <strong>${data.clientName}</strong>,</p>
        <p>Infelizmente, seu agendamento foi cancelado:</p>
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p><strong>📝 Evento:</strong> ${data.title}</p>
          <p><strong>📅 Data:</strong> ${data.dateTime}</p>
          ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
        </div>
        <p>Entraremos em contato em breve para reagendar.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de recuperação de senha
 */
export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}

export function buildPasswordResetEmailHtml(data: PasswordResetEmailData): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #f59e0b; text-align: center;">🔐 Recuperação de Senha</h2>
        <p>Olá <strong>${data.userName}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin-bottom: 15px;">Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${data.resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            ⚠️ <strong>Atenção:</strong> Este link expira em <strong>${data.expiresIn}</strong>.
          </p>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Se você não solicitou a recuperação de senha, ignore este email. Sua conta permanece segura.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de boas-vindas para novos usuários do sistema
 */
export interface UserWelcomeEmailData {
  userName: string;
  userEmail: string;
  tempPassword?: string;
  loginUrl: string;
  supportEmail?: string;
}

export function buildUserWelcomeEmailHtml(data: UserWelcomeEmailData): string {
  return `
    <html>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <h1 style="color: #2563eb; margin: 0;">SABER Onboarding</h1>
        </div>
        <h2 style="color: #16a34a; text-align: center;">🎉 Bem-vindo(a) à Equipe!</h2>
        <p>Olá <strong>${data.userName}</strong>,</p>
        <p>Sua conta no sistema SABER Onboarding foi criada com sucesso!</p>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>📧 Email:</strong></td><td>${data.userEmail}</td></tr>
            ${data.tempPassword ? `<tr><td style="padding: 8px 0;"><strong>🔑 Senha temporária:</strong></td><td><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${data.tempPassword}</code></td></tr>` : ''}
          </table>
        </div>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${data.loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Acessar Sistema
          </a>
        </div>
        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            📅 <strong>Importante:</strong> No seu primeiro acesso, você será solicitado a conectar sua conta Google para gerenciar sua agenda.
          </p>
        </div>
        ${data.tempPassword ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            🔒 <strong>Segurança:</strong> Recomendamos alterar sua senha temporária no primeiro acesso.
          </p>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="${footerStyles}">
          Atenciosamente,<br>
          <strong>Equipe SABER Contábil</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}
