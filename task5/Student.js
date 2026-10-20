// Student.js - default export: the Student class

export default class Student {
  constructor(id, name, courses = []) {
    this.id = id;
    this.name = name;
    this.courses = courses;
  }

  get marksList() {
    return this.courses.map(course => course.marks);
  }

  toString() {
    return `Student #${this.id} ${this.name} (${this.courses.length} courses)`;
  }
}
