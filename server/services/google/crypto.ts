/**
 * Módulo de criptografia para tokens Google OAuth2
 * Usa AES-256-GCM para criptografia autenticada
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getSecretKey(): Buffer {
  const secret = process.env.GOOGLE_TOKENS_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_TOKENS_SECRET não configurado. Gere com: openssl rand -hex 32');
  }

  // Se a chave for hex, converter para Buffer
  if (secret.length === 64) {
    return Buffer.from(secret, 'hex');
  }

  // Se não, usar hash SHA-256 para garantir 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa um token usando AES-256-GCM
 * @param plaintext Token em texto plano
 * @returns String criptografada no formato iv:authTag:encrypted (hex)
 */
export function encryptToken(plaintext: string): string {
  const secretKey = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa um token criptografado
 * @param encryptedData String no formato iv:authTag:encrypted
 * @returns Token em texto plano
 */
export function decryptToken(encryptedData: string): string {
  const secretKey = getSecretKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Formato de token inválido');
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Gera uma chave secreta aleatória (para uso inicial)
 * @returns Chave de 32 bytes em formato hexadecimal
 */
export function generateSecretKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
