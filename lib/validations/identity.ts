import { NextResponse } from 'next/server';

/**
 * Backend Identity Validation, Standardized Error Codes & Safe Error Utilities
 * Venue OS - Single Account per Normalized Email & Multi-Tenant Security Enforcer
 */

/**
 * Standardized API Error Codes for consistent client handling
 */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  FORBIDDEN_INSUFFICIENT_ROLE: 'FORBIDDEN_INSUFFICIENT_ROLE',
  FORBIDDEN_DEACTIVATED: 'FORBIDDEN_DEACTIVATED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT_EMAIL_EXISTS: 'CONFLICT_EMAIL_EXISTS',
  CONFLICT_OWNER_EXISTS: 'CONFLICT_OWNER_EXISTS',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * Normalizes an email address according to the strict rule:
 * ONE EMAIL ADDRESS = ONE VENUE OS USER ACCOUNT.
 * Trims leading/trailing whitespace and lowercases all characters.
 */
export function normalizeEmail(email: unknown): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

/**
 * Validates whether an email string matches a standard valid email syntax.
 */
export function isValidEmail(email: unknown): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length < 5 || normalized.length > 254) return false;
  
  // RFC 5322 standard compliant email regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(normalized);
}

/**
 * Safe, user-friendly error messages that never leak internal
 * database details, Postgres error codes, column names, or stack traces.
 */
export const SAFE_IDENTITY_ERRORS = {
  EMAIL_ALREADY_EXISTS: 'An account with this email address already exists. Please sign in or contact your administrator.',
  INVALID_EMAIL_FORMAT: 'Please provide a valid work email address.',
  INVALID_NAME: 'Please enter a valid full name (minimum 2 characters).',
  UNAUTHORIZED: 'You are not authorized to perform this operation.',
  FORBIDDEN_DEACTIVATED: 'Your account has been deactivated. Please contact your venue administrator.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this operation.',
  INVALID_ROLE_SELECTION: 'You do not have authorization to assign the requested role.',
  OWNER_ALREADY_EXISTS: 'A Venue Owner account has already been registered for this venue.',
  OWNER_DEACTIVATION_FORBIDDEN: 'The Venue Owner account cannot be deactivated.',
  MEMBER_NOT_FOUND: 'The specified team member could not be found.',
  DATABASE_UNAVAILABLE: 'Database service is temporarily unavailable. Please try again shortly.',
  GENERIC_ERROR: 'An error occurred while processing your request. Please try again.',
} as const;

/**
 * Inspects any backend error or exception and returns a safe, user-friendly string.
 * Strips raw PostgreSQL error messages, duplicate key constraints, and auth exceptions.
 */
export function sanitizeErrorMessage(err: unknown, fallback: string = SAFE_IDENTITY_ERRORS.GENERIC_ERROR): string {
  if (!err) return fallback;

  const rawMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  // Unique constraint violation in Postgres (code 23505 or duplicate key text)
  if (
    rawMsg.includes('23505') ||
    rawMsg.includes('duplicate key') ||
    rawMsg.includes('idx_profiles_lower_email') ||
    rawMsg.includes('unique constraint') ||
    rawMsg.includes('already registered') ||
    rawMsg.includes('user already exists') ||
    rawMsg.includes('email already in use') ||
    rawMsg.includes('already exists')
  ) {
    return SAFE_IDENTITY_ERRORS.EMAIL_ALREADY_EXISTS;
  }

  // Owner limit constraint
  if (rawMsg.includes('only one owner account is permitted') || rawMsg.includes('owner already exists')) {
    return SAFE_IDENTITY_ERRORS.OWNER_ALREADY_EXISTS;
  }

  // Deactivated account
  if (rawMsg.includes('deactivated') || rawMsg.includes('account is deactivated')) {
    return SAFE_IDENTITY_ERRORS.FORBIDDEN_DEACTIVATED;
  }

  // Permission / role violations
  if (rawMsg.includes('permission') || rawMsg.includes('unauthorized') || rawMsg.includes('forbidden')) {
    return SAFE_IDENTITY_ERRORS.INSUFFICIENT_PERMISSIONS;
  }

  // Invalid credentials
  if (rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid grant')) {
    return 'Invalid email or password.';
  }

  return fallback;
}

/**
 * Maps an error or message to a standardized API error code.
 */
export function resolveApiErrorCode(err: unknown): ApiErrorCode {
  if (!err) return API_ERROR_CODES.INTERNAL_ERROR;
  const rawMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  if (rawMsg.includes('23505') || rawMsg.includes('duplicate key') || rawMsg.includes('already exists')) {
    if (rawMsg.includes('owner')) return API_ERROR_CODES.CONFLICT_OWNER_EXISTS;
    return API_ERROR_CODES.CONFLICT_EMAIL_EXISTS;
  }
  if (rawMsg.includes('unauthorized') || rawMsg.includes('sign in') || rawMsg.includes('session was not found')) {
    return API_ERROR_CODES.UNAUTHORIZED;
  }
  if (rawMsg.includes('deactivated')) {
    return API_ERROR_CODES.FORBIDDEN_DEACTIVATED;
  }
  if (rawMsg.includes('permission') || rawMsg.includes('forbidden') || rawMsg.includes('only the') || rawMsg.includes('manager')) {
    return API_ERROR_CODES.FORBIDDEN_INSUFFICIENT_ROLE;
  }
  if (rawMsg.includes('not found')) {
    return API_ERROR_CODES.RESOURCE_NOT_FOUND;
  }
  if (rawMsg.includes('validation') || rawMsg.includes('invalid') || rawMsg.includes('required')) {
    return API_ERROR_CODES.VALIDATION_ERROR;
  }
  if (rawMsg.includes('database') || rawMsg.includes('unconfigured') || rawMsg.includes('unavailable')) {
    return API_ERROR_CODES.DATABASE_UNAVAILABLE;
  }

  return API_ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Standardized Safe JSON Error Response builder
 */
export function createSafeErrorResponse(
  error: string,
  code: ApiErrorCode = API_ERROR_CODES.INTERNAL_ERROR,
  status: number = 500,
  details?: unknown
) {
  return NextResponse.json(
    {
      error,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  );
}
