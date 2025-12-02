/**
 * Rotas de integração com Google (OAuth2 e Calendar)
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../auth/middleware.js';
import {
  isGoogleConfigured,
  generateAuthUrl,
  exchangeCodeForTokens,
  saveUserTokens,
  isUserConnected,
  disconnectUser,
  getConnectionStatus,
} from '../services/google/oauth.js';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  checkAvailability,
} from '../services/google/calendar.js';
import {
  sendEmail,
  hasGmailScope,
  sendWelcomeEmailViaGmail,
  sendAppointmentReminderViaGmail,
  sendClientStatusUpdateViaGmail,
} from '../services/google/gmail.js';
import { logAudit } from '../audit/logger.js';
import { jobScheduler } from '../services/scheduler/scheduler.js';

const router = Router();

/**
 * GET /api/integrations/google/status
 * Verifica se as credenciais Google estão configuradas no servidor
 */
router.get('/google/status', (req: Request, res: Response) => {
  res.json({
    configured: isGoogleConfigured(),
    message: isGoogleConfigured()
      ? 'Integração Google configurada'
      : 'Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.',
  });
});

/**
 * GET /api/integrations/google/user-status
 * Verifica status da conexão do usuário atual com Google
 */
router.get('/google/user-status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const status = await getConnectionStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao verificar status:', error);
    res.status(500).json({ message: 'Erro ao verificar status da conexão' });
  }
});

/**
 * GET /api/integrations/google/init
 * Inicia fluxo OAuth2 - redireciona para tela de consentimento do Google
 */
router.get('/google/init', authenticate, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!isGoogleConfigured()) {
      return res.status(503).json({
        message: 'Integração Google não configurada no servidor',
      });
    }

    const authUrl = generateAuthUrl(userId);

    // Redireciona para o Google
    res.redirect(authUrl);
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao iniciar OAuth:', error);
    res.status(500).json({ message: 'Erro ao iniciar autenticação com Google' });
  }
});

/**
 * GET /api/integrations/google/callback
 * Callback do OAuth2 - recebe código e troca por tokens
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // Erro retornado pelo Google
    if (error) {
      console.error('[INTEGRATIONS] Erro do Google:', error);
      return res.redirect('/#/configuracoes?google=error&reason=' + error);
    }

    // Validações
    if (!code || typeof code !== 'string') {
      return res.redirect('/#/configuracoes?google=error&reason=no_code');
    }

    if (!state || typeof state !== 'string') {
      return res.redirect('/#/configuracoes?google=error&reason=no_state');
    }

    const userId = state;

    // Troca código por tokens
    const tokens = await exchangeCodeForTokens(code);

    // Salva tokens criptografados
    await saveUserTokens(
      userId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiry
    );

    // Registra na auditoria
    await logAudit({
      usuarioId: userId,
      acao: 'google_connect',
      entidade: 'integration',
      descricao: 'Usuário conectou conta Google',
    });

    console.log(`[INTEGRATIONS] Usuário ${userId} conectou ao Google`);

    // Redireciona para página de configurações com sucesso
    res.redirect('/#/configuracoes?google=success');
  } catch (error) {
    console.error('[INTEGRATIONS] Erro no callback:', error);
    res.redirect('/#/configuracoes?google=error&reason=exchange_failed');
  }
});

/**
 * DELETE /api/integrations/google/disconnect
 * Desconecta usuário do Google
 */
router.delete('/google/disconnect', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const success = await disconnectUser(userId);

    if (success) {
      await logAudit({
        usuarioId: userId,
        acao: 'google_disconnect',
        entidade: 'integration',
        descricao: 'Usuário desconectou conta Google',
      });

      res.json({ message: 'Desconectado do Google com sucesso' });
    } else {
      res.status(500).json({ message: 'Erro ao desconectar do Google' });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao desconectar:', error);
    res.status(500).json({ message: 'Erro ao desconectar do Google' });
  }
});

/**
 * GET /api/integrations/google/calendar/events
 * Lista eventos do calendário do usuário
 */
router.get('/google/calendar/events', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const connected = await isUserConnected(userId);
    if (!connected) {
      return res.status(400).json({ message: 'Usuário não conectado ao Google' });
    }

    // Parâmetros de data
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    const events = await listCalendarEvents(userId, startDate, endDate);

    res.json({
      events: events.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        htmlLink: event.htmlLink,
        meetUrl: event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri,
      })),
    });
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao listar eventos:', error);
    res.status(500).json({ message: 'Erro ao listar eventos do calendário' });
  }
});

/**
 * GET /api/integrations/google/calendar/availability
 * Verifica disponibilidade no calendário
 */
router.get('/google/calendar/availability', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const connected = await isUserConnected(userId);
    if (!connected) {
      return res.status(400).json({ message: 'Usuário não conectado ao Google' });
    }

    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ message: 'Informe startDate e endDate' });
    }

    const busySlots = await checkAvailability(
      userId,
      new Date(startDateStr),
      new Date(endDateStr)
    );

    res.json({ busySlots });
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao verificar disponibilidade:', error);
    res.status(500).json({ message: 'Erro ao verificar disponibilidade' });
  }
});

// ========================================
// ROTAS DE JOBS (SCHEDULER)
// ========================================

/**
 * GET /api/integrations/jobs/status
 * Retorna status de todos os jobs agendados
 */
router.get('/jobs/status', authenticate, (req: Request, res: Response) => {
  try {
    const status = jobScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao obter status dos jobs:', error);
    res.status(500).json({ message: 'Erro ao obter status dos jobs' });
  }
});

