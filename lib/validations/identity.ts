/**
 * Backend Identity Validation & Safe Error Utilities
 * Venue OS - Single Account per Normalized Email Enforcer
 */

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
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to manage team accounts.',
  INVALID_ROLE_SELECTION: 'You do not have authorization to assign the requested role.',
  OWNER_ALREADY_EXISTS: 'A Venue Owner account has already been registered for this venue.',
  OWNER_DEACTIVATION_FORBIDDEN: 'The Venue Owner account cannot be deactivated.',
  MEMBER_NOT_FOUND: 'The specified team member could not be found.',
  DATABASE_UNAVAILABLE: 'Authentication service is temporarily unavailable. Please try again shortly.',
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
