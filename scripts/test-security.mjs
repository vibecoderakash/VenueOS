// Automated Security & RLS Hardening Verification Test Suite
async function detectOrigin() {
  const ports = [3000, 3001];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/api/auth/setup-status`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.status === 200) {
        return `http://localhost:${port}`;
      }
    } catch {
      // continue
    }
  }
  return 'http://localhost:3000';
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🔒 RUNNING VENUE OS SECURITY, RLS & ERROR CODE HARDENING TESTS');
  console.log('================================================================\n');

  const origin = await detectOrigin();
  console.log(`Targeting Server: ${origin}\n`);

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

  // TEST 1: Setup-status endpoint should NEVER leak profile PII (email, phone, names)
  try {
    const res = await fetch(`${origin}/api/auth/setup-status`);
    const data = await res.json();
    const isCleanResponse = 
      typeof data.ownerExists === 'boolean' &&
      !('email' in data) &&
      !('profiles' in data) &&
      !('phone' in data) &&
      !('name' in data);

    assert(
      'TEST 1: Setup-status endpoint returns boolean only and does NOT leak PII',
      res.status === 200 && isCleanResponse,
      JSON.stringify(data)
    );
  } catch (err) {
    assert('TEST 1: Setup-status endpoint check', false, err.message);
  }

  // TEST 2: Setup API with invalid / missing payload returns 400 + VALIDATION_ERROR
  try {
    const res = await fetch(`${origin}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(
      'TEST 2: Setup API rejects empty payload with 400 + VALIDATION_ERROR',
      res.status === 400 && data.code === 'VALIDATION_ERROR',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 2: Setup API validation check', false, err.message);
  }

  // TEST 3: Setup API with short password returns 400 + VALIDATION_ERROR
  try {
    const res = await fetch(`${origin}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Owner',
        email: 'owner@testvenue.com',
        phone: '9876543210',
        venue_name: 'Test Grand Banquet',
        password: '123', // too short
      }),
    });
    const data = await res.json();
    assert(
      'TEST 3: Setup API rejects short password with 400 + VALIDATION_ERROR',
      res.status === 400 && data.code === 'VALIDATION_ERROR',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 3: Setup API password check', false, err.message);
  }

  // TEST 4: Setup API with invalid email format returns 400 + VALIDATION_ERROR
  try {
    const res = await fetch(`${origin}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Owner',
        email: 'invalid-email-address',
        phone: '9876543210',
        venue_name: 'Test Grand Banquet',
        password: 'SecurePassword123!',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 4: Setup API rejects invalid email with 400 + VALIDATION_ERROR',
      res.status === 400 && data.code === 'VALIDATION_ERROR',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 4: Setup API email check', false, err.message);
  }

  // TEST 5: Leads POST API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Anonymous Lead',
        phone: '9876543210',
        source: 'Meta',
        event_type: 'Wedding',
        event_date_status: 'fixed',
        event_date: '2026-12-28',
        guest_count_status: 'fixed',
        guest_count: 200,
      }),
    });
    const data = await res.json();
    assert(
      'TEST 5: Leads POST API without session is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 5: Leads API auth check', false, err.message);
  }

  // TEST 6: Lead assign API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/leads/test-lead-id/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: '00000000-0000-0000-0000-000000000000' }),
    });
    const data = await res.json();
    assert(
      'TEST 6: Lead assign API without auth is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 6: Lead assign API check', false, err.message);
  }

  // TEST 7: Organization DELETE API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/organization/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'Test Venue', organizationName: 'Test Venue' }),
    });
    const data = await res.json();
    assert(
      'TEST 7: Org DELETE API without authentication is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 7: Org delete API check', false, err.message);
  }

  // TEST 8: Team List API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/team/list`);
    const data = await res.json();
    assert(
      'TEST 8: Team list API without authentication is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 8: Team list API check', false, err.message);
  }

  // TEST 9: Team Create Staff API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/team/create-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Hacker Staff',
        email: 'hacker@example.com',
        role: 'admin',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 9: Team create-staff API without authentication is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 9: Team create-staff API check', false, err.message);
  }

  // TEST 10: Team Delete Staff API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/team/delete-staff`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'some-member-id' }),
    });
    const data = await res.json();
    assert(
      'TEST 10: Team delete-staff API without authentication is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 10: Team delete-staff API check', false, err.message);
  }

  // TEST 11: Team Update Staff API without authentication rejects with 401 + AUTH_UNAUTHORIZED
  try {
    const res = await fetch(`${origin}/api/team/update-staff`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'some-member-id', role: 'owner' }),
    });
    const data = await res.json();
    assert(
      'TEST 11: Team update-staff API without authentication is rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED',
      `status: ${res.status}, code: ${data.code}`
    );
  } catch (err) {
    assert('TEST 11: Team update-staff API check', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 SECURITY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Security test suite failed with error:', err);
  process.exit(1);
});
