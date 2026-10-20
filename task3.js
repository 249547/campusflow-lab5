// Task 3 - Safe Student Profile Update Service
// Demonstrates: object/nested/renaming/default destructuring, array destructuring, rest parameters,
// object rest, spread, optional chaining, nullish coalescing, property shorthand.

const student = {
  id: 101,
  name: 'Ali',
  marks: 0,
  scholarship: false,
  address: { city: 'Islamabad', sector: 'F-10' },
  contact: { email: 'ali@university.edu' }
};

const update = {
  name: 'Ali Khan',
  address: { city: 'Rawalpindi' },
  contact: { phone: '03001234567' }
};

// Rest parameters: accepts one or more update objects, applied left to right.
// Array destructuring: [first, ...others] splits the list.
function updateStudentProfile(original, ...updates) {
  const [firstUpdate, ...laterUpdates] = updates;
  if (firstUpdate === undefined) return { ...original };               // nothing to apply -> shallow copy

  const merged = applyUpdate(original, firstUpdate);
  return laterUpdates.reduce((current, next) => applyUpdate(current, next), merged);
}

function applyUpdate(original, patch) {
  // Nested destructuring + renaming + defaults.
  // Defaults only fire for `undefined`, so 0, false and '' in the PATCH are kept.
  const {
    address: { city: currentCity, sector: currentSector } = {},     // nested + rename
    contact: currentContact = {},
    ...otherOriginal                                                // object rest: everything else
  } = original;

  const {
    address: patchAddress,
    contact: patchContact,
    ...patchRest                                                    // simple top-level changes
  } = patch ?? {};

  // Optional chaining reads possibly-missing nested values; ?? replaces ONLY null/undefined.
  const city = patchAddress?.city ?? currentCity;
  const sector = patchAddress?.sector ?? currentSector;

  // Only add the address / contact if there is something to put in them.
  const address = { ...original.address, ...patchAddress };
  if (city !== undefined) address.city = city;                      // property assignment from variable
  if (sector !== undefined) address.sector = sector;

  const contact = { ...currentContact, ...patchContact };

  // Spread merges top-level fields; copies of address/contact guarantee new references.
  // Property shorthand: { address, contact } is { address: address, contact: contact }
  return {
    ...otherOriginal,
    ...patchRest,
    address,
    contact
  };
}

// Reference comparison helper
function compareReferences(before, after) {
  const pairs = [
    ['original object vs updated object', before, after],
    ['original address vs updated address', before.address, after.address],
    ['original contact vs updated contact', before.contact, after.contact]
  ];
  return pairs.map(([label, a, b]) => ({ label, sameReference: a === b }));
}

export { updateStudentProfile, applyUpdate, compareReferences };

if (import.meta.url === `file://${process.argv[1]}`) {
  const before = JSON.stringify(student);
  const updated = updateStudentProfile(student, update);

  console.log('Original :', JSON.stringify(student));
  console.log('Updated  :', JSON.stringify(updated));
  console.log('Original unchanged:', JSON.stringify(student) === before);

  console.log('\nChecks');
  console.log('  name changed               :', updated.name === 'Ali Khan');
  console.log('  id/marks/scholarship kept  :', updated.id === 101 && updated.marks === 0 && updated.scholarship === false);
  console.log('  city changed, sector kept  :', updated.address.city === 'Rawalpindi' && updated.address.sector === 'F-10');
  console.log('  email kept, phone added    :', updated.contact.email === 'ali@university.edu' && updated.contact.phone === '03001234567');

  console.log('\nReference comparison (=== on objects compares identity, not content)');
  for (const { label, sameReference } of compareReferences(student, updated)) {
    console.log(`  ${label}: ${sameReference ? 'EQUAL (same reference)' : 'DIFFERENT (new object)'}`);
  }
  console.log('  Why: spread copies create new objects, so each pair is a different reference even where the contents match.');
  console.log('  A plain { ...student } would copy `address` and `contact` BY REFERENCE (shallow copy):');
  const shallow = { ...student };
  console.log('    shallow.address === student.address :', shallow.address === student.address);

  console.log('\nFalsy-but-valid values must survive');
  const falsy = updateStudentProfile(student, { marks: 0, scholarship: false, name: '' });
  console.log('  ', { marks: falsy.marks, scholarship: falsy.scholarship, name: falsy.name });
  const withTrue = updateStudentProfile({ ...student, marks: 80, scholarship: true }, { marks: 0, scholarship: false });
  console.log('   overwrite 80/true with 0/false ->', { marks: withTrue.marks, scholarship: withTrue.scholarship });

  console.log('\nEdge cases');
  console.log('   empty update   :', JSON.stringify(updateStudentProfile(student)));
  console.log('   null update    :', JSON.stringify(updateStudentProfile(student, null)));
  const bare = { id: 1, name: 'NoNested' };
  console.log('   no address/contact in original:', JSON.stringify(updateStudentProfile(bare, { address: { city: 'Lahore' } })));
  console.log('   multiple updates (rest params):', JSON.stringify(updateStudentProfile(student, { marks: 55 }, { scholarship: true }, { contact: { phone: '1' } })));
  console.log('   original still unchanged:', JSON.stringify(student) === before);
}
