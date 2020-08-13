import React, { useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./App.css";

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
  const [id, setID] = useState("1");
  const [currentSemester, setCurrentSemester] = useState(0);
  const [resultSemester, setResultSemester] = useState(0);
  const [leeway, setLeeway] = useState(0);
  const [percentDifference, setPercentDifference] = useState(0.0);
  const fileInput = useRef(null);

  async function submitButton(event) {
    setAPIResponse("");
    event.preventDefault();
    try {
      let history = await parseFileAsync(fileInput.current.files[0]);
      console.log(history);
      let res = await axios.get(
        `http://localhost:9000/database-results?id=${id}&curr=${currentSemester}&` +
          `resSem=${resultSemester}&leeway=${leeway}&percent=${percentDifference}`
      );
      setAPIResponse(res.data);
    } catch (error) {
      throw error;
    }
  }

  function clearButton() {
    setAPIResponse("");
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
          value={currentSemester}
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
          value={resultSemester}
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
          value={leeway}
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
          value={percentDifference}
          onChange={(event) => {
            setPercentDifference(event.target.value);
          }}
        />
        <br />
        <label htmlFor="file">Student History:</label>
        <br />
        <input type="file" ref={fileInput} />
        <br />
        <button type="submit">Submit</button>
      </form>
      <button onClick={clearButton}>Clear</button>
      <br />
      <br />
      <br />
      <div style={{ whiteSpace: "pre-wrap" }}>{apiResponse}</div>
    </div>
  );
}

export default App;
