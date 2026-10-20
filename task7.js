// Task 7 - Promise-Based Multi-Service Registration Engine

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const students = {
  101: { id: 101, name: 'Ali', completed: ['CS101', 'CS201'] },
  102: { id: 102, name: 'Sara', completed: ['CS101'] }
};
const courses = {
  CS401: { code: 'CS401', prerequisites: ['CS101', 'CS201'], seats: 2 },
  CS402: { code: 'CS402', prerequisites: [], seats: 0 }
};

function getStudent(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const student = students[id];
      if (!student) reject(new Error(`Student ${id} not found`));
      else resolve(student);
    }, 10);
  });
}

function getCourse(code) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const course = courses[code];
      if (!course) reject(new Error(`Course ${code} not found`));
      else resolve(course);
    }, 10);
  });
}

function checkPrerequisites(student, course) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const missing = course.prerequisites.filter(p => !student.completed.includes(p));
      if (missing.length > 0) reject(new Error(`Missing prerequisites: ${missing.join(', ')}`));
      else resolve({ student, course });
    }, 10);
  });
}

function checkSeats(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data.course.seats <= 0) reject(new Error(`Course ${data.course.code} is full`));
      else resolve(data);
    }, 10);
  });
}

function registerStudent({ student, course }) {
  return new Promise(resolve => {
    setTimeout(() => {
      course.seats -= 1;
      resolve({ studentId: student.id, studentName: student.name, course: course.code, status: 'REGISTERED' });
    }, 10);
  });
}

// Post-registration services. Flags let us simulate a failure.
function sendEmail(registration, fail = false) {
  return wait(15).then(() => {
    if (fail) throw new Error('SMTP server unavailable');
    return `Email sent to ${registration.studentName}`;
  });
}
function sendSMS(registration, fail = false) {
  return wait(15).then(() => {
    if (fail) throw new Error('SMS gateway timeout');
    return `SMS sent to ${registration.studentName}`;
  });
}
function writeAuditLog(registration, fail = false) {
  return wait(15).then(() => {
    if (fail) throw new Error('Audit database unreachable');
    return `Audit entry for ${registration.studentId}/${registration.course}`;
  });
}

// Part A - chain. Every .then RETURNS the next promise/value, otherwise the next stage gets undefined.
function registrationChain(studentId, courseCode) {
  let student;                                   // kept so the chain can pass both objects forward
  return getStudent(studentId)
    .then(found => {
      student = found;
      return getCourse(courseCode);              // return -> chain waits for it
    })
    .then(course => checkPrerequisites(student, course))   // resolves { student, course }
    .then(checkSeats)                                       // resolves same object
    .then(registerStudent);                                 // resolves confirmation
}

// Part A + B: full flow with catch/finally
function registerWithNotifications(studentId, courseCode, failures = {}) {
  console.log(`\n>> Registering student ${studentId} in ${courseCode}`);
  return registrationChain(studentId, courseCode)
    .then(registration => {
      console.log('   Registered:', JSON.stringify(registration));
      // Part B: all three start now, independently. allSettled never rejects, so one failure
      // cannot hide the status of the other two.
      return Promise.allSettled([
        sendEmail(registration, failures.email),
        sendSMS(registration, failures.sms),
        writeAuditLog(registration, failures.audit)
      ]).then(outcomes => {
        const names = ['Email', 'SMS', 'Audit'];
        return outcomes.map((o, i) => ({ service: names[i], status: o.status }));
      });
    })
    .then(report => {
      console.log('   Service report:', JSON.stringify(report));
      return report;
    })
    .catch(error => {
      console.log('   Registration FAILED:', error.message);
      return null;
    })
    .finally(() => {
      console.log('   (finally: workflow finished)');
    });
}

// Part C - two independent course servers
function serverA(code) {
  return wait(40).then(() => { throw new Error('Server A is down'); });
}
function serverB(code) {
  return wait(80).then(() => ({ ...courses[code], source: 'Server B' }));
}
function serverC(code) {
  return wait(20).then(() => ({ ...courses[code], source: 'Server C' }));
}

function getCourseFromAnyServer(code, servers) {
  // Promise.any: first FULFILLED result. A fast failure (Server A) is ignored.
  // Promise.race would return Server A's rejection simply because it settled first.
  return Promise.any(servers.map(server => server(code)));
}

export {
  getStudent, getCourse, checkPrerequisites, checkSeats, registerStudent,
  sendEmail, sendSMS, writeAuditLog, registrationChain, registerWithNotifications, getCourseFromAnyServer
};

if (import.meta.url === `file://${process.argv[1]}`) {
  // Scenarios run strictly one after another (async IIFE-free: chained promises)
  registerWithNotifications(101, 'CS401', { sms: true })
    .then(() => registerWithNotifications(999, 'CS401'))
    .then(() => registerWithNotifications(102, 'CS401'))
    .then(() => registerWithNotifications(101, 'CS402'))
    .then(() => registerWithNotifications(101, 'CS999'))
    .then(() => registerWithNotifications(101, 'CS401', { email: true, sms: true, audit: true }))
    .then(() => {
      console.log('\n>> Part C: Promise.any vs Promise.race');
      return Promise.race([serverA('CS401'), serverB('CS401')])
        .then(v => console.log('   race  ->', v))
        .catch(e => console.log('   race  -> REJECTED:', e.message, '(first to settle was a failure)'))
        .then(() => getCourseFromAnyServer('CS401', [serverA, serverB]))
        .then(v => console.log('   any   ->', JSON.stringify(v)))
        .then(() => getCourseFromAnyServer('CS401', [serverA, serverB, serverC]))
        .then(v => console.log('   any (3 servers, fastest success wins) ->', v.source))
        .then(() => getCourseFromAnyServer('CS401', [serverA, serverA]))
        .catch(e => console.log('   any (all fail) ->', e.constructor.name + ':', e.message, '| errors:', e.errors.map(x => x.message)));
    })
    .then(() => {
      console.log(`
WHY THESE COMBINATORS
- Part B uses Promise.allSettled: the three services are independent and we want the status of ALL of
  them. Promise.all would reject on the first failure and hide the others; race/any are for a single winner.
- Part C uses Promise.any: we want the first SUCCESSFUL server. Promise.race returns whichever settles
  first, even if that is a failure, so a fast but broken server would make the whole request fail.
  If every server fails, Promise.any rejects with an AggregateError holding all the reasons.
- Part A uses a plain chain because each stage depends on the previous stage's result.`);
    });
}
