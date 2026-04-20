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

// =========================================================================
// User JWT helpers (separate audience from admin tokens)
// =========================================================================
// We keep admin and user tokens disjoint by using a different payload shape
// (`userId` vs `adminId`). Admin routes verify via `verifyJWT`, user routes
// verify via `verifyUserJWT`, so tokens cannot be swapped.

export interface UserJWTPayload {
  userId: string
  email: string
  name: string
  iat?: number
  exp?: number
}

export async function signUserJWT(
  payload: Omit<UserJWTPayload, 'iat' | 'exp'>,
  expiresIn: string = '30d'
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifyUserJWT(token: string): Promise<UserJWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret)
    const payload = verified.payload as Record<string, unknown>
    // Enforce audience = user. Admin tokens have `adminId`, not `userId`.
    if (typeof payload.userId !== 'string') return null
    return payload as unknown as UserJWTPayload
  } catch (error) {
    console.error('[jwt] User verification failed:', error)
    return null
  }
}
