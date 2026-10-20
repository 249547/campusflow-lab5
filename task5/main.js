// main.js - caller: default import + named imports (one aliased) + try/catch/finally
import Student from './Student.js';
import { calculateGrade, calculateAverage as avg } from './gradeUtils.js';   // alias: avg
import { processTranscripts, parseTranscriptJSON } from './transcriptService.js';

const validData = `
[
  { "id": 101, "name": "Ali", "courses": [ { "code": "CS301", "marks": 81 }, { "code": "CS302", "marks": 74 } ] },
  { "id": 102, "name": "Sara", "courses": [ { "code": "CS301", "marks": 93 }, { "code": "CS302", "marks": 50 } ] }
]`;

const cases = [
  ['VALID data', validData],
  ['MALFORMED JSON', '[ { "id": 1, "name": "X", '],
  ['NOT AN ARRAY', '{"id": 1}'],
  ['MISSING ID', '[{ "name": "NoId", "courses": [] }]'],
  ['DUPLICATE ID', '[{"id":1,"name":"A","courses":[]},{"id":1,"name":"B","courses":[]}]'],
  ['MARKS > 100', '[{"id":1,"name":"A","courses":[{"code":"CS1","marks":101}]}]'],
  ['MARKS < 0', '[{"id":1,"name":"A","courses":[{"code":"CS1","marks":-1}]}]'],
  ['MISSING COURSE CODE', '[{"id":1,"name":"A","courses":[{"marks":70}]}]'],
  ['MARKS NOT A NUMBER', '[{"id":1,"name":"A","courses":[{"code":"CS1","marks":"70"}]}]'],
  ['BOUNDARY marks 0 and 100', '[{"id":1,"name":"A","courses":[{"code":"CS1","marks":0},{"code":"CS2","marks":100}]}]'],
  ['NOT A STRING', 12345]
];

let attempts = 0;

for (const [label, input] of cases) {
  attempts += 1;
  console.log(`\n=== ${label} ===`);
  try {
    const json = processTranscripts(input);
    console.log(json);
  } catch (err) {
    console.log(`${err.constructor.name}: ${err.message}`);
  } finally {
    console.log(`(finally: attempt ${attempts} finished)`);
  }
}

console.log('\n=== Using the other imports directly ===');
const s = new Student(7, 'Demo', [{ code: 'X1', marks: 88 }]);
console.log(String(s), '| grade:', calculateGrade(88), '| average:', avg([88, 92]));
console.log('Parsed records:', parseTranscriptJSON(validData).length);
