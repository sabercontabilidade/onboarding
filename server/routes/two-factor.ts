/**
 * Rotas de Autenticação em Dois Fatores (2FA)
 */
import type { Express } from 'express';
import { db } from '../db.js';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '../auth/middleware.js';
import { auditFromRequest, AuditActions } from '../audit/logger.js';
import {
  generateTwoFactorSecret,
  generateQRCodeDataURL,
  verifyTwoFactorToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  isValidTokenFormat,
  isValidBackupCodeFormat,
} from '../services/auth/two-factor.js';

export function registerTwoFactorRoutes(app: Express) {
  /**
   * GET /api/auth/2fa/status
   * Verificar status do 2FA do usuário
   */
  app.get('/api/auth/2fa/status', authenticate, async (req, res) => {
    try {
      const [user] = await db
        .select({
          twoFactorEnabled: users.twoFactorEnabled,
          hasBackupCodes: users.twoFactorBackupCodes,
        })
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        enabled: user.twoFactorEnabled,
        hasBackupCodes: !!(user.hasBackupCodes && (user.hasBackupCodes as string[]).length > 0),
        backupCodesCount: user.hasBackupCodes ? (user.hasBackupCodes as string[]).length : 0,
      });
    } catch (error) {
      console.error('Erro ao verificar status 2FA:', error);
      res.status(500).json({ error: 'Erro ao verificar status' });
    }
  });

  /**
   * POST /api/auth/2fa/setup
   * Iniciar configuração do 2FA (gerar secret e QR code)
   */
  app.post('/api/auth/2fa/setup', authenticate, async (req, res) => {
    try {
      const [user] = await db
        .select({
          email: users.email,
          twoFactorEnabled: users.twoFactorEnabled,
        })
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({
          error: '2FA já está ativado. Desative antes de configurar novamente.',
        });
      }

      // Gerar secret
      const { secret, otpauthUrl } = generateTwoFactorSecret(user.email);

      // Gerar QR Code
      const qrCodeDataUrl = await generateQRCodeDataURL(otpauthUrl);

      // Salvar secret temporário (não ativado ainda)
      await db
        .update(users)
        .set({ twoFactorSecret: secret })
        .where(eq(users.id, req.user!.userId));

      res.json({
        success: true,
        secret, // Para entrada manual
        qrCode: qrCodeDataUrl,
        message: 'Escaneie o QR code com seu aplicativo autenticador e confirme com um código.',
      });
    } catch (error) {
      console.error('Erro ao configurar 2FA:', error);
      res.status(500).json({ error: 'Erro ao configurar 2FA' });
    }
  });

  /**
   * POST /api/auth/2fa/verify-setup
   * Verificar token e ativar 2FA
   */
  app.post('/api/auth/2fa/verify-setup', authenticate, async (req, res) => {
    try {
      const { token } = req.body;

      if (!token || !isValidTokenFormat(token)) {
        return res.status(400).json({
          error: 'Código inválido. Insira os 6 dígitos do seu aplicativo autenticador.',
        });
      }

      const [user] = await db
        .select({
          twoFactorSecret: users.twoFactorSecret,
          twoFactorEnabled: users.twoFactorEnabled,
        })
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA já está ativado' });
      }

      if (!user.twoFactorSecret) {
        return res.status(400).json({
          error: 'Configuração de 2FA não iniciada. Inicie a configuração primeiro.',
        });
      }

      // Verificar token
      const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);

      if (!isValid) {
        return res.status(400).json({
          error: 'Código inválido. Verifique se o código está correto e tente novamente.',
        });
      }

      // Gerar códigos de backup
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code.replace('-', '')));

      // Ativar 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorBackupCodes: hashedBackupCodes,
        })
        .where(eq(users.id, req.user!.userId));

      // Audit log
      await auditFromRequest(req, {
        acao: 'two_factor_enabled',
        entidade: 'user',
        entidadeId: req.user!.userId,
        descricao: 'Autenticação em dois fatores ativada',
      });

      res.json({
        success: true,
        message: '2FA ativado com sucesso!',
        backupCodes, // Mostrar apenas uma vez
        warning: 'IMPORTANTE: Guarde estes códigos de backup em local seguro. Eles não serão mostrados novamente.',
      });
    } catch (error) {
      console.error('Erro ao verificar configuração 2FA:', error);
      res.status(500).json({ error: 'Erro ao verificar configuração' });
    }
  });

  /**
   * POST /api/auth/2fa/verify
   * Verificar token 2FA durante login
   */
  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { userId, token, isBackupCode } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ error: 'userId e token são obrigatórios' });
      }

      const [user] = await db
        .select({
          twoFactorSecret: users.twoFactorSecret,
          twoFactorEnabled: users.twoFactorEnabled,
          twoFactorBackupCodes: users.twoFactorBackupCodes,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ error: '2FA não configurado para este usuário' });
      }

      let isValid = false;

      if (isBackupCode) {
        // Verificar código de backup
        if (!isValidBackupCodeFormat(token)) {
          return res.status(400).json({
            error: 'Formato de código de backup inválido. Use XXXX-XXXX.',
          });
        }

        const backupCodes = (user.twoFactorBackupCodes || []) as string[];
        const { valid, usedIndex } = verifyBackupCode(token, backupCodes);

        if (valid) {
          isValid = true;
          // Remover código usado
          backupCodes.splice(usedIndex, 1);
          await db
            .update(users)
            .set({ twoFactorBackupCodes: backupCodes })
            .where(eq(users.id, userId));
        }
      } else {
        // Verificar token TOTP
        if (!isValidTokenFormat(token)) {
          return res.status(400).json({
            error: 'Código inválido. Insira os 6 dígitos do seu aplicativo.',
          });
        }

        isValid = verifyTwoFactorToken(user.twoFactorSecret, token);
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Código inválido' });
      }

      res.json({
        success: true,
        verified: true,
      });
    } catch (error) {
      console.error('Erro ao verificar 2FA:', error);
      res.status(500).json({ error: 'Erro ao verificar código' });
    }
  });

  /**
   * POST /api/auth/2fa/disable
   * Desativar 2FA
   */
  app.post('/api/auth/2fa/disable', authenticate, async (req, res) => {
    try {
      const { password, token } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Senha é obrigatória para desativar 2FA' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA não está ativado' });
      }

      // Verificar senha
      const bcrypt = await import('bcrypt');
      const isPasswordValid = await bcrypt.compare(password, user.senhaHash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // Se 2FA está ativo, precisa verificar token
      if (token) {
        const isTokenValid = verifyTwoFactorToken(user.twoFactorSecret!, token);
        if (!isTokenValid) {
          return res.status(401).json({ error: 'Código 2FA inválido' });
        }
      }

      // Desativar 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
        })
        .where(eq(users.id, req.user!.userId));

      // Audit log
      await auditFromRequest(req, {
        acao: 'two_factor_disabled',
        entidade: 'user',
        entidadeId: req.user!.userId,
        descricao: 'Autenticação em dois fatores desativada',
      });

      res.json({
        success: true,
        message: '2FA desativado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao desativar 2FA:', error);
      res.status(500).json({ error: 'Erro ao desativar 2FA' });
    }
  });

  /**
   * POST /api/auth/2fa/regenerate-backup-codes
   * Regenerar códigos de backup
   */
  app.post('/api/auth/2fa/regenerate-backup-codes', authenticate, async (req, res) => {
    try {
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          error: 'Senha e código 2FA são obrigatórios',
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ error: '2FA não está ativado' });
      }

      // Verificar senha
      const bcrypt = await import('bcrypt');
      const isPasswordValid = await bcrypt.compare(password, user.senhaHash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // Verificar token 2FA
      const isTokenValid = verifyTwoFactorToken(user.twoFactorSecret, token);
      if (!isTokenValid) {
        return res.status(401).json({ error: 'Código 2FA inválido' });
      }

      // Gerar novos códigos de backup
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code.replace('-', '')));

      // Atualizar no banco
      await db
        .update(users)
        .set({ twoFactorBackupCodes: hashedBackupCodes })
        .where(eq(users.id, req.user!.userId));

      // Audit log
      await auditFromRequest(req, {
        acao: 'backup_codes_regenerated',
        entidade: 'user',
        entidadeId: req.user!.userId,
        descricao: 'Códigos de backup regenerados',
      });

      res.json({
        success: true,
        backupCodes,
        warning: 'IMPORTANTE: Guarde estes códigos de backup em local seguro. Os códigos anteriores foram invalidados.',
      });
    } catch (error) {
      console.error('Erro ao regenerar códigos de backup:', error);
      res.status(500).json({ error: 'Erro ao regenerar códigos' });
    }
  });
}
