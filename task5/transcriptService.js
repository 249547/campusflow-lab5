// transcriptService.js - parse, validate and report on transcript JSON
import Student from './Student.js';
import { calculateAverage, calculateGPA as computeGPA, calculateGrade } from './gradeUtils.js';

// Step 1: parse safely. Malformed JSON becomes a clear SyntaxError-based failure.
export function parseTranscriptJSON(rawText) {
  if (typeof rawText !== 'string') {
    throw new TypeError('Transcript data must be a JSON string');
  }
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new SyntaxError(`Malformed JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError('Transcript JSON must contain an array of students');
  }
  return parsed;
}

// Step 2: validate every record and return Student instances.
export function validateStudents(records) {
  const seenIds = new Set();

  return records.map((record, index) => {
    const where = `student at index ${index}`;
    if (record === null || typeof record !== 'object') {
      throw new TypeError(`${where} must be an object`);
    }

    const { id, name, courses } = record;
    if (id === undefined || id === null || id === '') {
      throw new Error(`Missing student ID for ${where}`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Duplicate student ID: ${id}`);
    }
    seenIds.add(id);

    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError(`Student ${id} must have a name`);
    }
    if (!Array.isArray(courses)) {
      throw new TypeError(`Student ${id} must have a courses array`);
    }

    const cleanCourses = courses.map((course, cIndex) => {
      if (course === null || typeof course !== 'object') {
        throw new TypeError(`Student ${id}, course ${cIndex} must be an object`);
      }
      const { code, marks } = course;
      if (typeof code !== 'string' || code.trim() === '') {
        throw new Error(`Student ${id}, course ${cIndex}: missing course code`);
      }
      if (typeof marks !== 'number' || Number.isNaN(marks)) {
        throw new TypeError(`Student ${id}, course ${code}: marks must be a number`);
      }
      if (marks < 0 || marks > 100) {
        throw new RangeError(`Student ${id}, course ${code}: marks ${marks} outside 0-100`);
      }
      return { code: code.trim(), marks };
    });

    return new Student(id, name.trim(), cleanCourses);
  });
}

// Step 3: build the report object.
export function buildReport(students) {
  const entries = students.map(student => ({
    id: student.id,
    name: student.name,
    courses: student.courses.map(c => ({ ...c, grade: calculateGrade(c.marks) })),
    average: calculateAverage(student.marksList),
    gpa: computeGPA(student.marksList)
  }));
  return { generatedFor: entries.length, students: entries };
}

// Step 4: report -> JSON text
export function reportToJSON(report) {
  return JSON.stringify(report, null, 2);
}

// Full pipeline
export function processTranscripts(rawText) {
  const records = parseTranscriptJSON(rawText);
  const students = validateStudents(records);
  const report = buildReport(students);
  return reportToJSON(report);
}
