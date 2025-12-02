/**
 * Serviço de Autenticação em Dois Fatores (2FA/TOTP)
 */
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = process.env.APP_NAME || 'SABER Onboarding';

/**
 * Gerar secret para 2FA
 */
export function generateTwoFactorSecret(userEmail: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    issuer: APP_NAME,
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!,
  };
}

/**
 * Gerar QR Code como Data URL
 */
export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 200,
    margin: 2,
  });
}

/**
 * Verificar token TOTP
 */
export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Permite 2 janelas de tempo (60 segundos antes/depois)
  });
}

/**
 * Gerar códigos de backup
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Gerar código de 8 caracteres alfanumérico
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Formatar como XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Hash código de backup para armazenamento seguro
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verificar código de backup
 */
export function verifyBackupCode(inputCode: string, hashedCodes: string[]): {
  valid: boolean;
  usedIndex: number;
} {
  const normalizedInput = inputCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const inputHash = hashBackupCode(normalizedInput);

  const index = hashedCodes.findIndex(hash => hash === inputHash);

  return {
    valid: index !== -1,
    usedIndex: index,
  };
}

/**
 * Validar formato de token TOTP (6 dígitos)
 */
export function isValidTokenFormat(token: string): boolean {
  return /^\d{6}$/.test(token);
}

/**
 * Validar formato de código de backup (XXXX-XXXX)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
}
