var mysql = require("mysql2");

var connection = mysql.createConnection({
    host: "localhost", 
    port: 3406,
    user: "root", 
    password: "password", 
    database: "GradePredictorDB"
});

connection.connect((err) => {
    if (err) throw err;
    console.log("MySQL database connected. ");
    // connection.query("Select * from Classes", (err, result, fields) => {
    //     if (err) throw err;
    //     console.log(result);
    // });
    connection.end();
});