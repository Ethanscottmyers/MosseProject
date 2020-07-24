var express = require("express");
var router = express.Router();
var mysql = require("mysql2");
const { isNull } = require("util");

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

router.get("/", (req, res, next) => {
  let id = req.query.id;
  let sem = req.query.sem;
  let leeway = req.query.leeway;
  let percent = req.query.percent;
  connection.query(
    `SELECT * FROM Grades WHERE studentID = '${id}' AND termsFromStudentStart <= ${sem};`,
    (err, results, fields) => {
      if (err) throw err;
      if (isNull(results)) throw "Error! Invalid student ID. ";
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
      connection.query(historyQuery, (err, results, fields) => {
        if (err) throw err;
        res.send(results);
      });
    }
  );
});

module.exports = router;
