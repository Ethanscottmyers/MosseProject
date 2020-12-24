import React, { useState, useRef } from "react";
import Papa from "papaparse";
import History from "./History.js";
import DBResults from "./DBResults.js";
import Student from "./Student.js";
import Grade from "./Grade.js";
import "./App.css";

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
  const [id, setID] = useState("");
  const [currentSemesterSTR, setCurrentSemester] = useState(2201);
  const [resultSemesterSTR, setResultSemester] = useState(3);
  const [semLeewaySTR, setSemLeeway] = useState(1);
  const [gradeLeewaySTR, setGradeLeeway] = useState(1);
  const [onlyMandatorySTR, setOnlyMandatory] = useState("true");
  const [onlyCompletedSTR, setOnlyCompleted] = useState("false");
  const [displayResults, setDisplayResults] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [termsFromStudentStart, setTermsFromStudentStart] = useState(-1);
  const fileInput = useRef(null);

  async function submitButton(event) {
    event.preventDefault();
    setDisplayResults(false);
    let history = await parseFileAsync(fileInput.current.files[0]);
    let currentStudents = convertToStudents(history);
    let currentSemester = parseInt(currentSemesterSTR);

    setCurrentStudent(currentStudents[id]);

    let termsFromStudentStart = currentSemester - currentStudents[id].startTerm;
    termsFromStudentStart = Math.floor(
      (termsFromStudentStart - Math.floor(termsFromStudentStart / 10)) / 3
    );
    setTermsFromStudentStart(termsFromStudentStart);

    // //get cluster centers.
    // query = `SELECT * FROM DetRatioClusterGrades ORDER BY cluster, catalogNumber`;
    // res = await axios.post(`http://localhost:9000/database-results`, {
    //   query: query,
    // });
    // setClusterCenters(res.data);

    setDisplayResults(true);
  }

  function clearButton() {
    setID("");
    setCurrentSemester(2201);
    setResultSemester(3);
    setSemLeeway(1);
    setGradeLeeway(1);
    setOnlyMandatory("true");
    setOnlyCompleted("false");
    setDisplayResults(false);
    setCurrentStudent(null);
    setTermsFromStudentStart(-1);
  }

  return (
    <div className="App">
      <form onSubmit={submitButton}>
        <label htmlFor="studentID">StudentID:&nbsp;</label>
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
          What is the current semester (in PeopleSoft notation, i.e.
          2201)?&nbsp;
        </label>
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
          looking?&nbsp;
        </label>
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
          <br />0 means courses must match exactly.&nbsp;
        </label>
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
          grades must match exactly.&nbsp;
        </label>
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
        <label htmlFor="mandatory">Use Only Mandatory Courses:&nbsp;</label>
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
          Only include students who completed all mandatory CS courses:&nbsp;
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
        <History
          student={currentStudent}
          termsFromStudentStart={termsFromStudentStart}
        />
      )}
      <br />
      <br />
      {displayResults && (
        <DBResults
          style={{ margin: 50 }}
          MANDATORYCOURSES={MANDATORYCOURSES}
          currentStudent={currentStudent}
          id={id}
          resultSemester={parseInt(resultSemesterSTR)}
          semLeeway={parseInt(semLeewaySTR)}
          gradeLeeway={parseInt(gradeLeewaySTR)}
          mandatory={onlyMandatorySTR === "true"}
          completed={onlyCompletedSTR === "true"}
          termsFromStudentStart={termsFromStudentStart}
        />
      )}
    </div>
  );
}

export default App;