/**
 * POST /api/integrations/jobs/:jobId/run
 * Executa um job manualmente (apenas admin)
 */
router.post('/jobs/:jobId/run', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Verificar se é admin
    if (user?.nivelPermissao !== 'administrador') {
      return res.status(403).json({ message: 'Apenas administradores podem executar jobs manualmente' });
    }

    const { jobId } = req.params;
    const success = await jobScheduler.runJobNow(jobId);

    if (success) {
      await logAudit({
        usuarioId: user.id,
        acao: 'job_manual_run',
        entidade: 'job',
        entidadeId: jobId,
        descricao: `Job ${jobId} executado manualmente`,
      });

      res.json({ message: `Job ${jobId} executado com sucesso` });
    } else {
      res.status(404).json({ message: `Job ${jobId} não encontrado` });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao executar job:', error);
    res.status(500).json({ message: 'Erro ao executar job' });
  }
});

// ========================================
// ROTAS DO GMAIL
// ========================================

/**
 * GET /api/integrations/gmail/status
 * Verifica se o usuário tem permissão para enviar emails via Gmail
 */
router.get('/gmail/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const hasScope = await hasGmailScope(userId);
    const connected = await isUserConnected(userId);

    res.json({
      connected,
      gmailEnabled: hasScope,
      message: hasScope
        ? 'Gmail configurado para envio de emails'
        : 'Reconecte sua conta Google para habilitar envio de emails',
    });
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao verificar status Gmail:', error);
    res.status(500).json({ message: 'Erro ao verificar status do Gmail' });
  }
});

/**
 * POST /api/integrations/gmail/send
 * Envia email usando a conta Gmail do usuário
 */
router.post('/gmail/send', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { to, subject, body, isHtml, cc, bcc, replyTo } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        message: 'Campos obrigatórios: to, subject, body',
      });
    }

    const result = await sendEmail(userId, {
      to,
      subject,
      body,
      isHtml,
      cc,
      bcc,
      replyTo,
    });

    if (result.success) {
      await logAudit({
        usuarioId: userId,
        acao: 'email_sent',
        entidade: 'email',
        entidadeId: result.messageId || undefined,
        descricao: `Email enviado para ${to}`,
        dadosNovos: { subject, to },
      });

      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Email enviado com sucesso',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Erro ao enviar email',
      });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao enviar email:', error);
    res.status(500).json({ message: 'Erro ao enviar email' });
  }
});

/**
 * POST /api/integrations/gmail/send-welcome
 * Envia email de boas-vindas para novo usuário
 */
router.post('/gmail/send-welcome', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { recipientEmail, userName, tempPassword } = req.body;

    if (!recipientEmail || !userName) {
      return res.status(400).json({
        message: 'Campos obrigatórios: recipientEmail, userName',
      });
    }

    const result = await sendWelcomeEmailViaGmail(userId, recipientEmail, userName, tempPassword);

    if (result.success) {
      await logAudit({
        usuarioId: userId,
        acao: 'welcome_email_sent',
        entidade: 'email',
        descricao: `Email de boas-vindas enviado para ${recipientEmail}`,
      });

      res.json({
        success: true,
        message: 'Email de boas-vindas enviado com sucesso',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Erro ao enviar email',
      });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao enviar email de boas-vindas:', error);
    res.status(500).json({ message: 'Erro ao enviar email' });
  }
});

/**
 * POST /api/integrations/gmail/send-reminder
 * Envia email de lembrete de agendamento
 */
router.post('/gmail/send-reminder', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { recipientEmail, title, date, time, location, meetingUrl, clientName } = req.body;

    if (!recipientEmail || !title || !date || !time || !clientName) {
      return res.status(400).json({
        message: 'Campos obrigatórios: recipientEmail, title, date, time, clientName',
      });
    }

    const result = await sendAppointmentReminderViaGmail(userId, recipientEmail, {
      title,
      date: new Date(date),
      time,
      location,
      meetingUrl,
      clientName,
    });

    if (result.success) {
      await logAudit({
        usuarioId: userId,
        acao: 'reminder_email_sent',
        entidade: 'email',
        descricao: `Email de lembrete enviado para ${recipientEmail}`,
        dadosNovos: { title, clientName, recipientEmail },
      });

      res.json({
        success: true,
        message: 'Email de lembrete enviado com sucesso',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Erro ao enviar email',
      });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao enviar lembrete:', error);
    res.status(500).json({ message: 'Erro ao enviar email' });
  }
});

/**
 * POST /api/integrations/gmail/send-status-update
 * Envia email de atualização de status do cliente
 */
router.post('/gmail/send-status-update', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { recipientEmail, clientName, oldStatus, newStatus, notes } = req.body;

    if (!recipientEmail || !clientName || !oldStatus || !newStatus) {
      return res.status(400).json({
        message: 'Campos obrigatórios: recipientEmail, clientName, oldStatus, newStatus',
      });
    }

    const result = await sendClientStatusUpdateViaGmail(userId, recipientEmail, {
      clientName,
      oldStatus,
      newStatus,
      notes,
    });

    if (result.success) {
      await logAudit({
        usuarioId: userId,
        acao: 'status_email_sent',
        entidade: 'email',
        descricao: `Email de atualização de status enviado para ${recipientEmail}`,
        dadosNovos: { clientName, oldStatus, newStatus, recipientEmail },
      });

      res.json({
        success: true,
        message: 'Email de atualização enviado com sucesso',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Erro ao enviar email',
      });
    }
  } catch (error) {
    console.error('[INTEGRATIONS] Erro ao enviar atualização:', error);
    res.status(500).json({ message: 'Erro ao enviar email' });
  }
});

export default router;
