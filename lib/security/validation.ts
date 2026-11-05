/**
 * Input Validation Utilities
 * Provides common validation functions for API endpoints
 */

export function validateEmail(email: string): { valid: boolean; error: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'Email too long (max 255 characters)' };
  }

  return { valid: true, error: '' };
}

export function validatePassword(password: string): { valid: boolean; error: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password too long (max 128 characters)' };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { valid: true, error: '' };
}

export function validateString(value: unknown, fieldName: string, min = 1, max = 255): { valid: boolean; error: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (value.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }

  if (value.length > max) {
    return { valid: false, error: `${fieldName} must be at most ${max} characters` };
  }

  return { valid: true, error: '' };
}

export function validateId(id: unknown, fieldName: string = 'ID'): { valid: boolean; error: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Check if it's a valid CUID or similar ID format
  const idRegex = /^[a-z0-9]{20,}$/i;
  if (!idRegex.test(id)) {
    return { valid: false, error: `Invalid ${fieldName} format` };
  }

  return { valid: true, error: '' };
}

export function validateEnum<T extends string>(value: unknown, allowedValues: readonly T[], fieldName: string): { valid: boolean; error: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!allowedValues.includes(value as T)) {
    return { valid: false, error: `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}` };
  }

  return { valid: true, error: '' };
}

export function validatePayloadSize(body: any, maxSizeKB = 100): { valid: boolean; error: string } {
  const sizeInBytes = JSON.stringify(body).length;
  const maxSizeBytes = maxSizeKB * 1024;

  if (sizeInBytes > maxSizeBytes) {
    return { valid: false, error: `Request payload too large (max ${maxSizeKB}KB)` };
  }

  return { valid: true, error: '' };
}

export function sanitizeString(value: string): string {
  // Remove potentially dangerous characters
  return value.trim().slice(0, 1000);
}
