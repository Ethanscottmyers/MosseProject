const mysql = require("mysql2");
const readline = require("readline");
const { isNull } = require("util");

const log = require("why-is-node-running");

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
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

rl.question("Enter Student ID: ", (id) => {
  rl.question("Enter current student's semester: ", (sem) => {
    rl.question("Enter number of semesters leeway: ", (leeway) => {
      rl.question("Enter grade ratio allowed: ", (percent) => {
        rl.close();
        connection.query(
          `SELECT * FROM Grades WHERE studentID = '${id}' AND termsFromStudentStart <= ${sem}`,
          (err, results, fields) => {
            if (err) throw err;
            if (isNull(results)) throw "Error! Invalid student ID. ";
            console.log("num results: " + results.length);
            // historyQuery = `SELECT * FROM Grades WHERE studentID IN \n(SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
            historyQuery = `SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
            for (let i = 0; i < results.length; i++) {
              let grade = results[i];
              historyQuery +=
                `(SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
                `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${leeway} ` +
                `AND (LEAST(parseGrade('${grade.grade}'), parseGrade(grade)) / GREATEST(parseGrade('${grade.grade}'), parseGrade(grade))) >= ${percent}) `;
              if (i < results.length - 1) {
                historyQuery += `AND EXISTS\n`;
              } else {
                // historyQuery += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
                historyQuery += `ORDER BY studentID;`;
              }
            }
            console.log(historyQuery);
            connection.query(historyQuery, (err, results, fields) => {
              if (err) throw err;
              console.log("num history results: " + results.length);
              console.log(results);
              connection.end();
            });
            // connection.end();
          }
        );
      });
    });
  });
});
