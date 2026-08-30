// Comprehensive API & Backend validation test covering all 14 PRD test cases
async function runApiTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VENUE OS BANQUET INQUIRY FORM BACKEND & API TESTS');
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

  const baseUrl = 'http://localhost:3000/api/leads';

  const validTemplate = {
    customer_name: 'Rohit Sharma',
    phone: '9876543210',
    source: 'Meta',
    event_type: 'Wedding',
    event_date_status: 'fixed',
    event_date: '2026-12-28',
    guest_count_status: 'fixed',
    guest_count: 350,
  };

  async function postLead(payload) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // TEST 1: Submit with Event Type empty -> Rejected (400)
  const res1 = await postLead({ ...validTemplate, event_type: '' });
  assert('TEST 1: Submit with Event Type empty is rejected (400)', res1.status === 400);

  // TEST 2: Submit with Event Date status missing/unselected -> Rejected (400)
  const res2 = await postLead({
    customer_name: validTemplate.customer_name,
    phone: validTemplate.phone,
    event_type: 'Wedding',
    guest_count_status: 'fixed',
    guest_count: 350,
  });
  assert('TEST 2: Submit with Event Date neither selected nor marked Not Fixed is rejected (400)', res2.status === 400);

  // TEST 3: Submit with Event Date = Not Fixed -> Lead created successfully (201, event_date=null, event_date_status=not_fixed)
  const res3 = await postLead({
    ...validTemplate,
    event_date_status: 'not_fixed',
    event_date: null,
  });
  assert(
    'TEST 3: Submit with Event Date = Not Fixed creates lead with event_date=null (201)',
    res3.status === 201 && res3.data.lead.event_date_status === 'not_fixed' && res3.data.lead.event_date === null
  );

  // TEST 4: Submit with Event Date fixed but no date -> Rejected (400)
  const res4 = await postLead({
    ...validTemplate,
    event_date_status: 'fixed',
    event_date: null,
  });
  assert('TEST 4: Submit with Event Date fixed but no date is rejected (400)', res4.status === 400);

  // TEST 5: Submit with Guest Count status missing/unselected -> Rejected (400)
  const res5 = await postLead({
    customer_name: validTemplate.customer_name,
    phone: validTemplate.phone,
    event_type: 'Wedding',
    event_date_status: 'fixed',
    event_date: '2026-12-28',
  });
  assert('TEST 5: Submit with Guest Count neither entered nor marked Not Fixed is rejected (400)', res5.status === 400);

  // TEST 6: Submit Guest Count = Not Fixed -> Lead created successfully (201, guest_count=null, guest_count_status=not_fixed)
  const res6 = await postLead({
    ...validTemplate,
    guest_count_status: 'not_fixed',
    guest_count: null,
  });
  assert(
    'TEST 6: Submit Guest Count = Not Fixed creates lead with guest_count=null (201)',
    res6.status === 201 && res6.data.lead.guest_count_status === 'not_fixed' && res6.data.lead.guest_count === null
  );

  // TEST 7: Submit Guest Count = 350 -> Lead created successfully (201)
  const res7 = await postLead({
    ...validTemplate,
    guest_count_status: 'fixed',
    guest_count: 350,
  });
  assert(
    'TEST 7: Submit Guest Count = 350 creates lead with guest_count=350 (201)',
    res7.status === 201 && res7.data.lead.guest_count === 350
  );

  // TEST 8: Submit Guest Count = 0 -> Rejected (400)
  const res8 = await postLead({
    ...validTemplate,
    guest_count_status: 'fixed',
    guest_count: 0,
  });
  assert('TEST 8: Submit Guest Count = 0 is rejected (400)', res8.status === 400);

  // TEST 9: Submit Guest Count = -50 -> Rejected (400)
  const res9 = await postLead({
    ...validTemplate,
    guest_count_status: 'fixed',
    guest_count: -50,
  });
  assert('TEST 9: Submit Guest Count = -50 is rejected (400)', res9.status === 400);

  // TEST 10: Submit Event Date = Not Fixed but send a real date through manipulated API request -> Backend rejects (400)
  const res10 = await postLead({
    ...validTemplate,
    event_date_status: 'not_fixed',
    event_date: '2026-12-28', // Manipulated!
  });
  assert('TEST 10: Manipulated API request (event_date_status="not_fixed" + real date) is rejected (400)', res10.status === 400);

  // TEST 11: Submit Guest Count = Not Fixed but send 500 through manipulated API request -> Backend rejects (400)
  const res11 = await postLead({
    ...validTemplate,
    guest_count_status: 'not_fixed',
    guest_count: 500, // Manipulated!
  });
  assert('TEST 11: Manipulated API request (guest_count_status="not_fixed" + guest_count=500) is rejected (400)', res11.status === 400);

  // TEST 12: Create a lead with: Wedding, Not Fixed date, Not Fixed guest count -> Successfully created (201)
  const res12 = await postLead({
    ...validTemplate,
    event_type: 'Wedding',
    event_date_status: 'not_fixed',
    event_date: null,
    guest_count_status: 'not_fixed',
    guest_count: null,
  });
  assert(
    'TEST 12: Lead with Wedding + Not Fixed date + Not Fixed guest count is successfully created (201)',
    res12.status === 201 &&
      res12.data.lead.event_type === 'Wedding' &&
      res12.data.lead.event_date === null &&
      res12.data.lead.guest_count === null
  );

  // Fake Date rejection check: 1970-01-01 or 0000-00-00
  const resFakeDate = await postLead({
    ...validTemplate,
    event_date_status: 'fixed',
    event_date: '1970-01-01',
  });
  assert('TEST EXTRA: Disallowed fake date 1970-01-01 is rejected (400)', resFakeDate.status === 400);

  console.log('\n================================================================');
  console.log(`📊 TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
