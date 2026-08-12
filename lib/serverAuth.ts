import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: object): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): jwt.JwtPayload | string | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(req: Request): string | null {
  let token: string | null = null;

  // 1. Try Authorization header
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Fallback to cookie if Authorization header is absent
  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:token|auth_token)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  // 3. Fallback to URL search parameter if header & cookie are absent
  if (!token && req.url) {
    try {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || url.searchParams.get('auth_token');
    } catch {
      // Ignore URL parsing errors
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (payload && typeof payload === 'object') {
    if ('sub' in payload && payload.sub) return payload.sub as string;
    if ('id' in payload && payload.id) return payload.id as string;
    if ('userId' in payload && payload.userId) return payload.userId as string;
  }

  return null;
}
