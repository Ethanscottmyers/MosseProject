var express = require("express");
var router = express.Router();
var mysql = require("mysql2");

var data;

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

connection.query("SELECT * FROM Grades", (err, results, fields) => {
  if (err) throw err;
  console.log(results[0]);
  data = "";
  for (let i = 0; i < results.length; i++) {
    data += JSON.stringify(results[i]);
    data += "\n";
  }
  // console.log(fields);
});

router.get("/", (req, res, next) => {
  res.send(data);
});

module.exports = router;
