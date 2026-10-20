// Task 2 - Academic Performance Intelligence Engine
// Array methods only for the analytics. sort() mutates, so it always runs on a copy.

const PASS_MARK = 50;

const results = [
  { id: 1, name: 'Ali', department: 'CS', course: 'FSWD', marks: 82 },
  { id: 2, name: 'Sara', department: 'CS', course: 'FSWD', marks: 91 },
  { id: 3, name: 'Usman', department: 'SE', course: 'FSWD', marks: 47 },
  { id: 4, name: 'Hina', department: 'AI', course: 'FSWD', marks: 73 },
  { id: 5, name: 'Ahmed', department: 'SE', course: 'FSWD', marks: 64 },
  { id: 6, name: 'Zoya', department: 'AI', course: 'FSWD', marks: 91 }
];

// Grading policy. The brief's table lost some characters in the PDF text ("A-", "B-" ...);
// the standard university scale is used: 80-84 A-, 65-69 B-, 60-64 C+.
const GRADE_TABLE = [
  { min: 85, grade: 'A', points: 4.0 },
  { min: 80, grade: 'A-', points: 3.67 },
  { min: 75, grade: 'B+', points: 3.33 },
  { min: 70, grade: 'B', points: 3.0 },
  { min: 65, grade: 'B-', points: 2.67 },
  { min: 60, grade: 'C+', points: 2.33 },
  { min: 50, grade: 'C', points: 2.0 },
  { min: 0, grade: 'F', points: 0.0 }
];

function gradeFor(marks) {
  return GRADE_TABLE.find(row => marks >= row.min);
}

// A. Result processing -> new objects, source untouched
function processResults(list) {
  return list.map(student => {
    const { grade, points } = gradeFor(student.marks);
    return {
      ...student,
      grade,
      gradePoints: points,
      status: student.marks >= PASS_MARK ? 'PASS' : 'FAIL'
    };
  });
}

// B. Ranked merit list: marks desc, then name A-Z. [...list] copy protects the original.
function rankedMeritList(list) {
  return [...list].sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name));
}

// C. Department statistics - keys are built from the data, so a new "DS" just works.
function departmentStats(processed) {
  return processed.reduce((acc, student) => {
    const current = acc[student.department] ?? { students: 0, total: 0, highest: -Infinity, passed: 0 };
    current.students += 1;
    current.total += student.marks;
    current.highest = Math.max(current.highest, student.marks);
    current.passed += student.status === 'PASS' ? 1 : 0;
    acc[student.department] = current;
    return acc;
  }, {});
}

function finalizeDepartmentStats(raw) {
  return Object.fromEntries(
    Object.entries(raw).map(([dept, s]) => [
      dept,
      {
        students: s.students,
        average: Math.round((s.total / s.students) * 100) / 100,
        highest: s.highest,
        passed: s.passed
      }
    ])
  );
}

// D. Academic queries
function academicQueries(processed) {
  const overallAverage = processed.reduce((sum, s) => sum + s.marks, 0) / (processed.length || 1);
  return {
    firstAbove85: processed.find(s => s.marks > 85) ?? null,
    indexOfFirstFailed: processed.findIndex(s => s.status === 'FAIL'),
    anyFailed: processed.some(s => s.status === 'FAIL'),
    allMarksValid: processed.every(s => Number.isFinite(s.marks) && s.marks >= 0 && s.marks <= 100),
    overallAverage: Math.round(overallAverage * 100) / 100,
    aboveAverage: processed.filter(s => s.marks > overallAverage).map(s => s.name),
    topThreeNames: rankedMeritList(processed).slice(0, 3).map(s => s.name)
  };
}

export { gradeFor, processResults, rankedMeritList, departmentStats, finalizeDepartmentStats, academicQueries };

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = JSON.stringify(results);

  const processed = processResults(results);
  console.log('A. Processed results');
  processed.forEach(s => console.log(`  ${s.name.padEnd(6)} ${s.department} ${String(s.marks).padEnd(3)} ${s.grade.padEnd(3)} ${s.gradePoints.toFixed(2)} ${s.status}`));

  const ranked = rankedMeritList(processed);
  console.log('\nB. Ranked merit list:', ranked.map(s => `${s.name}(${s.marks})`).join(', '));

  console.log('\nC. Department statistics');
  console.log(finalizeDepartmentStats(departmentStats(processed)));

  const extended = [...processed, ...processResults([{ id: 7, name: 'Bilal', department: 'DS', course: 'FSWD', marks: 88 }])];
  console.log('   With new DS department:', finalizeDepartmentStats(departmentStats(extended)).DS);

  console.log('\nD. Queries');
  console.log(academicQueries(processed));

  // Boundary + invalid checks
  console.log('\nBoundary grades:', [100, 85, 84, 80, 79, 75, 74, 70, 69, 65, 64, 60, 59, 50, 49, 0].map(m => `${m}=${gradeFor(m).grade}`).join(' '));
  console.log('Invalid marks detected by every():', academicQueries(processResults([{ id: 9, name: 'Bad', department: 'CS', course: 'X', marks: 120 }])).allMarksValid === false);
  console.log('Empty list:', academicQueries([]));

  console.log('\nOriginal results unchanged (no mutation):', JSON.stringify(results) === snapshot);
  console.log('Original order still:', results.map(s => s.name).join(', '));
}
