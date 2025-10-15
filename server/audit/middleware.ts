import type { Request, Response, NextFunction } from 'express';
import { auditFromRequest } from './logger.js';

/**
 * Middleware para auditar automaticamente todas as requisições relevantes
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Armazenar o método original de send
  const originalSend = res.send;

  // Sobrescrever o método send para capturar a resposta
  res.send = function (data: any) {
    // Restaurar o método original
    res.send = originalSend;

    // Se a operação foi bem-sucedida (2xx), criar audit log
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Determinar se é uma operação relevante para auditoria
      const method = req.method;
      const path = req.path;

      // Apenas auditar operações de modificação (POST, PUT, PATCH, DELETE)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        setImmediate(async () => {
          try {
            await auditRequest(req, res);
          } catch (error) {
            console.error('Erro ao auditar requisição:', error);
          }
        });
      }
    }

    // Continuar com a resposta original
    return originalSend.call(res, data);
  };

  next();
}

/**
 * Auditar uma requisição específica
 */
async function auditRequest(req: Request, res: Response) {
  const method = req.method;
  const path = req.path;

  // Mapear rotas para ações de auditoria
  const routeMap: Record<string, { entity: string; action: string }> = {
    // Clientes
    'POST /api/clients': { entity: 'client', action: 'client_create' },
    'PUT /api/clients/:id': { entity: 'client', action: 'client_update' },
    'DELETE /api/clients/:id': { entity: 'client', action: 'client_delete' },

    // Usuários
    'POST /api/users': { entity: 'user', action: 'user_create' },
    'PUT /api/users/:id': { entity: 'user', action: 'user_update' },
    'DELETE /api/users/:id': { entity: 'user', action: 'user_delete' },

    // Agendamentos
    'POST /api/appointments': { entity: 'appointment', action: 'appointment_create' },
    'PUT /api/appointments/:id': { entity: 'appointment', action: 'appointment_update' },
    'DELETE /api/appointments/:id': { entity: 'appointment', action: 'appointment_delete' },

    // Visitas
    'POST /api/visits': { entity: 'visit', action: 'visit_create' },
    'PUT /api/visits/:id': { entity: 'visit', action: 'visit_update' },
    'DELETE /api/visits/:id': { entity: 'visit', action: 'visit_delete' },

    // Onboarding
    'POST /api/clients/:id/start-onboarding': { entity: 'onboarding', action: 'onboarding_start' },
    'PUT /api/onboarding/:id': { entity: 'onboarding_stage', action: 'onboarding_stage_update' },

    // Atribuições
    'POST /api/assignments': { entity: 'assignment', action: 'assignment_create' },
    'POST /api/assignments/:id/sign': { entity: 'assignment', action: 'assignment_sign' },

    // Comentários
    'POST /api/comments': { entity: 'comment', action: 'comment_create' },
    'PUT /api/comments/:id': { entity: 'comment', action: 'comment_update' },
    'DELETE /api/comments/:id': { entity: 'comment', action: 'comment_delete' },
  };

  // Normalizar path para matching
  const normalizedPath = path.replace(/\/[a-f0-9\-]{36}/gi, '/:id');
  const routeKey = `${method} ${normalizedPath}`;

  const routeConfig = routeMap[routeKey];
  if (!routeConfig) {
    // Rota não mapeada para auditoria automática
    return;
  }

  // Extrair ID da entidade se houver
  const entityId = req.params.id || req.body?.id;

  // Criar descrição baseada na ação
  let descricao = '';
  switch (method) {
    case 'POST':
      descricao = `${routeConfig.entity} criado`;
      break;
    case 'PUT':
    case 'PATCH':
      descricao = `${routeConfig.entity} atualizado`;
      break;
    case 'DELETE':
      descricao = `${routeConfig.entity} deletado`;
      break;
  }

  if (entityId) {
    descricao += ` (ID: ${entityId})`;
  }

  // Criar log de auditoria
  await auditFromRequest(req, {
    acao: routeConfig.action,
    entidade: routeConfig.entity,
    entidadeId: entityId,
    descricao,
    dadosNovos: method !== 'DELETE' ? req.body : undefined,
  });
}
