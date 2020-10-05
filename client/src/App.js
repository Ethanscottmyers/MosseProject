import React, { useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import History from "./History.js";
import Results from "./Results.js";
import "./App.css";

class Grade {
  constructor(term, catalogNumber, grade) {
    this.term = term;
    this.catalogNumber = catalogNumber;
    this.grade = grade;
  }
}

class Student {
  constructor(name, id, startTerm) {
    this.name = name;
    this.id = id;
    this.startTerm = startTerm;
    this.grades = new Array(0);
  }
}

const MANDATORYCOURSES = [401, 441, 445, 447, 449, 1501, 1502, 1550];

function convertToStudents(history) {
  let currentStudents = {};

  for (let record of history) {
    let name = record.Name;
    let studentID = record.studentID;
    let catalogNumber = parseInt(record.catalogNumber);
    let term = parseInt(record.term);
    let grade = record.grade;
    let student;
    if (!(studentID in currentStudents)) {
      student = new Student(name, studentID, term);
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
  // console.log("return from convertToStudents " + typeof currentStudents);
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
  const [apiResponse, setAPIResponse] = useState(null);
  const [id, setID] = useState("");
  const [currentSemesterSTR, setCurrentSemester] = useState(2201);
  const [studentTerms, setStudentTerms] = useState(0);
  const [resultSemesterSTR, setResultSemester] = useState(3);
  const [semLeewaySTR, setSemLeeway] = useState(1);
  const [gradeLeewaySTR, setGradeLeeway] = useState(1);
  const [onlyMandatorySTR, setOnlyMandatory] = useState("true");
  const [onlyCompletedSTR, setOnlyCompleted] = useState("false");
  const [currentStudent, setCurrentStudent] = useState(null);
  const [displayResults, setDisplayResults] = useState(false);
  const fileInput = useRef(null);

  async function submitButton(event) {
    event.preventDefault();
    setAPIResponse(null);
    setDisplayResults(false);
    try {
      let history = await parseFileAsync(fileInput.current.files[0]);
      let currentStudents = convertToStudents(history);
      let currentSemester = parseInt(currentSemesterSTR);
      let resultSemester = parseInt(resultSemesterSTR);
      let semLeeway = parseInt(semLeewaySTR);
      let gradeLeeway = parseInt(gradeLeewaySTR);
      let mandatory = onlyMandatorySTR === "true";
      let completed = onlyCompletedSTR === "true";
      let student = currentStudents[id];
      setCurrentStudent(student);

      let termsFromStudentStart = currentSemester - student.startTerm;
      termsFromStudentStart = Math.floor(
        (termsFromStudentStart - Math.floor(termsFromStudentStart / 10)) / 3
      );
      setStudentTerms(termsFromStudentStart);

      let query =
        `SELECT * FROM Grades WHERE termsFromStudentStart > ${termsFromStudentStart} AND termsFromStudentStart <= ${
          termsFromStudentStart + resultSemester
        } AND studentID IN \n` +
        `(SELECT studentID FROM Students WHERE studentID != '${id}'\n`;
      if (completed) {
        query += ` AND allMandatory = true\n`;
      }
      let grades = student.grades;
      for (let i = 0; i < grades.length; i++) {
        let grade = grades[i];
        if (grade.termsFromStudentStart > termsFromStudentStart) continue;
        if (mandatory && !MANDATORYCOURSES.includes(grade.catalogNumber))
          continue;
        query +=
          `AND EXISTS (SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
          `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${semLeeway} ` +
          `AND ABS(parseGrade('${grade.grade}') - parseGrade(grade)) <= ${gradeLeeway})\n`;
        // `AND ABS(parseGrade('${grade.grade}') - parseGrade(grade)) / ((parseGrade('${grade.grade}')+parseGrade(grade))/2)` +
        // `<= ${percentDifference}))\n`;
      }
      query += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
      // console.log(query);
      let res = await axios.post(`http://localhost:9000/database-results`, {
        query: query,
      });
      // console.log("matching students: " + res.data.length);
      // let result = "";
      // for (let i = 0; i < res.data.length; i++) {
      //   let record = res.data[i];
      //   result = result.concat(
      //     `id: ${record.studentID}, catalogNumber: ${record.catalogNumber}, grade: ${record.grade}\n`
      //   );
      // }
      // setAPIResponse(result);
      setAPIResponse(res.data);
      setDisplayResults(true);
    } catch (error) {
      throw error;
    }
  }

  function clearButton() {
    setAPIResponse(null);
    setCurrentStudent(null);
    setStudentTerms(0);
    setID("");
    setCurrentSemester(2201);
    setResultSemester(3);
    setSemLeeway(1);
    setGradeLeeway(1);
    setOnlyMandatory("true");
    setOnlyCompleted("false");
    setDisplayResults(false);
  }

  return (
    <div className="App">
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
        <label htmlFor="semLeeway">
          What is the largest allowable difference in semesters?
          <br />0 means courses must match exactly.
        </label>
        <br />
        <input
          type="number"
          id="semLeeway"
          name="semLeeway"
          value={semLeewaySTR}
          onChange={(event) => {
            setSemLeeway(event.target.value);
          }}
        />
        <br />
        <label htmlFor="gradeLeeway">
          What is the largest allowable difference in grades? <br /> 0 means
          grades must match exactly.
        </label>
        <br />
        <input
          type="number"
          id="gradeLeeway"
          name="gradeLeeway"
          value={gradeLeewaySTR}
          onChange={(event) => {
            setGradeLeeway(event.target.value);
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
        <label htmlFor="completed">
          Only include students who completed all mandatory CS courses
        </label>
        <input
          type="checkbox"
          id="completed"
          name="completed"
          checked={onlyCompletedSTR === "true"}
          onChange={(event) => {
            if (onlyCompletedSTR === "true") {
              event.target.checked = false;
              setOnlyCompleted("false");
            } else {
              event.target.checked = true;
              setOnlyCompleted("true");
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
      {displayResults && (
        <History student={currentStudent} semester={studentTerms} />
      )}
      <br />
      <br />
      {displayResults && (
        <Results
          style={{ margin: 50 }}
          sem={studentTerms}
          queryResults={apiResponse}
          currentStudent={currentStudent}
          MANDATORYCOURSES={MANDATORYCOURSES}
        />
      )}
      {/* <div style={{ whiteSpace: "pre-wrap" }}>{apiResponse}</div> */}
    </div>
  );
}

export default App;
