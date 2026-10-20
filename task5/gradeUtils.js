// gradeUtils.js - named exports

export const PASS_MARK = 50;

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

function assertMarks(marks) {
  if (typeof marks !== 'number' || Number.isNaN(marks)) {
    throw new TypeError(`marks must be a number, received ${typeof marks}`);
  }
  if (marks < 0 || marks > 100) {
    throw new RangeError(`marks must be between 0 and 100, received ${marks}`);
  }
}

export function calculateGrade(marks) {
  assertMarks(marks);
  return GRADE_TABLE.find(row => marks >= row.min).grade;
}

export function gradePoints(marks) {
  assertMarks(marks);
  return GRADE_TABLE.find(row => marks >= row.min).points;
}

export function calculateAverage(marksList) {
  if (!Array.isArray(marksList)) throw new TypeError('marksList must be an array');
  if (marksList.length === 0) return 0;
  marksList.forEach(assertMarks);
  const total = marksList.reduce((sum, m) => sum + m, 0);
  return Math.round((total / marksList.length) * 100) / 100;
}

export function calculateGPA(marksList) {
  if (!Array.isArray(marksList)) throw new TypeError('marksList must be an array');
  if (marksList.length === 0) return 0;
  const total = marksList.reduce((sum, m) => sum + gradePoints(m), 0);
  return Math.round((total / marksList.length) * 100) / 100;
}
