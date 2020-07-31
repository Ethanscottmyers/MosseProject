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
  let curr = parseInt(req.query.curr);
  let resSem = parseInt(req.query.resSem);
  let leeway = parseInt(req.query.leeway);
  let percent = parseFloat(req.query.percent);
  connection.query(
    `SELECT * FROM Grades WHERE studentID = '${id}' AND termsFromStudentStart <= ${curr};`,
    (err, results, fields) => {
      if (err) throw err;
      if (isNull(results)) throw "Error! Invalid student ID. ";
      // historyQuery = `SELECT * FROM Grades WHERE studentID IN \n(SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
      historyQuery =
        `SELECT * FROM Grades WHERE termsFromStudentStart = ${
          curr + resSem
        } AND studentID IN \n` +
        `(SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
      for (let i = 0; i < results.length; i++) {
        //FIX DIVIDE BY ZERO
        let grade = results[i];
        historyQuery +=
          `(SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
          `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${leeway} ` +
          `AND IF(LEAST(parseGrade('${grade.grade}'), parseGrade(grade)) = 0, TRUE, ` +
          `(LEAST(parseGrade('${grade.grade}'), parseGrade(grade)) / GREATEST(parseGrade('${grade.grade}'), parseGrade(grade))) ` +
          `>= ${percent})) `;
        if (i < results.length - 1) {
          historyQuery += `AND EXISTS\n`;
        } else {
          // historyQuery += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
          historyQuery += `ORDER BY studentID);`;
        }
      }
      // console.log(historyQuery);
      connection.query(historyQuery, (err, results, fields) => {
        if (err) throw err;
        res.send(results);
      });
    }
  );
});

module.exports = router;
