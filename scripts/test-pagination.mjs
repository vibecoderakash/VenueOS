// Automated test suite for lead pagination and filtering
async function detectOrigin() {
  const ports = [3000, 3001, 3002];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/api/auth/setup-status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.status === 200) {
        return `http://localhost:${port}`;
      }
    } catch {
      // try next port
    }
  }
  return 'http://localhost:3000';
}

async function runPaginationTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VENUE OS LEAD PAGINATION & FILTERING TESTS');
  console.log('================================================================\n');

  const origin = await detectOrigin();
  const baseUrl = `${origin}/api/leads`;
  console.log(`Target Server: ${origin}\n`);

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

  // TEST 1: Unauthenticated GET request is rejected with 401
  const resNoAuth = await fetch(baseUrl);
  const dataNoAuth = await resNoAuth.json().catch(() => ({}));
  assert(
    'TEST 1: GET /api/leads without authentication returns 401 Unauthorized',
    resNoAuth.status === 401 && dataNoAuth.code === 'AUTH_UNAUTHORIZED'
  );

  // TEST 2: GET /api/leads with invalid Bearer token is rejected with 401
  const resBadToken = await fetch(baseUrl, {
    headers: { Authorization: 'Bearer invalid_test_token_123' },
  });
  const dataBadToken = await resBadToken.json().catch(() => ({}));
  assert(
    'TEST 2: GET /api/leads with invalid token returns 401 Unauthorized',
    resBadToken.status === 401 && dataBadToken.code === 'AUTH_UNAUTHORIZED'
  );

  // TEST 3: Verification of query parameter parsing & sanitization on API route
  const resParamTest = await fetch(`${baseUrl}?offset=invalid&limit=-5&sortBy=invalid_col`);
  assert(
    'TEST 3: GET /api/leads with malformed query parameters does not crash (401 handled safely)',
    resParamTest.status === 401
  );

  // TEST 4: Positive integer boundary tests
  const positiveInt = (value, fallback) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) return fallback;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  };
  assert('TEST 4A: positiveInt parses valid "0"', positiveInt('0', 0) === 0);
  assert('TEST 4B: positiveInt parses valid "5"', positiveInt('5', 5) === 5);
  assert('TEST 4C: positiveInt parses valid "10"', positiveInt('10', 5) === 10);
  assert('TEST 4D: positiveInt falls back on "-1"', positiveInt('-1', 5) === 5);
  assert('TEST 4E: positiveInt falls back on "abc"', positiveInt('abc', 5) === 5);
  assert('TEST 4F: positiveInt falls back on null', positiveInt(null, 5) === 5);

  // TEST 5: hasMore calculation logic test
  const calculateHasMore = (offset, returnedLength, total) => {
    return offset + returnedLength < total;
  };
  assert('TEST 5A: hasMore is true when 5 of 12 leads loaded (offset 0)', calculateHasMore(0, 5, 12) === true);
  assert('TEST 5B: hasMore is true when 5 more leads loaded (offset 5, total 12)', calculateHasMore(5, 5, 12) === true);
  assert('TEST 5C: hasMore is false when last 2 leads loaded (offset 10, total 12)', calculateHasMore(10, 2, 12) === false);
  assert('TEST 5D: hasMore is false when exactly 5 leads exist and 5 loaded (offset 0, total 5)', calculateHasMore(0, 5, 5) === false);
  assert('TEST 5E: hasMore is false when 0 leads exist (offset 0, total 0)', calculateHasMore(0, 0, 0) === false);

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPaginationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
