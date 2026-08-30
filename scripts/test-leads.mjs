// Comprehensive test suite covering PRD Tests 1 to 14
import { createLeadSchema, updateLeadDetailsSchema } from '../lib/validations/lead.ts';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VENUE OS BANQUET INQUIRY FORM VALIDATION TESTS');
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

  // Base valid lead template
  const validBase = {
    customer_name: 'Test Customer',
    phone: '9876543210',
    source: 'Meta',
    event_type: 'Wedding',
    event_date_status: 'fixed',
    event_date: '2026-12-28',
    guest_count_status: 'fixed',
    guest_count: 350,
  };

  // TEST 1: Submit with Event Type empty -> Rejected
  const test1 = createLeadSchema.safeParse({ ...validBase, event_type: '' });
  assert('TEST 1: Submit with Event Type empty is rejected', !test1.success);

  // TEST 2: Submit with Event Date neither selected nor marked Not Fixed -> Rejected
  const test2 = createLeadSchema.safeParse({ ...validBase, event_date_status: undefined, event_date: undefined });
  assert('TEST 2: Submit with Event Date status missing is rejected', !test2.success);

  // TEST 3: Submit with Event Date = Not Fixed -> Lead created successfully (event_date = null, event_date_status = not_fixed)
  const test3 = createLeadSchema.safeParse({
    ...validBase,
    event_date_status: 'not_fixed',
    event_date: null,
  });
  assert('TEST 3: Submit with Event Date = Not Fixed is accepted', test3.success);

  // TEST 4: Submit with Event Date fixed but no date -> Rejected
  const test4 = createLeadSchema.safeParse({
    ...validBase,
    event_date_status: 'fixed',
    event_date: null,
  });
  const test4b = createLeadSchema.safeParse({
    ...validBase,
    event_date_status: 'fixed',
    event_date: '',
  });
  assert('TEST 4: Submit with Event Date fixed but null/empty date is rejected', !test4.success && !test4b.success);

  // TEST 5: Submit with Guest Count neither entered nor marked Not Fixed -> Rejected
  const test5 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: undefined,
    guest_count: undefined,
  });
  assert('TEST 5: Submit with Guest Count status missing is rejected', !test5.success);

  // TEST 6: Submit Guest Count = Not Fixed -> Lead created successfully (guest_count = null, guest_count_status = not_fixed)
  const test6 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: 'not_fixed',
    guest_count: null,
  });
  assert('TEST 6: Submit Guest Count = Not Fixed is accepted', test6.success);

  // TEST 7: Submit Guest Count = 350 -> Lead created successfully
  const test7 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: 'fixed',
    guest_count: 350,
  });
  assert('TEST 7: Submit Guest Count = 350 is accepted', test7.success);

  // TEST 8: Submit Guest Count = 0 -> Rejected
  const test8 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: 'fixed',
    guest_count: 0,
  });
  assert('TEST 8: Submit Guest Count = 0 is rejected', !test8.success);

  // TEST 9: Submit Guest Count = -50 -> Rejected
  const test9 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: 'fixed',
    guest_count: -50,
  });
  assert('TEST 9: Submit Guest Count = -50 is rejected', !test9.success);

  // TEST 10: Submit Event Date = Not Fixed but send a real date through manipulated request -> Rejected
  const test10 = createLeadSchema.safeParse({
    ...validBase,
    event_date_status: 'not_fixed',
    event_date: '2026-12-28',
  });
  assert('TEST 10: Manipulated request (event_date_status="not_fixed" + real date) is rejected', !test10.success);

  // TEST 11: Submit Guest Count = Not Fixed but send 500 through manipulated request -> Rejected
  const test11 = createLeadSchema.safeParse({
    ...validBase,
    guest_count_status: 'not_fixed',
    guest_count: 500,
  });
  assert('TEST 11: Manipulated request (guest_count_status="not_fixed" + guest_count=500) is rejected', !test11.success);

  // TEST 12: Create a lead with: Wedding, Not Fixed date, Not Fixed guest count -> Successfully created
  const test12 = createLeadSchema.safeParse({
    ...validBase,
    event_type: 'Wedding',
    event_date_status: 'not_fixed',
    event_date: null,
    guest_count_status: 'not_fixed',
    guest_count: null,
  });
  assert('TEST 12: Lead with Wedding + Not Fixed date + Not Fixed guest count is accepted', test12.success);

  // TEST 13: Edit existing lead: Fixed Date -> Not Fixed -> Valid edit schema accepted
  const test13 = updateLeadDetailsSchema.safeParse({
    event_type: 'Reception',
    event_date_status: 'not_fixed',
    event_date: null,
    guest_count_status: 'fixed',
    guest_count: 250,
    budget: 500000,
    requirement: 'Updated requirements',
  });
  assert('TEST 13: Edit lead Fixed Date -> Not Fixed clears date and is accepted', test13.success);

  // TEST 14: Edit: Not Fixed -> Fixed without valid date is rejected
  const test14 = updateLeadDetailsSchema.safeParse({
    event_type: 'Reception',
    event_date_status: 'fixed',
    event_date: '',
    guest_count_status: 'fixed',
    guest_count: 250,
    budget: 500000,
  });
  assert('TEST 14: Edit lead Not Fixed -> Fixed requires valid date (empty date rejected)', !test14.success);

  // TEST API ENDPOINT: Direct HTTP test against /api/leads
  console.log('\n--- Testing API Route directly ---');
  try {
    const resValid = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'API Test Lead',
        phone: '9811223344',
        event_type: 'Birthday',
        event_date_status: 'not_fixed',
        event_date: null,
        guest_count_status: 'fixed',
        guest_count: 150,
      }),
    });
    const dataValid = await resValid.json();
    assert('API TEST: Valid lead POST returned 201', resValid.status === 201 && dataValid.success);

    const resManipulated = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Manipulated Lead',
        phone: '9811223344',
        event_type: 'Birthday',
        event_date_status: 'not_fixed',
        event_date: '2026-12-28', // Manipulated!
        guest_count_status: 'fixed',
        guest_count: 150,
      }),
    });
    assert('API TEST: Manipulated date POST returned 400 Bad Request', resManipulated.status === 400);

    const resNegativeGuests = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Negative Guests Lead',
        phone: '9811223344',
        event_type: 'Wedding',
        event_date_status: 'fixed',
        event_date: '2026-12-28',
        guest_count_status: 'fixed',
        guest_count: -100, // Invalid!
      }),
    });
    assert('API TEST: Negative guest count POST returned 400 Bad Request', resNegativeGuests.status === 400);
  } catch (err) {
    console.warn('Note: Dev server HTTP test skipped or error:', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
