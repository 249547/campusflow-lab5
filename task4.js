// Task 4 - University User Hierarchy and Dynamic `this`
// Person -> Student, FacultyMember. No closures used anywhere.

class Person {
  constructor(name, email) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('name must be a non-empty string');
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new TypeError('email must be a valid email string');
    }
    this.name = name;
    this.email = email;
  }

  introduce() {
    return `Hi, I am ${this.name} (${this.email}).`;
  }
}

class Student extends Person {
  constructor(name, email, rollNo, marks) {
    super(name, email);                      // must run before `this` is used
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) {
      throw new RangeError('marks must be between 0 and 100');
    }
    this.rollNo = rollNo;
    this.marks = marks;
  }

  introduce() {                              // override, reuses the parent version
    return `${super.introduce()} I am a student, roll no ${this.rollNo}.`;
  }

  getResult() {
    return this.marks >= 50 ? `${this.name}: PASS (${this.marks})` : `${this.name}: FAIL (${this.marks})`;
  }
}

class FacultyMember extends Person {
  constructor(name, email, employeeId, department) {
    super(name, email);
    this.employeeId = employeeId;
    this.department = department;
  }

  introduce() {
    return `${super.introduce()} I teach in the ${this.department} department (employee ${this.employeeId}).`;
  }
}

export { Person, Student, FacultyMember };

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('--- Runtime polymorphism ---');
  const users = [
    new Student('Ali', 'ali@au.edu.pk', '24-1001', 82),
    new FacultyMember('Dr. Sana', 'sana@au.edu.pk', 'E-77', 'CS'),
    new Student('Sara', 'sara@au.edu.pk', '24-1002', 45),
    new FacultyMember('Dr. Imran', 'imran@au.edu.pk', 'E-12', 'SE')
  ];
  users.forEach(user => console.log(user.introduce()));   // correct override chosen at runtime

  console.log('\n--- instanceof ---');
  const s = users[0];
  const f = users[1];
  console.log('Student instanceof Student      :', s instanceof Student);
  console.log('Student instanceof Person       :', s instanceof Person);
  console.log('Student instanceof FacultyMember:', s instanceof FacultyMember);
  console.log('Faculty instanceof Person       :', f instanceof Person);
  console.log('Student.getResult()             :', s.getResult(), '|', users[2].getResult());

  console.log('\n--- call(): guest borrows Person.introduce ---');
  const guest = { name: 'Dr. Ahmed', email: 'ahmed@example.com' };
  console.log(Person.prototype.introduce.call(guest));    // `this` = guest
  // guest has no Student behaviour; call() only supplies `this`.

  console.log('\n--- Detached method ---');
  const student = users[0];
  const fn = student.introduce;                            // method copied without its object
  try {
    console.log(fn());                                      // plain call: `this` is undefined (class bodies are strict)
  } catch (err) {
    console.log(`fn() failed -> ${err.name}: ${err.message}`);
  }
  console.log('Reason: `this` is decided by HOW a function is called, not where it was defined.');
  console.log('fn() has no object before the dot, so `this` is undefined in strict mode (class code is always strict).');

  console.log('\n--- bind(): permanently fixes `this` ---');
  const safe = student.introduce.bind(student);
  console.log(safe());
  const onOther = student.introduce.bind(guest);           // bind to a different object
  console.log('bound to guest:', onOther());
  console.log('bind cannot be overridden later:', safe.call(guest) === safe());

  console.log('\n--- Invalid input ---');
  const bad = [
    () => new Person('', 'a@b.c'),
    () => new Person('Zed', 'no-at-sign'),
    () => new Student('Zed', 'z@z.z', '1', 150)
  ];
  bad.forEach(make => {
    try { make(); } catch (err) { console.log(`${err.name}: ${err.message}`); }
  });

  console.log('\n--- new keyword ---');
  console.log('Calling a class without new:');
  try { Student('x', 'x@x.x', '1', 1); } catch (err) { console.log(`${err.name}: ${err.message}`); }
}
