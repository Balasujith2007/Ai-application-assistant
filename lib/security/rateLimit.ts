/**
 * Rate Limiting Middleware
 * 
 * Implements in-memory rate limiting for API endpoints.
 * For production with multiple serverless instances, Redis should be used.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 60000);
}

/**
 * Check if request is within rate limit
 * @param identifier - Unique identifier (IP address or user ID)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Within window
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Extract client IP address from request
 */
export function getClientIp(req: Request): string {
  // Try various headers for IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a hash of the request if no IP available
  return 'unknown-' + Date.now();
}

/**
 * Rate limit configuration from environment
 */
export const RATE_LIMITS = {
  auth: {
    limit: parseInt(process.env.RATE_LIMIT_AUTH_PER_MINUTE || '5', 10),
    windowMs: 60 * 1000, // 1 minute
  },
  api: {
    limit: parseInt(process.env.RATE_LIMIT_API_PER_MINUTE || '100', 10),
    windowMs: 60 * 1000, // 1 minute
  },
  sensitive: {
    limit: parseInt(process.env.RATE_LIMIT_SENSITIVE_PER_SECOND || '1', 10),
    windowMs: 1000, // 1 second
  },
};

/**
 * Middleware function to apply rate limiting
 * @param req - Request object
 * @param limitType - Type of rate limit to apply ('auth', 'api', 'sensitive')
 * @param userId - Optional user ID for user-based limiting
 */
export function applyRateLimit(
  req: Request,
  limitType: 'auth' | 'api' | 'sensitive',
  userId?: string
): { allowed: boolean; remaining: number; resetTime: number; error?: string } {
  const config = RATE_LIMITS[limitType];
  const identifier = userId || getClientIp(req);
  
  const result = checkRateLimit(identifier, config.limit, config.windowMs);
  
  if (!result.allowed) {
    return {
      ...result,
      error: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.windowMs / 1000} seconds.`,
    };
  }
  
  return result;
}
