// Task 8 - Concurrent Academic API Aggregator with async/await

// ---------- Custom error types so callers can tell failures apart ----------
class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
    this.status = status;
  }
}
class NetworkError extends Error {
  constructor(url, cause) {
    super(`Network failure for ${url}: ${cause?.message ?? cause}`);
    this.name = 'NetworkError';
  }
}
class InvalidJsonError extends Error {
  constructor(url, cause) {
    super(`Invalid JSON from ${url}: ${cause?.message ?? cause}`);
    this.name = 'InvalidJsonError';
  }
}
class TimeoutError extends Error {
  constructor(url, ms) {
    super(`Request to ${url} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

// ---------- Sample data ----------
const DATA = {
  '/users': [
    { id: 1, name: 'Ali', department: 'CS' },
    { id: 2, name: 'Sara', department: 'CS' },
    { id: 3, name: 'Usman', department: 'SE' },
    { id: 4, name: 'Hina', department: 'AI' }
  ],
  '/courses': [
    { code: 'FSWD', title: 'Full Stack Web Development' },
    { code: 'DB', title: 'Databases' }
  ],
  '/results': [
    { userId: 1, course: 'FSWD', marks: 82 },
    { userId: 2, course: 'FSWD', marks: 91 },
    { userId: 3, course: 'FSWD', marks: 47 },
    { userId: 4, course: 'FSWD', marks: 73 },
    { userId: 1, course: 'DB', marks: 70 },
    { userId: 3, course: 'DB', marks: 55 }
  ]
};

// ---------- fakeFetch: behaves like fetch() and returns response-shaped objects ----------
// Behaviours chosen by URL suffix:  ?status=404  ?status=500  ?network  ?badjson  ?slow=ms
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted', 'AbortError'));
    }, { once: true });
  });
}

async function fakeFetch(url, options = {}) {
  const { signal } = options;
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);

  await sleep(Number(params.get('slow') ?? 10), signal);          // 'slow' simulates a slow server

  if (params.has('network')) {
    throw new TypeError('fetch failed');                           // real fetch rejects with TypeError
  }
  if (params.has('status')) {
    const status = Number(params.get('status'));
    return { ok: false, status, json: async () => ({ error: 'failed' }) };
  }
  if (params.has('badjson')) {
    return { ok: true, status: 200, json: async () => JSON.parse('{ not valid json') };
  }
  if (!(path in DATA)) {
    return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
  }
  return { ok: true, status: 200, json: async () => structuredClone(DATA[path]) };
}

// ---------- getJSON ----------
async function getJSON(url, fetchImplementation = fakeFetch, options = {}) {
  let response;
  try {
    response = await fetchImplementation(url, options);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;                    // let the timeout layer decide
    throw new NetworkError(url, err);
  }
  if (!response.ok) {
    throw new HttpError(response.status, url);
  }
  try {
    return await response.json();
  } catch (err) {
    throw new InvalidJsonError(url, err);
  }
}

// ---------- fetchWithTimeout ----------
async function fetchWithTimeout(url, milliseconds, fetchImplementation = fakeFetch) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await getJSON(url, fetchImplementation, { signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw new TimeoutError(url, milliseconds);
    throw err;
  } finally {
    clearTimeout(timerId);                                         // runs on success AND failure
  }
}

// ---------- Dashboard ----------
function buildDashboard(users, courses, results) {
  const byUser = new Map(users.map(u => [u.id, u]));
  const marksOf = r => r.marks;

  const overallAverage = results.length
    ? Math.round((results.reduce((s, r) => s + marksOf(r), 0) / results.length) * 100) / 100
    : 0;

  const best = results.reduce((top, r) => (top === null || r.marks > top.marks ? r : top), null);

  const failedStudentIds = new Set(results.filter(r => r.marks < 50).map(r => r.userId));

  const departments = {};
  for (const r of results) {
    const dept = byUser.get(r.userId)?.department ?? 'UNKNOWN';
    const d = departments[dept] ?? { results: 0, total: 0, highest: -Infinity, failed: 0 };
    d.results += 1;
    d.total += r.marks;
    d.highest = Math.max(d.highest, r.marks);
    d.failed += r.marks < 50 ? 1 : 0;
    departments[dept] = d;
  }
  const departmentStats = Object.fromEntries(
    Object.entries(departments).map(([dept, d]) => [dept, {
      results: d.results,
      average: Math.round((d.total / d.results) * 100) / 100,
      highest: d.highest,
      failed: d.failed
    }])
  );

  return {
    totalStudents: users.length,
    totalCourses: courses.length,
    overallAverage,
    topPerformer: best ? { name: byUser.get(best.userId)?.name ?? 'Unknown', course: best.course, marks: best.marks } : null,
    failedStudents: failedStudentIds.size,
    departmentStats
  };
}

async function loadDashboard(fetchImplementation = fakeFetch, urls = { users: '/users', courses: '/courses', results: '/results' }) {
  // All three requests START immediately; we then wait for them together.
  // (Sequential awaits would take the SUM of the delays; Promise.all takes the MAX.)
  const [users, courses, results] = await Promise.all([
    getJSON(urls.users, fetchImplementation),
    getJSON(urls.courses, fetchImplementation),
    getJSON(urls.results, fetchImplementation)
  ]);
  return buildDashboard(users, courses, results);
}

export { HttpError, NetworkError, InvalidJsonError, TimeoutError, fakeFetch, getJSON, fetchWithTimeout, buildDashboard, loadDashboard };

// ---------------- Demonstration ----------------
if (import.meta.url === `file://${process.argv[1]}`) {
  async function attempt(label, work) {
    try {
      const value = await work();
      console.log(`${label.padEnd(26)} OK    ->`, JSON.stringify(value).slice(0, 90));
    } catch (err) {
      console.log(`${label.padEnd(26)} FAIL  -> ${err.name}: ${err.message}`);
    }
  }

  console.log('--- getJSON scenarios ---');
  await attempt('200 success', () => getJSON('/courses', fakeFetch));
  await attempt('404 (unknown path)', () => getJSON('/nothing', fakeFetch));
  await attempt('404 forced', () => getJSON('/users?status=404', fakeFetch));
  await attempt('500', () => getJSON('/users?status=500', fakeFetch));
  await attempt('network failure', () => getJSON('/users?network', fakeFetch));
  await attempt('invalid JSON', () => getJSON('/users?badjson', fakeFetch));
  await attempt('slow but OK (150ms)', () => getJSON('/users?slow=150', fakeFetch));

  console.log('\n--- fetchWithTimeout (limit 100ms) ---');
  await attempt('fast enough', () => fetchWithTimeout('/users?slow=20', 100));
  await attempt('too slow -> timeout', () => fetchWithTimeout('/users?slow=500', 100));
  await attempt('HTTP 500', () => fetchWithTimeout('/users?status=500', 100));
  await attempt('network failure', () => fetchWithTimeout('/users?network', 100));
  await attempt('invalid JSON', () => fetchWithTimeout('/users?badjson', 100));

  console.log('\n--- Concurrency proof: three calls of 200ms each ---');
  const slowUrls = { users: '/users?slow=200', courses: '/courses?slow=200', results: '/results?slow=200' };
  let started = performance.now();
  await loadDashboard(fakeFetch, slowUrls);
  const concurrent = Math.round(performance.now() - started);

  started = performance.now();
  await getJSON(slowUrls.users);
  await getJSON(slowUrls.courses);
  await getJSON(slowUrls.results);
  const sequential = Math.round(performance.now() - started);
  console.log(`concurrent (Promise.all): ~${concurrent}ms   sequential awaits: ~${sequential}ms`);

  console.log('\n--- Dashboard ---');
  console.dir(await loadDashboard(fakeFetch), { depth: null });

  console.log('\n--- Dashboard with one failing service ---');
  await attempt('results service 500', () => loadDashboard(fakeFetch, { users: '/users', courses: '/courses', results: '/results?status=500' }));

  console.log('\n--- Edge case: empty data ---');
  console.dir(buildDashboard([], [], []), { depth: null });
}
