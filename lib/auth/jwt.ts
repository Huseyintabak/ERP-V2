import { SignJWT, jwtVerify } from 'jose';

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
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'yonetici' | 'planlama' | 'depo' | 'operator',
    };
  } catch (error: any) {
    console.error('❌ JWT verify error:', error.message);
    throw new Error('Invalid or expired token');
  }
}

