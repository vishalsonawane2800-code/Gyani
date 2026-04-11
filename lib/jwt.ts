import { jwtVerify, SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-this')

export interface JWTPayload {
  adminId: string
  username: string
  iat?: number
  exp?: number
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '15m'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload as JWTPayload
  } catch (error) {
    console.error('[jwt] Verification failed:', error)
    return null
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}
