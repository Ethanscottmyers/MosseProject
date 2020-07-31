import React, { useState } from "react";
import "./App.css";

function App() {
  const [apiResponse, setAPIResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // useEffect(() => {
  //   fetch(
  //     "http://localhost:9000/database-results?id=39E1DBE6E27576F37410FC3E1FE2B53AE250E1CA&curr=3&resSem=1&leeway=2&percent=1"
  //   )
  //     .then((res) => res.text())
  //     .then((res) => setAPIResponse(res));
  // });

  async function submitButton() {
    setSubmitted(true);
    console.log("in submitted");
    let res = await fetch(
      "http://localhost:9000/database-results?id=39E1DBE6E27576F37410FC3E1FE2B53AE250E1CA&curr=3&resSem=1&leeway=2&percent=1"
    );
    res = await res.text();
    setAPIResponse(res);
  }

  function clearButton() {
    setAPIResponse("");
    setSubmitted(false);
  }
  return (
    <div>
      <button onClick={submitButton}>Query</button>
      <button onClick={clearButton}>Clear</button>
      <p>{apiResponse}</p>
    </div>
  );
}

export default App;
