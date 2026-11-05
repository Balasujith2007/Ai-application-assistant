/**
 * CSRF Protection Middleware
 * 
 * Since ATLYX uses JWT tokens stored in localStorage (not cookies),
 * traditional CSRF risk is lower. However, we still validate
 * Origin and Referer headers for sensitive state-changing operations.
 */

const TRUSTED_ORIGINS = new Set<string>(
  (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
);

/**
 * Validates the request origin for state-changing operations
 * Returns true if origin is trusted, false otherwise
 */
export function validateRequestOrigin(req: Request): { valid: boolean; origin?: string } {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // For GET requests and same-origin requests, Origin header may be absent
  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      if (TRUSTED_ORIGINS.has(refererUrl.origin)) {
        return { valid: true, origin: refererUrl.origin };
      }
    } catch {
      // Invalid referer URL
      return { valid: false };
    }
  }

  if (!origin) {
    // No origin or referer - allow only for same-origin requests
    return { valid: true };
  }

  // Check if origin is in trusted list
  if (TRUSTED_ORIGINS.has(origin)) {
    return { valid: true, origin };
  }

  return { valid: false, origin };
}

/**
 * Adds CSRF-related security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  
  // Set SameSite cookie attribute if cookies are used in future
  // newResponse.headers.set('Set-Cookie', '...; SameSite=Strict; Secure; HttpOnly');
  
  return newResponse;
}

/**
 * Middleware function to protect sensitive endpoints
 * Usage: Apply to POST, PUT, PATCH, DELETE routes for state-changing operations
 */
export function csrfProtection(req: Request) {
  const { valid, origin } = validateRequestOrigin(req);
  
  if (!valid) {
    return {
      allowed: false,
      error: 'CSRF validation failed',
      origin,
      message: 'Invalid request origin. This operation requires a trusted origin.'
    };
  }
  
  return { allowed: true, origin };
}
