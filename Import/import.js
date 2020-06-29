const fs = require("fs");
const mysql = require("mysql2");
const parse = require("csv-parse/lib/sync");

class Grade {
  constructor(term, catalogNumber, grade, subject) {
    this.term = term;
    this.catalogNumber = catalogNumber;
    this.grade = grade;
    this.subject = subject;
  }
}

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
    let grade = parseGrade(record["Final Grade Code"]);
    let student;

    if (!(id in students)) {
      student = new Student(id, term);
      students[id] = student;
    } else {
      student = students[id];
    }

    if (i < 100) {
      console.log(grade);
    }
    if (student["startTerm"] > term) {
      student["startTerm"] = term;
    }

    student.grades.push(new Grade(term, catalogNumber, grade, subject));
  }
  console.log("number of records: " + records.length);
  console.log("number of students: " + Object.keys(students).length);
});

function parseGrade(grade) {
  let num;
  switch (grade) {
    case "A+":
    case "A":
      num = 4;
      break;
    case "A-":
      num = 3.75;
      break;
    case "B+":
      num = 3.25;
      break;
    case "B":
      num = 3;
      break;
    case "B-":
      num = 2.75;
      break;
    case "C+":
      num = 2.25;
      break;
    case "C":
      num = 2;
      break;
    case "C-":
      num = 1.75;
      break;
    case "D+":
      num = 1.25;
      break;
    case "D":
      num = 1;
      break;
    case "D-":
      num = 0.75;
      break;
    case "F":
      num = 0;
      break;
    default:
      num = 0;
  }
  return num;
}
