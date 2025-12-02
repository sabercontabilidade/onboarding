/**
 * Rotas de gerenciamento de arquivos
 */
import type { Express, Request, Response } from 'express';
import { db } from '../db.js';
import { files } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../auth/middleware.js';
import { createAuditLog, getClientIp, AuditActions } from '../audit/logger.js';
import {
  uploadFile,
  deleteFile,
  getPresignedUrl,
  isStorageConfigured,
} from '../services/storage/minio.js';

// Limite de tamanho do arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export function registerFileRoutes(app: Express) {
  /**
   * GET /api/files/status
   * Verificar status do serviço de storage
   */
  app.get('/api/files/status', authenticate, async (req: Request, res: Response) => {
    res.json({
      configured: isStorageConfigured(),
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_MIME_TYPES,
    });
  });

  /**
   * POST /api/files/upload
   * Upload de arquivo
   */
  app.post('/api/files/upload', authenticate, async (req: Request, res: Response) => {
    try {
      if (!isStorageConfigured()) {
        return res.status(503).json({
          error: 'Serviço de storage não configurado',
        });
      }

      // Verificar se há arquivo no body (base64)
      const { file, fileName, mimeType, entityType, entityId } = req.body;

      if (!file || !fileName) {
        return res.status(400).json({ error: 'Arquivo e nome são obrigatórios' });
      }

      // Verificar tipo de arquivo
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return res.status(400).json({
          error: 'Tipo de arquivo não permitido',
          allowedTypes: ALLOWED_MIME_TYPES,
        });
      }

      // Converter base64 para buffer
      const base64Data = file.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      // Verificar tamanho
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      }

      // Fazer upload
      const result = await uploadFile(fileBuffer, fileName, mimeType, {
        entityType,
        entityId,
      });

      if (!result) {
        return res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
      }

      // Salvar no banco de dados
      const [savedFile] = await db.insert(files).values({
        fileName: result.fileName,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        url: result.url,
        bucket: result.bucket,
        key: result.key,
        uploadedBy: req.user?.userId,
        entityType,
        entityId,
      }).returning();

      // Audit log
      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: AuditActions.FILE_UPLOAD,
        entidade: 'file',
        entidadeId: savedFile.id,
        descricao: `Arquivo '${fileName}' enviado`,
        dadosNovos: {
          fileName: result.fileName,
          mimeType,
          size: result.size,
          entityType,
          entityId,
        },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        success: true,
        file: savedFile,
      });
    } catch (error) {
      console.error('Erro no upload de arquivo:', error);
      res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
    }
  });

  /**
   * GET /api/files
   * Listar arquivos (com filtros opcionais)
   */
  app.get('/api/files', authenticate, async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.query;

      let query = db.select().from(files);

      // Aplicar filtros
      const conditions = [];
      if (entityType) {
        conditions.push(eq(files.entityType, entityType as string));
      }
      if (entityId) {
        conditions.push(eq(files.entityId, entityId as string));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const result = await query.orderBy(desc(files.createdAt));

      res.json(result);
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
  });

  /**
   * GET /api/files/:id
   * Obter arquivo específico
   */
  app.get('/api/files/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.id, id))
        .limit(1);

      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      res.json(file);
    } catch (error) {
      console.error('Erro ao buscar arquivo:', error);
      res.status(500).json({ error: 'Erro ao buscar arquivo' });
    }
  });

  /**
   * GET /api/files/:id/download
   * Obter URL de download temporária
   */
  app.get('/api/files/:id/download', authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.id, id))
        .limit(1);

      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      // Gerar URL temporária (válida por 1 hora)
      const downloadUrl = await getPresignedUrl(file.key, 3600);

      if (!downloadUrl) {
        return res.status(500).json({ error: 'Erro ao gerar URL de download' });
      }

      res.json({
        url: downloadUrl,
        fileName: file.originalName,
        expiresIn: 3600,
      });
    } catch (error) {
      console.error('Erro ao gerar URL de download:', error);
      res.status(500).json({ error: 'Erro ao gerar URL de download' });
    }
  });

  /**
   * DELETE /api/files/:id
   * Deletar arquivo
   */
  app.delete('/api/files/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Buscar arquivo
      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.id, id))
        .limit(1);

      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      // Verificar permissão (apenas quem enviou ou admin pode deletar)
      if (file.uploadedBy !== req.user?.userId && req.user?.nivelPermissao !== 'administrador') {
        return res.status(403).json({ error: 'Sem permissão para deletar este arquivo' });
      }

      // Deletar do storage
      const deleted = await deleteFile(file.key);

      if (!deleted) {
        return res.status(500).json({ error: 'Erro ao deletar arquivo do storage' });
      }

      // Deletar do banco de dados
      await db.delete(files).where(eq(files.id, id));

      // Audit log
      await createAuditLog({
        usuarioId: req.user?.userId,
        acao: AuditActions.FILE_DELETE,
        entidade: 'file',
        entidadeId: id,
        descricao: `Arquivo '${file.originalName}' deletado`,
        dadosAnteriores: {
          fileName: file.fileName,
          originalName: file.originalName,
          size: file.size,
        },
        ipOrigem: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, message: 'Arquivo deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      res.status(500).json({ error: 'Erro ao deletar arquivo' });
    }
  });
}
