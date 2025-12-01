import { SignJWT, jwtVerify } from 'jose';
import { logger } from '@/lib/utils/logger';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'yonetici' | 'planlama' | 'depo' | 'operator';
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = (payload.userId || payload.user_id || payload.id || payload.sub) as string | undefined;
    const role = (payload.role || payload.user_role) as ('yonetici' | 'planlama' | 'depo' | 'operator') | undefined;
    const email = (payload.email || payload.user_email || '') as string;

    if (!userId || !role) {
      throw new Error('Missing user information in token');
    }

    return {
      userId,
      email,
      role,
    };
  } catch (error: any) {
    logger.error('❌ JWT verify error:', error.message);
    throw new Error('Invalid or expired token');
  }
}

