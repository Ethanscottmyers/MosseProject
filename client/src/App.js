import React, { useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./App.css";

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
    this.grades = new Array(0);
  }
}

const mandatoryCourses = [401, 441, 445, 447, 449, 1501, 1502, 1550];

function convertToStudents(history) {
  let currentStudents = {};

  for (let record of history) {
    let studentID = record.studentID;
    let catalogNumber = parseInt(record.catalogNumber);
    let term = parseInt(record.term);
    let grade = record.grade;
    let student;

    if (!(studentID in currentStudents)) {
      student = new Student(studentID, term);
      currentStudents[studentID] = student;
    } else {
      student = currentStudents[studentID];
    }
    if (student.startTerm > term) {
      student.startTerm = term;
    }
    student.grades.push(new Grade(term, catalogNumber, grade));
  }

  //Now find termsFromStudentStart for all grades
  let ids = Object.keys(currentStudents);
  for (let i = 0; i < ids.length; i++) {
    let currentStudent = currentStudents[ids[i]];
    for (let record of currentStudent.grades) {
      let difference = record.term - currentStudent.startTerm;
      difference = Math.floor((difference - Math.floor(difference / 10)) / 3);
      record.termsFromStudentStart = difference;
    }
  }

  return currentStudents;
}

function parseFileAsync(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results, file) => {
        resolve(results.data);
      },
      error: (error, file) => {
        reject(error);
      },
    });
  });
}

function App() {
  const [apiResponse, setAPIResponse] = useState("");
  const [id, setID] = useState("");
  const [currentSemesterSTR, setCurrentSemester] = useState(0);
  const [resultSemesterSTR, setResultSemester] = useState(0);
  const [leewaySTR, setLeeway] = useState(0);
  const [percentDifferenceSTR, setPercentDifference] = useState(0.0);
  const [onlyMandatorySTR, setOnlyMandatory] = useState("true");
  const fileInput = useRef(null);

  async function submitButton(event) {
    setAPIResponse("");
    event.preventDefault();
    try {
      let history = await parseFileAsync(fileInput.current.files[0]);
      let currentStudents = convertToStudents(history);
      let currentSemester = parseInt(currentSemesterSTR);
      let resultSemester = parseInt(resultSemesterSTR);
      let leeway = parseInt(leewaySTR);
      let percentDifference = parseFloat(percentDifferenceSTR);
      let mandatory = onlyMandatorySTR === "true";

      let query =
        `SELECT * FROM Grades WHERE termsFromStudentStart > ${currentSemester} AND termsFromStudentStart <= ${
          currentSemester + resultSemester
        } AND studentID IN \n` +
        `(SELECT studentID FROM Students WHERE studentID != '${id}'\n`;
      let student = currentStudents[id];
      let grades = student.grades;
      for (let i = 0; i < grades.length; i++) {
        let grade = grades[i];
        if (grade.termsFromStudentStart > currentSemester) continue;
        if (mandatory && !mandatoryCourses.includes(grade.catalogNumber))
          continue;
        query +=
          ` AND EXISTS (SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
          `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${leeway} ` +
          `AND IF((parseGrade('${grade.grade}') = 0 AND parseGrade(grade) = 0), TRUE, ` +
          `ABS(parseGrade('${grade.grade}') - parseGrade(grade)) / ((parseGrade('${grade.grade}')+parseGrade(grade))/2)` +
          `<= ${percentDifference}))\n`;
      }
      query += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
      // console.log(query);
      let res = await axios.post(`http://localhost:9000/database-results`, {
        query: query,
      });
      let result = "";
      for (let i = 0; i < res.data.length; i++) {
        let record = res.data[i];
        result = result.concat(
          `id: ${record.studentID}, catalogNumber: ${record.catalogNumber}, grade: ${record.grade}\n`
        );
      }
      setAPIResponse(result);
    } catch (error) {
      throw error;
    }
  }

  function clearButton() {
    setAPIResponse("");
    setID("");
    setCurrentSemester(0);
    setResultSemester(0);
    setLeeway(0);
    setPercentDifference(0);
    setOnlyMandatory("");
  }

  return (
    <div>
      <form onSubmit={submitButton}>
        <label htmlFor="studentID">StudentID: </label> <br />
        <input
          type="text"
          id="studentID"
          name="studentID"
          autoFocus
          value={id}
          onChange={(event) => {
            setID(event.target.value);
          }}
        />
        <br />
        <label htmlFor="currentSemester">
          How many semesters into this student's CS career are they?
        </label>
        <br />
        <input
          type="number"
          min="0"
          id="currentSemester"
          name="currentSemester"
          value={currentSemesterSTR}
          onChange={(event) => {
            setCurrentSemester(event.target.value);
          }}
        />
        <br />
        <label htmlFor="resultSemester">
          How many semesters into the future from the current semester are you
          looking?
        </label>
        <br />
        <input
          type="number"
          min="0"
          id="resultSemester"
          name="resultSemester"
          value={resultSemesterSTR}
          onChange={(event) => {
            setResultSemester(event.target.value);
          }}
        />
        <br />
        <label htmlFor="leeway">
          What is the largest allowable difference in semesters?
          <br />0 means courses must match exactly.
        </label>
        <br />
        <input
          type="number"
          id="leeway"
          name="leeway"
          value={leewaySTR}
          onChange={(event) => {
            setLeeway(event.target.value);
          }}
        />
        <br />
        <label htmlFor="percentDifference">
          What is the allowable percent difference in grades? <br /> 0 means
          grades must match exactly.
        </label>
        <br />
        <input
          type="number"
          step="any"
          id="percentDifference"
          name="percentDifference"
          value={percentDifferenceSTR}
          onChange={(event) => {
            setPercentDifference(event.target.value);
          }}
        />
        <br />
        <label htmlFor="mandatory">Use Only Mandatory Courses: </label>
        <input
          type="checkbox"
          id="mandatory"
          name="mandatory"
          checked={onlyMandatorySTR === "true"}
          onChange={(event) => {
            if (onlyMandatorySTR === "true") {
              event.target.checked = false;
              setOnlyMandatory("false");
            } else {
              event.target.checked = true;
              setOnlyMandatory("true");
            }
          }}
        />
        <br />
        <label htmlFor="file">Student History:</label>
        <br />
        <input type="file" ref={fileInput} />
        <br />
        <button type="submit">Submit</button>
        <button onClick={clearButton}>Clear</button>
      </form>
      <br />
      <br />
      <br />
      <div style={{ whiteSpace: "pre-wrap" }}>{apiResponse}</div>
    </div>
  );
}

export default App;
