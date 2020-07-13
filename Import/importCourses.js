const fs = require("fs");
const mysql = require("mysql2");
const parse = require("csv-parse/lib/sync");

fs.readFile("courses.csv", (err, data) => {
  if (err) throw err;
  console.log("File opened successfully.");
  const records = parse(data, {
    columns: true,
  });

  const connection = mysql.createConnection({
    host: "localhost",
    port: "3406",
    user: "root",
    password: "password",
    database: "GradePredictorDB",
  });

  let query = "INSERT INTO Courses (catalogNumber, title) VALUES ?";
  let values = generateValues(records);

  connection.query(query, [values], (err, results, fields) => {
    if (err) throw err;
    console.log("Inserted classes into database.");
    console.log(results);
    connection.end();
  });
});

function generateValues(records) {
  result = [];
  for (let i = 0; i < records.length; i++) {
    result.push([records[i]["Catalog Number"], records[i]["Class Title"]]);
  }
  return result;
}
