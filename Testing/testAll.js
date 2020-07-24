const mysql = require("mysql2/promise");
const { isNull } = require("util");

const pool = mysql.createPool({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

async function testAll() {
  let sem = 3,
    leeway = 1,
    percent = 0.9;
  const [ids] = await pool.query("SELECT * FROM Students");
  for (let i = 0; i < ids.length; i++) {
    let id = ids[i].studentID;
    const [grades] = await pool.query(
      `SELECT * FROM Grades WHERE studentID = '${id}' AND termsFromStudentStart <= ${sem}`
    );
    if (isNull(grades)) throw "Error! Invalid student ID. ";
    // historyQuery = `SELECT * FROM Grades WHERE studentID IN \n(SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
    historyQuery = `SELECT studentID FROM Students WHERE studentID != '${id}' AND EXISTS \n`;
    for (let i = 0; i < grades.length; i++) {
      let grade = grades[i];
      historyQuery +=
        `(SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
        `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${leeway} ` +
        `AND (LEAST(parseGrade('${grade.grade}'), parseGrade(grade)) / GREATEST(parseGrade('${grade.grade}'), parseGrade(grade))) >= ${percent}) `;
      if (i < grades.length - 1) {
        historyQuery += `AND EXISTS\n`;
      } else {
        // historyQuery += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
        historyQuery += `ORDER BY studentID;`;
      }
    }
    const [results] = await pool.query(historyQuery);
    if (results.length > 0) {
      console.log("ID: " + id);
      console.log("num history results: " + results.length + "\n");
    }
  }
  pool.end();
}

testAll();
