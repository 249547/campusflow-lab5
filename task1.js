// Task 1 - Admission Decision and Data Sanitization Engine
// No closures, no DOM, no external packages. Source data is never mutated.

const SUPPORTED_PROGRAMS = ['BSCS', 'BSSE', 'BSAI'];
const WEIGHTS = { matric: 0.2, intermediate: 0.3, entryTest: 0.5 };

// Explicit conversion: returns { value, error }. Guard clauses handle every bad case.
function toNumber(raw, label) {
  if (raw === undefined || raw === null) {
    return { value: null, error: `${label} is missing` };
  }
  const text = String(raw).trim();
  if (text === '') {
    return { value: null, error: `${label} is empty` };
  }
  const num = Number(text);            // explicit conversion
  if (Number.isNaN(num)) {
    return { value: null, error: `${label} is not a valid number ("${text}")` };
  }
  if (!Number.isFinite(num)) {
    return { value: null, error: `${label} is not finite` };
  }
  return { value: num, error: null };
}

function toBoolean(raw) {
  // 'false', '', undefined must NOT become true (truthy/falsy trap with Boolean('false'))
  if (typeof raw === 'boolean') return raw;
  const text = String(raw ?? '').trim().toLowerCase();
  switch (text) {
    case 'true':
    case 'yes':
    case '1':
      return true;
    default:
      return false;
  }
}

function checkRange(value, min, max, label) {
  return value >= min && value <= max ? null : `${label} must be between ${min} and ${max}`;
}

// Step 1: sanitize + validate one applicant. Returns a NEW object.
function sanitizeApplicant(applicant) {
  const errors = [];

  if (applicant === null || typeof applicant !== 'object') {
    return { id: undefined, valid: false, errors: ['Applicant record is not an object'] };
  }

  const name = typeof applicant.name === 'string' ? applicant.name.trim() : '';
  if (!name) errors.push('name is missing');

  const id = applicant.id ? String(applicant.id).trim() : '';
  if (!id) errors.push('id is missing');

  const age = toNumber(applicant.age, 'age');
  const matric = toNumber(applicant.matricMarks, 'matricMarks');
  const inter = toNumber(applicant.intermediateMarks, 'intermediateMarks');
  const entry = toNumber(applicant.entryTest, 'entryTest');

  for (const result of [age, matric, inter, entry]) {
    if (result.error) errors.push(result.error);
  }

  if (age.value !== null) {
    const e = checkRange(age.value, 17, 30, 'age');
    if (e) errors.push(e);
  }
  const marksChecks = [
    [matric, 'matricMarks'],
    [inter, 'intermediateMarks'],
    [entry, 'entryTest']
  ];
  for (const [result, label] of marksChecks) {
    if (result.value !== null) {
      const e = checkRange(result.value, 0, 100, label);
      if (e) errors.push(e);
    }
  }

  const program = typeof applicant.program === 'string' ? applicant.program.trim().toUpperCase() : '';
  if (!SUPPORTED_PROGRAMS.includes(program)) {
    errors.push(`program "${applicant.program}" is not supported`);
  }

  return {
    id,
    name,
    age: age.value,
    matricMarks: matric.value,
    intermediateMarks: inter.value,
    entryTest: entry.value,
    program,
    feePaid: toBoolean(applicant.feePaid),
    valid: errors.length === 0,
    errors
  };
}

function calculateMerit(clean) {
  const merit =
    clean.matricMarks * WEIGHTS.matric +
    clean.intermediateMarks * WEIGHTS.intermediate +
    clean.entryTest * WEIGHTS.entryTest;
  return Math.round(merit * 100) / 100;
}

// Status rules:
//  INVALID DATA - failed validation (merit is never calculated)
//  REJECTED     - fails eligibility (merit < 70 OR entry < 60 OR intermediate < 60)
//  SELECTED     - eligible AND merit >= 80 AND fee paid (confirmed seat)
//  WAITING      - eligible but merit is 70-79.99, or merit >= 80 with fee unpaid
function decideStatus(clean, merit) {
  const eligible = merit >= 70 && clean.entryTest >= 60 && clean.intermediateMarks >= 60;
  if (!eligible) return 'REJECTED';
  return merit >= 80 && clean.feePaid ? 'SELECTED' : 'WAITING';
}

