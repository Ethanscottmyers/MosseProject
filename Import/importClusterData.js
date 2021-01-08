const fs = require("fs");
const mysql = require("mysql2");
const parse = require("csv-parse/lib/sync");

// fs.readFile("courses.csv", (err, data) => {
//   if (err) throw err;
//   console.log("File opened successfully.");
//   const records = parse(data, {
//     columns: true,
//   });

//   const connection = mysql.createConnection({
//     host: "localhost",
//     port: "3406",
//     user: "root",
//     password: "password",
//     database: "GradePredictorDB",
//   });

//   let query = "INSERT INTO Courses (catalogNumber, title) VALUES ?";
//   let values = generateValues(records);

//   connection.query(query, [values], (err, results, fields) => {
//     if (err) throw err;
//     console.log("Inserted classes into database.");
//     console.log(results);
//     connection.end();
//   });
// });

// function generateValues(records) {
//   result = [];
//   for (let i = 0; i < records.length; i++) {
//     result.push([records[i]["Catalog Number"], records[i]["Class Title"]]);
//   }
//   return result;
// }

function importCluster(path, clusterNum, clusterType, connection) {
  const data = fs.readFileSync(path);
  console.log("File opened successfully.");
  const records = parse(data, {
    columns: [
      "studentID",
      "GPA_401",
      "SEM_401",
      "GPA_441",
      "SEM_441",
      "GPA_445",
      "SEM_445",
      "GPA_447",
      "SEM_447",
      "GPA_449",
      "SEM_449",
      "GPA_1501",
      "SEM_1501",
      "GPA_1502",
      "SEM_1502",
      "GPA_1550",
      "SEM_1550",
    ],
  });

  let query = "";
  if (clusterType === "DetRatio") {
    //First row is the cluster mean, insert into relevant cluster grades table
    query +=
      "INSERT INTO DetRatioClusterGrades (cluster, catalogNumber, grade, termsFromStudentStart) VALUES";
    query += `(${clusterNum}, 401, ${records[0]["GPA_401"]}, ${records[0]["SEM_401"]}), 
                (${clusterNum}, 441, ${records[0]["GPA_441"]}, ${records[0]["SEM_441"]}), 
                (${clusterNum}, 445, ${records[0]["GPA_445"]}, ${records[0]["SEM_445"]}), 
                (${clusterNum}, 447, ${records[0]["GPA_447"]}, ${records[0]["SEM_447"]}),
                (${clusterNum}, 449, ${records[0]["GPA_449"]}, ${records[0]["SEM_449"]}), 
                (${clusterNum}, 1501, ${records[0]["GPA_1501"]}, ${records[0]["SEM_1501"]}), 
                (${clusterNum}, 1502, ${records[0]["GPA_1502"]}, ${records[0]["SEM_1502"]}), 
                (${clusterNum}, 1550, ${records[0]["GPA_1550"]}, ${records[0]["SEM_1550"]});
                `;
    for (let i = 1; i < records.length; i++) {
      query += `UPDATE Students SET detRatioCluster = ${clusterNum} WHERE studentID = '${records[i]["studentID"]}';\n`;
    }
  } else if (clusterType === "Trace") {
    //First row is the cluster mean, insert into relevant cluster grades table
    query +=
      "INSERT INTO TraceClusterGrades (cluster, catalogNumber, grade, termsFromStudentStart) VALUES";
    query += `(${clusterNum}, 401, ${records[0]["GPA_401"]}, ${records[0]["SEM_401"]}), 
                (${clusterNum}, 441, ${records[0]["GPA_441"]}, ${records[0]["SEM_441"]}), 
                (${clusterNum}, 445, ${records[0]["GPA_445"]}, ${records[0]["SEM_445"]}),
                (${clusterNum}, 447, ${records[0]["GPA_447"]}, ${records[0]["SEM_447"]}), 
                (${clusterNum}, 449, ${records[0]["GPA_449"]}, ${records[0]["SEM_449"]}), 
                (${clusterNum}, 1501, ${records[0]["GPA_1501"]}, ${records[0]["SEM_1501"]}), 
                (${clusterNum}, 1502, ${records[0]["GPA_1502"]}, ${records[0]["SEM_1502"]}), 
                (${clusterNum}, 1550, ${records[0]["GPA_1550"]}, ${records[0]["SEM_1550"]});
                `;
    for (let i = 1; i < records.length; i++) {
      query += `UPDATE Students SET traceCluster = ${clusterNum} WHERE studentID = '${records[i]["studentID"]}';\n`;
    }
  } else {
    throw `Invalid Cluster Type: ${clusterType}`;
  }
  return query;
}

const connection = mysql.createConnection({
  host: "localhost",
  port: "3406",
  user: "root",
  password: "password",
  database: "GradePredictorDB",
  multipleStatements: true,
});
connection.query(
  "DELETE FROM DetRatioClusterGrades; DELETE FROM TraceClusterGrades;",
  (err, results, fields) => {
    if (err) throw err;
    console.log(results);
    let path = "C:/Users/ethan/Documents/Pitt/Capstone/";
    let detPath = path + "Best Det Ratio Clusters/";
    let tracePath = path + "Best Trace WiB Clusters/";
    let query = "BEGIN;";
    //import detRatio clusters
    for (let i = 0; i <= 6; i++) {
      query += importCluster(
        detPath + `cluster_${i}.csv`,
        i,
        "DetRatio",
        connection
      );
    }
    //import trace wib clusters
    for (let i = 0; i <= 3; i++) {
      query += importCluster(
        tracePath + `cluster_${i}.csv`,
        i,
        "Trace",
        connection
      );
    }
    query += "COMMIT;";
    connection.query(query, (err, results, fields) => {
      if (err) throw err;
      console.log("Clusters added to database");
      connection.end();
    });
  }
);
