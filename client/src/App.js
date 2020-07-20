import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  const [apiResponse, setAPIResponse] = useState("");

  useEffect(() => {
    fetch("http://localhost:9000/testAPI")
      .then((res) => res.text())
      .then((res) => setAPIResponse(res));
  });

  return (
    <div className="App">
      <p className="App-intro">{apiResponse}</p>
    </div>
  );
}

export default App;