function evaluateApplicant(applicant) {
  const clean = sanitizeApplicant(applicant);
  if (!clean.valid) {
    return { ...clean, merit: null, status: 'INVALID DATA' };
  }
  const merit = calculateMerit(clean);
  return { ...clean, merit, status: decideStatus(clean, merit) };
}

function processAdmissions(applicants) {
  if (!Array.isArray(applicants)) {
    throw new TypeError('applicants must be an array');
  }
  return applicants.map(evaluateApplicant);
}

function summarize(evaluated) {
  const valid = evaluated.filter(a => a.valid);
  const invalid = evaluated.filter(a => !a.valid);

  const highest = valid.reduce((best, a) => (best === null || a.merit > best.merit ? a : best), null);
  const lowest = valid.length ? Math.min(...valid.map(a => a.merit)) : null;
  const average = valid.length
    ? Math.round((valid.reduce((sum, a) => sum + a.merit, 0) / valid.length) * 100) / 100
    : null;

  const perProgram = {};
  for (const a of evaluated) {
    const key = a.program || 'UNKNOWN';
    perProgram[key] = (perProgram[key] ?? 0) + 1;
  }

  return {
    validApplicants: valid.length,
    invalidApplicants: invalid.length,
    highestMerit: highest ? { id: highest.id, name: highest.name, merit: highest.merit } : null,
    lowestValidMerit: lowest,
    averageMerit: average,
    applicantsPerProgram: perProgram
  };
}

export { toNumber, toBoolean, sanitizeApplicant, calculateMerit, decideStatus, evaluateApplicant, processAdmissions, summarize };

// ---------------- Demonstration ----------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const applicants = [
    { id: 'A101', name: 'Sara Khan', age: '19', matricMarks: '91', intermediateMarks: '87', entryTest: '78', program: 'BSCS', feePaid: 'true' },
    { id: 'A102', name: 'Ahmed Ali', age: 'twenty', matricMarks: '88', intermediateMarks: '', entryTest: '72', program: 'BSSE', feePaid: 'false' },
    { id: 'A103', name: 'Hassan', age: '18', matricMarks: '76', intermediateMarks: '83', entryTest: '91', program: 'BSAI', feePaid: 'true' },
    // boundary cases
    { id: 'B1', name: 'Boundary Min', age: '17', matricMarks: '0', intermediateMarks: '60', entryTest: '100', program: 'BSCS', feePaid: 'true' },
    { id: 'B2', name: 'Exact 70', age: '30', matricMarks: '70', intermediateMarks: '70', entryTest: '70', program: 'BSSE', feePaid: 'false' },
    { id: 'B3', name: 'Low Entry', age: '20', matricMarks: '100', intermediateMarks: '100', entryTest: '59', program: 'BSAI', feePaid: 'true' },
    { id: 'B4', name: 'High merit unpaid', age: '22', matricMarks: '90', intermediateMarks: '90', entryTest: '90', program: 'BSCS', feePaid: 'false' },
    // invalid cases
    { id: 'X1', name: 'Too Young', age: '16', matricMarks: '80', intermediateMarks: '80', entryTest: '80', program: 'BSCS', feePaid: 'true' },
    { id: 'X2', name: 'Bad Marks', age: '20', matricMarks: '101', intermediateMarks: '-5', entryTest: '80', program: 'BSCS', feePaid: 'true' },
    { id: 'X3', name: 'Bad Program', age: '20', matricMarks: '80', intermediateMarks: '80', entryTest: '80', program: 'MBA', feePaid: 'true' },
    { id: 'X4', name: 'Missing Fields', program: 'BSSE' },
    null
  ];

  const snapshot = JSON.stringify(applicants);
  const evaluated = processAdmissions(applicants);

  console.log('--- Per applicant ---');
  for (const a of evaluated) {
    console.log(`${String(a.id).padEnd(5)} ${String(a.name).padEnd(18)} merit=${String(a.merit).padEnd(6)} ${a.status}${a.errors.length ? '  <- ' + a.errors.join('; ') : ''}`);
  }
  console.log('\n--- Summary ---');
  console.log(summarize(evaluated));
  console.log('\nSource data unchanged:', JSON.stringify(applicants) === snapshot);

  try {
    processAdmissions('not an array');
  } catch (err) {
    console.log('Invalid input type ->', err.name + ':', err.message);
  }
}
