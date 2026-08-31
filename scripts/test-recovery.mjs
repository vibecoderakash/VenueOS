// Automated test suite for password recovery validation
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.').min(1, 'Email is required.'),
});

async function runRecoveryTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VENUE OS PASSWORD RECOVERY VALIDATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Forgot password email validation
  const testValidEmail = forgotPasswordSchema.safeParse({ email: 'owner@royalpalace.com' });
  assert('TEST 1: Valid email accepted for password reset', testValidEmail.success);

  const testInvalidEmail = forgotPasswordSchema.safeParse({ email: 'notanemail' });
  assert('TEST 2: Invalid email rejected for password reset', !testInvalidEmail.success);

  const testEmptyEmail = forgotPasswordSchema.safeParse({ email: '' });
  assert('TEST 3: Empty email rejected for password reset', !testEmptyEmail.success);

  // 2. New password validation
  const testValidPass = resetPasswordSchema.safeParse({
    password: 'NewSecurePassword123!',
    confirmPassword: 'NewSecurePassword123!',
  });
  assert('TEST 4: Valid matching password (>= 8 chars) accepted', testValidPass.success);

  const testShortPass = resetPasswordSchema.safeParse({
    password: 'short',
    confirmPassword: 'short',
  });
  assert('TEST 5: Password with < 8 chars rejected', !testShortPass.success);

  const testMismatchPass = resetPasswordSchema.safeParse({
    password: 'NewSecurePassword123!',
    confirmPassword: 'DifferentPassword123!',
  });
  assert('TEST 6: Mismatched confirmPassword rejected', !testMismatchPass.success);

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRecoveryTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
