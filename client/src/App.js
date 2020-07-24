import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [apiResponse, setAPIResponse] = useState("");

  useEffect(() => {
    fetch("http://localhost:9000/testAPI?id=1&sem=3&leeway=1&percent=1 ")
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
