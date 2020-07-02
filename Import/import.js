const fs = require("fs");
const mysql = require("mysql2");
const parse = require("csv-parse/lib/sync");
const { assert } = require("console");

class Grade {
  constructor(term, catalogNumber, grade, subject) {
    this.term = term;
    this.catalogNumber = catalogNumber;
    this.grade = grade;
    this.subject = subject;
  }
}

Grade.prototype.toString = () => {
  return `Class grade: Term ${this.term}, catalog number ${this.catalogNumber}, subject ${this.subject}, grade ${this.grade}.`;
};

class Student {
  constructor(id, startTerm) {
    this.id = id;
    this.startTerm = startTerm;
    this.grades = new Array(0);
  }
}

var students = {};

//CSV FILE IS IN .GITIGNORE. Not permitted to be uploaded to internet.
fs.readFile("classes_taken.csv", (err, data) => {
  if (err) throw err;
  console.log("File opened successfully.");
  const records = parse(data, {
    columns: true,
  });

  for (let i = 0; i < records.length; i++) {
    let record = records[i];
    let id = record["Analytics ID"];
    let term = parseInt(record["Academic Term Code"], 10);
    let catalogNumber = parseInt(record["Catalog Number"], 10);
    let subject = record["Subject Code"];
    let grade = record["Final Grade Code"];
    let student;

    if (!(id in students)) {
      student = new Student(id, term);
      students[id] = student;
    } else {
      student = students[id];
    }

    if (student["startTerm"] > term) {
      student["startTerm"] = term;
    }

    student.grades.push(new Grade(term, catalogNumber, grade, subject));
  }

  console.log("number of records: " + records.length);
  console.log("number of students: " + Object.keys(students).length);

  //Get rid of students who have COE grades
  var csStudents = deleteCOE(students);
  console.log("number of CS only students: " + csStudents.length);

  //Calculate how far into each student's history each of their classes are.
  for (let student of csStudents) {
    calcSemesters(student);
  }
});

function deleteCOE(students) {
  var csStudents = [];
  const values = Object.values(students);
  for (student of values) {
    let onlyCS = true;
    for (let grade of student.grades) {
      if (grade.subject === "COE") {
        onlyCS = false;
      }
    }
    if (onlyCS) {
      csStudents.push(student);
    }
  }
  return csStudents;
}

//Calculates how many semesters after the student's first semester each of their classes was,
//using PeopleSoft's term naming convention.
function calcSemesters(student) {
  const start = [
    Math.floor(student.startTerm / 1000), //century (1 is 1900-1999, 2 is 2000-2999)
    Math.floor((student.startTerm / 10) % 100), //last two digits of current school year (fall of 2017-18 is 18)
    Math.floor(student.startTerm % 10), //code for term (1-fall, 4-spring, 7-summer)
  ];
  //shouldn't have any grades before 2000
  if (start[0] === 1) throw "Term " + student.startTerm + " is invalid";
  for (grade of student.grades) {
    let sems;
    let curr = [
      Math.floor(grade.term / 1000),
      Math.floor((grade.term / 10) % 100),
      Math.floor(grade.term % 10),
    ];
    //shouldn't have any grades before 2000
    if (curr[0] === 1) throw "Term " + grade.term + " is invalid";

    //for every school year curr is after start, the number of semesters increases by 3
    sems = (curr[1] - start[1]) * 3;
    switch (start[2]) {
      case 1:
        if (curr[2] === 4) {
          sems += 1;
        } else if (curr[2] === 7) {
          sems += 2;
        }
        break;
      case 4:
        if (curr[2] === 1) {
          sems -= 1;
        } else if (curr[2] === 7) {
          sems += 1;
        }
        break;
      case 7:
        if (curr[2] === 1) {
          sems -= 2;
        } else if (curr[2] === 4) {
          sems -= 1;
        }
    }
    assert(sems >= 0, "Current semester is before start semester!");
    grade.termsFromStudentStart = sems;
  }
}
