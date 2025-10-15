import type { Request } from 'express';
import { db } from '../db.js';
import { auditLogs, type InsertAuditLog } from '@shared/schema';

/**
 * Criar log de auditoria
 */
export async function createAuditLog(data: {
  usuarioId?: string;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  descricao: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
  ipOrigem?: string;
  userAgent?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      usuarioId: data.usuarioId || null,
      acao: data.acao,
      entidade: data.entidade,
      entidadeId: data.entidadeId,
      descricao: data.descricao,
      dadosAnteriores: data.dadosAnteriores || null,
      dadosNovos: data.dadosNovos || null,
      ipOrigem: data.ipOrigem,
      userAgent: data.userAgent,
    });

    console.log(`📝 Audit Log: [${data.acao}] ${data.descricao}`);
  } catch (error) {
    console.error('❌ Erro ao criar audit log:', error);
    // Não bloquear a operação principal se o log falhar
  }
}

/**
 * Extrair IP da requisição
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Criar audit log a partir de uma requisição Express
 */
export async function auditFromRequest(req: Request, data: {
  acao: string;
  entidade?: string;
  entidadeId?: string;
  descricao: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
}) {
  await createAuditLog({
    usuarioId: req.user?.userId,
    acao: data.acao,
    entidade: data.entidade,
    entidadeId: data.entidadeId,
    descricao: data.descricao,
    dadosAnteriores: data.dadosAnteriores,
    dadosNovos: data.dadosNovos,
    ipOrigem: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });
}

/**
 * Helpers para ações comuns
 */
export const AuditActions = {
  // Autenticação
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET: 'password_reset',
  TOKEN_REFRESH: 'token_refresh',

  // Usuários
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ACTIVATE: 'user_activate',
  USER_DEACTIVATE: 'user_deactivate',
  USER_BLOCK: 'user_block',
  USER_UNBLOCK: 'user_unblock',

  // Clientes
  CLIENT_CREATE: 'client_create',
  CLIENT_UPDATE: 'client_update',
  CLIENT_DELETE: 'client_delete',
  CLIENT_STATUS_CHANGE: 'client_status_change',

  // Onboarding
  ONBOARDING_START: 'onboarding_start',
  ONBOARDING_STAGE_UPDATE: 'onboarding_stage_update',
  ONBOARDING_STAGE_COMPLETE: 'onboarding_stage_complete',

  // Atribuições
  ASSIGNMENT_CREATE: 'assignment_create',
  ASSIGNMENT_SIGN: 'assignment_sign',
  ASSIGNMENT_REJECT: 'assignment_reject',
  ASSIGNMENT_COMPLETE: 'assignment_complete',

  // Agendamentos
  APPOINTMENT_CREATE: 'appointment_create',
  APPOINTMENT_UPDATE: 'appointment_update',
  APPOINTMENT_DELETE: 'appointment_delete',
  APPOINTMENT_STATUS_CHANGE: 'appointment_status_change',

  // Visitas
  VISIT_CREATE: 'visit_create',
  VISIT_UPDATE: 'visit_update',
  VISIT_DELETE: 'visit_delete',

  // Comentários
  COMMENT_CREATE: 'comment_create',
  COMMENT_UPDATE: 'comment_update',
  COMMENT_DELETE: 'comment_delete',

  // Notificações
  NOTIFICATION_SEND: 'notification_send',
  NOTIFICATION_READ: 'notification_read',
} as const;

/**
 * Helper para criar descrição de mudanças
 */
export function buildChangeDescription(
  entity: string,
  action: 'criado' | 'atualizado' | 'deletado',
  identifier?: string
): string {
  const entityNames: Record<string, string> = {
    user: 'Usuário',
    client: 'Cliente',
    appointment: 'Agendamento',
    visit: 'Visita',
    onboarding_stage: 'Etapa de Onboarding',
    assignment: 'Atribuição',
    comment: 'Comentário',
    notification: 'Notificação',
  };

  const entityName = entityNames[entity] || entity;
  const id = identifier ? ` (${identifier})` : '';

  return `${entityName}${id} ${action}`;
}

/**
 * Calcular diferenças entre objetos (para dadosAnteriores/dadosNovos)
 */
export function calculateDiff(
  oldData: Record<string, any>,
  newData: Record<string, any>
): { old: Record<string, any>; new: Record<string, any> } {
  const changes: { old: Record<string, any>; new: Record<string, any> } = {
    old: {},
    new: {},
  };

  // Campos que não devem ser logados
  const sensitiveFields = ['senha', 'senhaHash', 'password', 'token', 'refreshToken'];

  for (const key in newData) {
    if (sensitiveFields.includes(key)) continue;

    if (oldData[key] !== newData[key]) {
      changes.old[key] = oldData[key];
      changes.new[key] = newData[key];
    }
  }

  return changes;
}
