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
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (payload && typeof payload === 'object') {
    if ('sub' in payload && payload.sub) return payload.sub as string;
    if ('id' in payload && payload.id) return payload.id as string;
    if ('userId' in payload && payload.userId) return payload.userId as string;
  }

  return null;
}
