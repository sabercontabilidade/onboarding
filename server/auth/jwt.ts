import jwt from 'jsonwebtoken';
import type { User, UserWithoutPassword } from '@shared/schema';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dias

export interface TokenPayload {
  userId: string;
  email: string;
  funcao?: string;
  nivelPermissao?: string;
}

/**
 * Gerar Access Token (curta duração)
 */
export function generateAccessToken(user: UserWithoutPassword): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    funcao: user.funcao || undefined,
    nivelPermissao: user.nivelPermissao || undefined,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'onboarding-api',
    audience: 'onboarding-client',
  });
}

/**
 * Gerar Refresh Token (longa duração)
 */
export function generateRefreshToken(user: UserWithoutPassword): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'onboarding-api',
    audience: 'onboarding-client',
  });
}

/**
 * Verificar e decodificar token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'onboarding-api',
      audience: 'onboarding-client',
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('TOKEN_INVALID');
    }
    throw new Error('TOKEN_VERIFICATION_FAILED');
  }
}

/**
 * Extrair token do header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Gerar par de tokens (access + refresh)
 */
export function generateTokenPair(user: UserWithoutPassword) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}
