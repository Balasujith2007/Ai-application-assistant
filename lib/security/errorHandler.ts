/**
 * Centralized Error Handling
 * Provides consistent error responses across all API routes
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT_ERROR', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(429, message, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * Handle API errors and return consistent response
 */
export function handleApiError(error: unknown): Response {
  console.error('[API Error]', error);

  // ApiError instances
  if (error instanceof ApiError) {
    const responseBody = {
      success: false,
      message: error.message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && error.details ? { details: error.details } : {}),
    };

    return new Response(JSON.stringify(responseBody), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };
    
    if (prismaError.code === 'P2002') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (prismaError.code === 'P2025') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Related record not found',
          code: 'RELATION_NOT_FOUND',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Generic error
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' ? { error: String(error) } : {}),
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandler(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
