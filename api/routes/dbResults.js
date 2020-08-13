var express = require("express");
var router = express.Router();
var mysql = require("mysql2");
const { isNull } = require("util");

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
});

router.post("/", (req, res, next) => {
  // let id = req.body.id;
  // let curr = parseInt(req.body.curr);
  // let resSem = parseInt(req.body.resSem);
  // let leeway = parseInt(req.body.leeway);
  // let percent = parseFloat(req.body.percent);
  let query = req.body.query;
  connection.query(query, (err, results, fields) => {
    if (err) throw err;
    // let s = "";
    // Object.keys(results).forEach((key) => {
    //   s = s.concat(JSON.stringify(results[key]) + "\n");
    // });
    // res.send(s);
    res.send(results);
  });
});

module.exports = router;
