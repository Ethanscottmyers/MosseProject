var express = require("express");
var router = express.Router();
var mysql = require("mysql2");

var data;

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

connection.query(
  `SELECT Grades.studentID, startTerm, Grades.catalogNumber, title, term, termsFromStudentStart, grade 
  FROM Grades
  INNER JOIN Students ON Grades.studentID = Students.studentID
  INNER JOIN Courses ON Grades.catalogNumber = Courses.catalogNumber
  ORDER BY term ASC, Grades.catalogNumber ASC, Grades.studentID ASC`,
  (err, results, fields) => {
    if (err) throw err;
    data = `Number of rows returned: ${results.length}
    `;
    for (let i = 0; i < results.length; i++) {
      data += JSON.stringify(results[i]);
      data += "\n";
    }
    // console.log(fields);
  }
);

router.get("/", (req, res, next) => {
  res.send(data);
});

module.exports = router;
