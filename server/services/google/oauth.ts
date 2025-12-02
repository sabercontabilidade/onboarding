/**
 * Serviço de autenticação OAuth2 com Google
 * Permite que usuários conectem suas contas Google para sincronização de calendário
 */
import { OAuth2Client } from 'google-auth-library';
import { db } from '../../db.js';
import { users, googleTokens } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { encryptToken, decryptToken } from './crypto.js';

// Escopos necessários para o Google Calendar e Gmail
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send', // Para enviar emails via Gmail
];

/**
 * Verifica se as credenciais Google estão configuradas
 */
export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Cria um cliente OAuth2
 */
export function createOAuth2Client(): OAuth2Client {
  if (!isGoogleConfigured()) {
    throw new Error('Credenciais Google não configuradas. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.');
  }

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Gera URL de autorização para o usuário
 * @param userId ID do usuário que está conectando
 * @returns URL para redirecionar o usuário
 */
export function generateAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId, // Passamos o userId no state para recuperar no callback
    prompt: 'consent', // Força exibição do consent para garantir refresh_token
  });
}

/**
 * Troca código de autorização por tokens
 * @param code Código recebido no callback
 * @returns Tokens de acesso e refresh
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiry: Date;
}> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Tokens não recebidos do Google');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
  };
}

/**
 * Salva tokens do usuário no banco de dados (criptografados)
 */
export async function saveUserTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiry: Date
): Promise<void> {
  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = encryptToken(refreshToken);

  // Verifica se já existe registro
  const existing = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Atualiza registro existente
    await db
      .update(googleTokens)
      .set({
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        expiry,
        scopes: SCOPES,
        updatedAt: new Date(),
      })
      .where(eq(googleTokens.userId, userId));
  } else {
    // Cria novo registro
    await db.insert(googleTokens).values({
      userId,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      expiry,
      scopes: SCOPES,
    });
  }

  // Atualiza flag no usuário
  await db
    .update(users)
    .set({ googleConnected: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Obtém cliente OAuth2 autenticado para um usuário
 * Renova tokens automaticamente se expirados
 */
export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client | null> {
  const [tokenRecord] = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  const oauth2Client = createOAuth2Client();

  try {
    const accessToken = decryptToken(tokenRecord.accessTokenEncrypted);
    const refreshToken = decryptToken(tokenRecord.refreshTokenEncrypted);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: tokenRecord.expiry.getTime(),
    });

    // Verifica se token expirou e renova se necessário
    if (tokenRecord.expiry < new Date()) {
      console.log(`[GOOGLE] Renovando token para usuário ${userId}`);

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        await saveUserTokens(
          userId,
          credentials.access_token,
          refreshToken, // Mantém o refresh_token original
          new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
        );
      }
    }

    return oauth2Client;
  } catch (error) {
    console.error(`[GOOGLE] Erro ao obter cliente para usuário ${userId}:`, error);
    return null;
  }
}

/**
 * Verifica se um usuário está conectado ao Google
 */
export async function isUserConnected(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ googleConnected: users.googleConnected })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.googleConnected === true;
}

/**
 * Desconecta usuário do Google (revoga tokens)
 */
export async function disconnectUser(userId: string): Promise<boolean> {
  try {
    const [tokenRecord] = await db
      .select()
      .from(googleTokens)
      .where(eq(googleTokens.userId, userId))
      .limit(1);

    if (tokenRecord) {
      // Tenta revogar token no Google
      try {
        const oauth2Client = createOAuth2Client();
        const accessToken = decryptToken(tokenRecord.accessTokenEncrypted);
        await oauth2Client.revokeToken(accessToken);
      } catch (revokeError) {
        console.warn('[GOOGLE] Erro ao revogar token (continuando desconexão):', revokeError);
      }

      // Remove tokens do banco
      await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
    }

    // Atualiza flag no usuário
    await db
      .update(users)
      .set({ googleConnected: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('[GOOGLE] Erro ao desconectar usuário:', error);
    return false;
  }
}

/**
 * Obtém informações sobre a conexão do usuário
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  scopes?: string[];
  expiry?: Date;
  lastUpdated?: Date;
}> {
  const [user] = await db
    .select({ googleConnected: users.googleConnected })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.googleConnected) {
    return { connected: false };
  }

  const [tokenRecord] = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (!tokenRecord) {
    return { connected: false };
  }

  return {
    connected: true,
    scopes: tokenRecord.scopes,
    expiry: tokenRecord.expiry,
    lastUpdated: tokenRecord.updatedAt,
  };
}
