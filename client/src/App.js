import React, { useState, useRef } from "react";
import Papa from "papaparse";
import History from "./History.js";
import DBResults from "./DBResults.js";
import Student from "./Student.js";
import Grade from "./Grade.js";
import Select from "react-select";
import "./App.css";
import DetRatioResults from "./DetRatioResults.js";
import BestTraceResults from "./BestTraceResults.js";

const MANDATORYCOURSES = [401, 441, 445, 447, 449, 1501, 1502, 1550];

function convertToStudents(history) {
  let currentStudents = {};

  for (let record of history) {
    let name = record.Name;
    let studentID = record["Analytics ID"];
    let catalogNumber = parseInt(record["Catalog Number"]);
    let term = parseInt(record["Academic Term Code"]);
    let grade = record["Final Grade Code"];
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

function currentSemester() {
  let d = new Date();
  let year = d.getFullYear();
  let millenium = Math.floor(year / 1000);
  let decadeYear = year % 100;
  let semester;
  if (d.getMonth() < 5) {
    semester = 4;
  } else if (d.getMonth() < 8) {
    semester = 7;
  } else {
    decadeYear += 1;
    semester = 1;
  }
  return millenium * 1000 + decadeYear * 10 + semester;
}

function App() {
  const [id, setID] = useState("");
  const [currentSemesterSTR, setCurrentSemester] = useState(currentSemester());
  const [displayResults, setDisplayResults] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [termsFromStudentStart, setTermsFromStudentStart] = useState(-1);
  const [results0Type, setResults0Type] = useState(-1); //-1 is nothing, 0 is db, 1 is ml1, 2 is ml2
  const [results1Type, setResults1Type] = useState(-1); //-1 is nothing, 0 is db, 1 is ml1, 2 is ml2
  const fileInput = useRef(null);
  const options = [
    { value: -1, label: "Select one:" },
    { value: 0, label: "Deterministic Method" },
    { value: 1, label: "Machine Learning Method 1" },
    { value: 2, label: "Machine Learning Method 2" },
  ];

  async function submitButton(event) {
    event.preventDefault();
    setDisplayResults(false);
    setResults0Type(-1);
    setResults1Type(-1);
    let history = await parseFileAsync(fileInput.current.files[0]);
    let currentStudents = convertToStudents(history);
    let currentSemester = parseInt(currentSemesterSTR);

    setCurrentStudent(currentStudents[id]);

    let termsFromStudentStart = currentSemester - currentStudents[id].startTerm;
    termsFromStudentStart = Math.floor(
      (termsFromStudentStart - Math.floor(termsFromStudentStart / 10)) / 3
    );
    setTermsFromStudentStart(termsFromStudentStart);

    setDisplayResults(true);
  }

  //When the dropdown changes, change the value of resultsType
  function onChange0(value) {
    setResults0Type(value.value);
  }
  function onChange1(value) {
    setResults1Type(value.value);
  }

  function results(type, side) {
    switch (type) {
      case -1:
        return;
      case 0:
        return (
          <DBResults
            style={{ margin: 50 }}
            MANDATORYCOURSES={MANDATORYCOURSES}
            currentStudent={currentStudent}
            termsFromStudentStart={termsFromStudentStart}
            side={side}
          />
        );
      case 1:
        return (
          // <h3>Machine Learning Algorithm 1 results</h3>
          <DetRatioResults
            style={{ margin: 50 }}
            MANDATORYCOURSES={MANDATORYCOURSES}
            currentStudent={currentStudent}
            termsFromStudentStart={termsFromStudentStart}
            side={side}
          />
        );
      case 2:
        // return <h3>Machine Learning Algorithm 2 results</h3>;
        return (
          <BestTraceResults
            style={{ margin: 50 }}
            MANDATORYCOURSES={MANDATORYCOURSES}
            currentStudent={currentStudent}
            termsFromStudentStart={termsFromStudentStart}
            side={side}
          />
        );
      default:
        console.log("Error!: Invalid result type");
    }
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
          2211)?&nbsp;
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
        <label htmlFor="file">Student History:</label>
        <br />
        <input type="file" ref={fileInput} />
        <br />
        <button type="submit">Submit</button>
        {/* <button onClick={clearButton}>Clear</button> */}
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
        <div className="resultsContainer">
          <div className="results">
            <Select
              className="select"
              name="results0"
              onChange={onChange0}
              defaultValue={options[0]}
              options={options}
              menuPlacement="auto"
            />
            <br />
            {results(results0Type, 0)}
          </div>
          <div className="results">
            <Select
              className="select"
              name="results1"
              onChange={onChange1}
              defaultValue={options[0]}
              options={options}
              menuPlacement="auto"
            />
            <br />
            {results(results1Type, 1)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
