import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check against configured allowed origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(o => o.trim());
  
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Extension origins with ID whitelist
  if (origin.startsWith('chrome-extension://') || 
      origin.startsWith('moz-extension://') ||
      origin.startsWith('safari-web-extension://')) {
    const extensionId = origin.replace(/^(chrome-extension|moz-extension|safari-web-extension):\/\//, '');
    const allowedExtensionIds = (process.env.ALLOWED_EXTENSION_IDS || '').split(',').map(id => id.trim());
    
    // If ALLOWED_EXTENSION_IDS is configured, enforce whitelist
    if (allowedExtensionIds.length > 0 && allowedExtensionIds[0] !== '') {
      return allowedExtensionIds.includes(extensionId);
    }
    
    // If no whitelist configured, allow all extensions (dev mode only)
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Production: reject if no whitelist configured
    return false;
  }
  
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !pathname.startsWith('/api/extension') &&
    !pathname.startsWith('/api/agent') &&
    !pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const allowOrigin = isAllowedOrigin(origin) ? origin! : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export const config = {
  matcher: ['/api/extension/:path*', '/api/agent/:path*', '/api/auth/:path*'],
};
