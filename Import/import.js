const fs = require("fs");
const mysql = require("mysql2");
const { EWOULDBLOCK } = require("constants");

class Grade {
  constructor(term, catalogNumber, grade) {
    this.term = term;
    this.catalogNumber = catalogNumber;
    this.grade = grade;
  }
}

class Student {
  constructor(id, startTerm) {
    this.id = id;
    this.startTerm = startTerm;
    this.grades = new Array(1);
  }
}

var students = {};

fs.readFile("../../../classes_taken.csv", (err, data) => {
  if (err) throw err;
  console.log("File opened successfully.");
});
