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

class Student {
  constructor(id, startTerm) {
    this.id = id;
    this.startTerm = startTerm;
    this.grades = new Array(0);
  }
}

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

function checkDebugFlag() {
  if (process.argv.length > 2) {
    if (process.argv[2] !== "-d") {
      throw "Error! Correct usage: 'node import.js' or 'node import.js -d' for debug mode.";
    } else {
      return true;
    }
  } else {
    return false;
  }
}
const DEBUG = checkDebugFlag();

//First, check to makes sure tables are empty.
connection.query("SELECT * FROM Grades", (err, results, fields) => {
  if (err) throw err;
  if (results.length !== 0) {
    throw "ERROR! Table Grades contains data. Script should only be run if table is empty.";
  }
  connection.query("SELECT * FROM Students", (err, results, fields) => {
    if (err) throw err;
    if (results.length !== 0) {
      throw "ERROR! Table Students contains data. Script should only be run if table is empty.";
    }
    //Now that we know tables are empty, we can read in the data and format it.
    //NOTE: CSV FILE IS IN .GITIGNORE. Not permitted to be uploaded to internet.
    fs.readFile("classes_taken.csv", (err, data) => {
      if (err) throw err;
      if (DEBUG) console.log("File opened successfully.");
      const records = parse(data, {
        columns: true,
      });
      if (DEBUG) console.log("number of records: " + records.length);

      let students = convertToStudents(records);
      if (DEBUG)
        console.log("number of students: " + Object.keys(students).length);

      //Get rid of students who have COE grades
      let csStudents = deleteCOE(students);
      if (DEBUG)
        console.log("number of CS only students: " + csStudents.length);

      //Calculate how far into each student's history each of their classes are.
      for (let student of csStudents) {
        calcSemesters(student);
      }

      let studentSQL = "INSERT INTO Students (studentID, startTerm) VALUES ?";
      let studentValues = generateStudentValues(csStudents);

      let gradeSQL =
        "INSERT INTO Grades (catalogNumber, studentID, grade, term) VALUES ?";
      let gradeValues = generateGradeValues(csStudents);

      //Insert student values into database
      connection.query(studentSQL, [studentValues], (err, results, fields) => {
        if (err) throw err;
        if (DEBUG) console.log(results);
        //Then insert grade values into database.
        connection.query(gradeSQL, [gradeValues], (err, results, fields) => {
          if (err) throw err;
          if (DEBUG) console.log(results);
          connection.end();
        });
      });
    });
  });
});

//Converts CSV file records into an object that contains Students using their ID as keys.
function convertToStudents(records) {
  let students = {};

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
  return students;
}

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
//using PeopleSoft's term naming convention. Summer counts as the same as fall or spring.
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

//Generate sql insert code for student table using array of students provided.
function generateStudentValues(students) {
  let result = [];
  for (let i = 0; i < students.length; i++) {
    result.push([students[i].id, students[i].startTerm]);
  }
  return result;
}

//Generate sql insert code for grades table using array of students provided
function generateGradeValues(students) {
  let result = [];
  console.log(students.length);
  for (let i = 0; i < students.length; i++) {
    let student = students[i];
    for (let j = 0; j < student.grades.length; j++) {
      let grade = student.grades[j];
      result.push([grade.catalogNumber, student.id, grade.grade, grade.term]);
    }
  }
  return result;
}
