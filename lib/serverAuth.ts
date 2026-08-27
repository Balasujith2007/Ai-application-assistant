import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: object): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
}

/** Short-lived token for the Apply Agent only. Never embed website 7d JWTs in page messaging. */
export function signExtensionToken(payload: { sub: string; email: string; role?: string }): string {
  return jwt.sign(
    { ...payload, aud: 'careerai-extension', typ: 'ext' },
    JWT_SECRET,
    { expiresIn: '2h' },
  );
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

export async function checkAuthAndPermission(req: Request, resource: string, action: string) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { allowed: false, status: 401, message: 'Unauthorized' };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, status: 401, message: 'Unauthorized' };

  // Deactivated users cannot perform any actions
  if (user.active === false) {
    return { allowed: false, status: 403, message: 'User account is deactivated' };
  }

  // Super Admin bypasses all checks
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, user };
  }

  // 1. Role validation - check if role is globally mapped to this feature / permission
  const permission = await prisma.rolePermission.findUnique({
    where: {
      role_resource_action: {
        role: user.role,
        resource,
        action,
      }
    }
  });

  if (!permission || !permission.allowed) {
    return { allowed: false, status: 403, message: 'Forbidden' };
  }

  // 2. Feature validation - check if the corresponding feature is globally enabled
  const featureMapping: Record<string, string> = {
    'Dashboard': 'opportunities',
    'Opportunities': 'opportunities',
    'My Applications': 'opportunities',
    'My Tasks': 'opportunities',
    'My Resume': 'resume-management',
    'My Progress': 'career-readiness',
    'Reports': 'reports',
    'Forms': 'form-builder',
    'Notifications': 'notifications',
    'AI Resume Analysis': 'ai-resume-analysis',
    'Skill Analysis': 'skill-analysis',
    'Career Readiness': 'career-readiness',
    'Auto-Fill Agent': 'auto-fill-agent',
  };

  const featureName = featureMapping[resource];
  if (featureName) {
    const feature = await prisma.appFeature.findUnique({ where: { name: featureName } });
    if (feature) {
      if (!feature.enabled) {
        return { allowed: false, status: 403, message: `Feature ${featureName} is globally disabled` };
      }
      if (!feature.roles.includes(user.role)) {
        return { allowed: false, status: 403, message: `Feature ${featureName} is not available for role ${user.role}` };
      }
    }
  }

  return { allowed: true, user };
}
