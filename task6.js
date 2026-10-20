// Task 6 - Legacy Course Registration Service Using Callbacks
// Error-first callbacks, setTimeout only. No Promises, no async/await.
// Each operation calls its callback EXACTLY ONCE (every path ends in a single `return callback(...)`).

const students = {
  101: { id: 101, name: 'Ali', completed: ['CS101', 'CS201'], registered: [] },
  102: { id: 102, name: 'Sara', completed: ['CS101'], registered: [] },
  103: { id: 103, name: 'Hina', completed: ['CS101', 'CS201'], registered: ['CS401'] }
};

const courses = {
  CS401: { code: 'CS401', prerequisites: ['CS101', 'CS201'], seats: 2 },
  CS402: { code: 'CS402', prerequisites: [], seats: 0 }
};

const DELAY_MS = 20;

// 1. Load student
function loadStudent(studentId, callback) {
  setTimeout(() => {
    const student = students[studentId];
    if (!student) {
      return callback(new Error(`Student ${studentId} does not exist`));
    }
    return callback(null, student);
  }, DELAY_MS);
}

// 2. Check prerequisites
function checkPrerequisites(student, courseCode, callback) {
  setTimeout(() => {
    const course = courses[courseCode];
    if (!course) {
      return callback(new Error(`Course ${courseCode} does not exist`));
    }
    const missing = course.prerequisites.filter(p => !student.completed.includes(p));
    if (missing.length > 0) {
      return callback(new Error(`Prerequisite not completed: ${missing.join(', ')}`));
    }
    return callback(null, course);
  }, DELAY_MS);
}

// 3. Check seats
function checkSeats(course, callback) {
  setTimeout(() => {
    if (course.seats <= 0) {
      return callback(new Error(`Course ${course.code} is full`));
    }
    return callback(null, course);
  }, DELAY_MS);
}

// 4. Register
function registerCourse(student, course, callback) {
  setTimeout(() => {
    if (student.registered.includes(course.code)) {
      return callback(new Error(`Student ${student.id} is already registered in ${course.code}`));
    }
    course.seats -= 1;
    student.registered.push(course.code);
    return callback(null, { studentId: student.id, course: course.code, status: 'REGISTERED' });
  }, DELAY_MS);
}

// Workflow: nested callbacks. Each failure returns immediately, so later stages never run.
function registerForCourse(studentId, courseCode, done) {
  loadStudent(studentId, (err1, student) => {
    if (err1) return done(err1);

    checkPrerequisites(student, courseCode, (err2, course) => {
      if (err2) return done(err2);

      checkSeats(course, (err3, openCourse) => {
        if (err3) return done(err3);

        registerCourse(student, openCourse, (err4, confirmation) => {
          if (err4) return done(err4);
          return done(null, confirmation);
        });
      });
    });
  });
}

export { registerForCourse, loadStudent, checkPrerequisites, checkSeats, registerCourse };

if (import.meta.url === `file://${process.argv[1]}`) {
  // Run scenarios one after another (each starts in the previous scenario's callback)
  const scenarios = [
    ['SUCCESS: Ali -> CS401', 101, 'CS401'],
    ['FAIL: student does not exist', 999, 'CS401'],
    ['FAIL: prerequisite not completed (Sara)', 102, 'CS401'],
    ['FAIL: course full (Ali -> CS402)', 101, 'CS402'],
    ['FAIL: already registered (Hina)', 103, 'CS401'],
    ['FAIL: unknown course', 101, 'CS999'],
    ['FAIL: already registered (Ali again)', 101, 'CS401']
  ];

  function runScenario(index) {
    if (index >= scenarios.length) {
      console.log('\nAll scenarios finished.');
      console.log(`
WHY CALLBACK WORKFLOWS ARE HARD TO MAINTAIN
- Nesting ("callback hell"): each dependent step must live inside the previous callback, so the code
  drifts right. Four steps already need four levels; ten steps become a pyramid that is hard to read,
  reorder, or insert a new step into.
- Repeated error handling: every level needs its own "if (err) return ..." line. Forget one and the
  code carries on with undefined data, or the error is silently lost.
- Easy to break the "exactly once" rule: forgetting "return" after calling the callback lets the
  function continue and call it a second time.
- No try/catch across async boundaries: an exception thrown inside a timer callback is not caught by a
  try/catch around the outer call, so errors must be passed manually through callbacks.
- Hard to share logic: retries, timeouts, running steps in parallel, or collecting results all need
  hand-written bookkeeping. Promises and async/await (Tasks 7 and 8) solve this.
`);

      return;
    }
    const [label, id, code] = scenarios[index];
    registerForCourse(id, code, (error, result) => {
      if (error) console.log(`${label}\n   ERROR -> ${error.message}`);
      else console.log(`${label}\n   OK    -> ${JSON.stringify(result)}`);
      runScenario(index + 1);
    });
  }
  runScenario(0);

}
