// Comprehensive End-to-End (E2E) Test Suite for VenueOS
// Tests security boundaries, setup validation, single-owner isolation, staff invitation, and multi-tenant protections.

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runE2ETests() {
  console.log('================================================================');
  console.log('🛡️  RUNNING VENUE OS END-TO-END (E2E) SECURITY & WORKFLOW TESTS');
  console.log('================================================================\n');
  console.log(`Target Server: ${BASE_URL}\n`);

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

  // -------------------------------------------------------------
  // 1. SETUP ROUTE VALIDATIONS & GUARDS
  // -------------------------------------------------------------
  console.log('--- 1. Setup Status & Validation Suite ---');

  // Test 1.1: Setup status API security
  try {
    const res = await fetch(`${BASE_URL}/api/auth/setup-status`);
    const data = await res.json();
    assert(
      'TEST 1.1: Setup-status endpoint returns boolean without leaking sensitive data',
      res.status === 200 && typeof data.ownerExists === 'boolean' && !data.user && !data.token
    );
  } catch (err) {
    assert('TEST 1.1: Setup-status endpoint', false, err.message);
  }

  // Test 1.2: Empty setup payload rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(
      'TEST 1.2: Empty setup payload rejected with 400 + VALIDATION_ERROR',
      res.status === 400 && data.code === 'VALIDATION_ERROR'
    );
  } catch (err) {
    assert('TEST 1.2: Empty setup payload', false, err.message);
  }

  // Test 1.3: Short password rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Owner',
        email: 'testowner@venueos.local',
        password: 'short',
        venue_name: 'Test Banquet Hall',
        phone: '9876543210',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 1.3: Setup payload with <8 char password rejected with 400',
      res.status === 400 && data.code === 'VALIDATION_ERROR'
    );
  } catch (err) {
    assert('TEST 1.3: Short password', false, err.message);
  }

  // Test 1.4: Invalid email format rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Owner',
        email: 'not-an-email',
        password: 'SecurePassword123!',
        venue_name: 'Test Banquet Hall',
        phone: '9876543210',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 1.4: Setup payload with invalid email rejected with 400',
      res.status === 400 && data.code === 'VALIDATION_ERROR'
    );
  } catch (err) {
    assert('TEST 1.4: Invalid email format', false, err.message);
  }

  // Test 1.5: Missing venue name rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Owner',
        email: 'testowner@venueos.local',
        password: 'SecurePassword123!',
        venue_name: '   ',
        phone: '9876543210',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 1.5: Setup payload with empty venue name rejected with 400',
      res.status === 400 && data.code === 'VALIDATION_ERROR'
    );
  } catch (err) {
    assert('TEST 1.5: Missing venue name', false, err.message);
  }

  // -------------------------------------------------------------
  // 2. STAFF INVITATION & DIRECT CREATION API SECURITY
  // -------------------------------------------------------------
  console.log('\n--- 2. Staff Invitation & Team Security Suite ---');

  // Test 2.1: Staff invite without authentication rejected
  try {
    const res = await fetch(`${BASE_URL}/api/team/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'New Staff',
        email: 'staff@venueos.local',
        role: 'staff',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 2.1: POST /api/team/invite without session rejected with 401 + UNAUTHORIZED',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 2.1: Staff invite unauthenticated', false, err.message);
  }

  // Test 2.2: Staff direct creation without authentication rejected
  try {
    const res = await fetch(`${BASE_URL}/api/team/create-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'New Staff',
        email: 'staff@venueos.local',
        role: 'staff',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 2.2: POST /api/team/create-staff without session rejected with 401 + UNAUTHORIZED',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 2.2: Staff direct create unauthenticated', false, err.message);
  }

  // Test 2.3: Team member listing without authentication rejected
  try {
    const res = await fetch(`${BASE_URL}/api/team/list`);
    const data = await res.json();
    assert(
      'TEST 2.3: GET /api/team/list without session rejected with 401',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 2.3: Team list unauthenticated', false, err.message);
  }

  // Test 2.4: Team member deletion without authentication rejected
  try {
    const res = await fetch(`${BASE_URL}/api/team/delete-staff`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: '00000000-0000-0000-0000-000000000000' }),
    });
    const data = await res.json();
    assert(
      'TEST 2.4: DELETE /api/team/delete-staff without session rejected with 401',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 2.4: Staff delete unauthenticated', false, err.message);
  }

  // Test 2.5: Team member update without authentication rejected
  try {
    const res = await fetch(`${BASE_URL}/api/team/update-staff`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: '00000000-0000-0000-0000-000000000000',
        full_name: 'Updated Name',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 2.5: PATCH /api/team/update-staff without session rejected with 401',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 2.5: Staff update unauthenticated', false, err.message);
  }

  // -------------------------------------------------------------
  // 3. LEADS MUTATION & REASSIGNMENT PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- 3. Leads Security & Mutation Suite ---');

  // Test 3.1: Leads creation without session rejected
  try {
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Test Client',
        phone: '9876543210',
        source: 'Meta',
        event_type: 'Wedding',
        event_date_status: 'not_fixed',
        guest_count_status: 'not_fixed',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 3.1: POST /api/leads without session rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED'),
      `status: ${res.status}, code: ${data.code}, error: ${data.error}`
    );
  } catch (err) {
    assert('TEST 3.1: Leads create unauthenticated', false, err.message);
  }

  // Test 3.2: Lead assignment without session rejected
  try {
    const res = await fetch(`${BASE_URL}/api/leads/00000000-0000-0000-0000-000000000000/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: '00000000-0000-0000-0000-000000000000' }),
    });
    const data = await res.json();
    assert(
      'TEST 3.2: POST /api/leads/:id/assign without session rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED'
    );
  } catch (err) {
    assert('TEST 3.2: Lead assign unauthenticated', false, err.message);
  }

  // -------------------------------------------------------------
  // 4. DIAGNOSTICS & DANGER ZONE PROTECTION
  // -------------------------------------------------------------
  console.log('\n--- 4. Diagnostics & Danger Zone Suite ---');

  // Test 4.1: Diagnostics route without session rejected
  try {
    const res = await fetch(`${BASE_URL}/api/health/diagnostics`);
    const data = await res.json();
    assert(
      'TEST 4.1: GET /api/health/diagnostics without session rejected with 401',
      res.status === 401 && (data.code === 'AUTH_UNAUTHORIZED' || data.code === 'UNAUTHORIZED')
    );
  } catch (err) {
    assert('TEST 4.1: Diagnostics unauthenticated', false, err.message);
  }

  // Test 4.2: Danger zone org deletion without session rejected
  try {
    const res = await fetch(`${BASE_URL}/api/organization/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmation: 'Test Venue',
        organizationName: 'Test Venue',
      }),
    });
    const data = await res.json();
    assert(
      'TEST 4.2: DELETE /api/organization/delete without session rejected with 401 + AUTH_UNAUTHORIZED',
      res.status === 401 && data.code === 'AUTH_UNAUTHORIZED'
    );
  } catch (err) {
    assert('TEST 4.2: Org delete unauthenticated', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 E2E SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('E2E test error:', err);
  process.exit(1);
});
