import React, { useEffect, useState } from "react";
import MySankey from "./MySankey.js";
import axios from "axios";
import Select from "react-select";

/* 
Assumptions: Calculating the distance only relies on the mandatory CS courses.  
Only the student's last known time taking a course is used 
(i.e. if a student repeats a course, assume only the last time they took the course). 
Each student's data vector should be organized as Y = <GPA_(CS0401), Sem_(CS0401), 
GPA_(CS0441), Sem_(CS0441),...,GPA_(CS1550),Sem_(CS1550)> in order of ascending course number value.

For each student for each cluster:
1. Take the mean (which is the first line of the CSV) called M
3. Remove course columns from M and Y if the student did not take a course 
    (e.g. if a student did not take CS 1550, remove the columns corresponding to GPA_(CS1550) and Sem_(CS1550) 
    from all vectors and matrices).
3. Separate both M and Y into GPA and Sem only vectors in the same order organized above.
	M_g = <GPA_(CS0401), GPA_(CS0441),...> taken from the mean M
	M_t = <Sem_(CS0401), Sem_(CS0441),...> taken from the mean M
	Y_g = same format as M_g, but for the student's information Y
	Y_t = same format as M_t, but for the student's information Y
4.  The distance is calculated as sqrt[ sum over all corresponding column values
    (|(Y_g-M_g)*lambda^(|Y_t-M_t|)|^2) ], where lambda = 0.9 but can be changed in the future, 
    and |A| indicates the absolute value of A.
    */

const LAMBDA = 0.9;
const FORMULA_EXP = 2;

//Calculate the distance to each cluster mean using the above formula.
function calculateDistance(studentVector, clusterMean) {
  let M_g = [],
    M_t = [],
    Y_g = [],
    Y_t = [];
  if (studentVector.length !== clusterMean.length) {
    console.log(
      "ERROR! Student Vector " +
        studentVector +
        " is not the same length as mean vector " +
        clusterMean +
        "."
    );
    return -1;
  }
  for (let i = 0; i < studentVector.length; i++) {
    if (i % 2 === 0) {
      M_g.push(clusterMean[i]);
      Y_g.push(studentVector[i]);
    } else {
      M_t.push(clusterMean[i]);
      Y_t.push(studentVector[i]);
    }
  }
  //now vectors are seperated correctly. Calculate distance according to formula above.
  let sum = 0;
  for (let i = 0; i < M_g.length; i++) {
    sum += Math.pow(
      Math.abs((Y_g[i] - M_g[i]) * Math.pow(LAMBDA, Math.abs(Y_t[i] - M_t[i]))),
      FORMULA_EXP
    );
  }
  return Math.sqrt(sum);
}

//convert letter grade to number equivalent
function gradeToNum(grade) {
  let num;
  switch (grade) {
    case "A+":
    case "A":
      num = 4;
      break;
    case "A-":
      num = 3.75;
      break;
    case "B+":
      num = 3.25;
      break;
    case "B":
      num = 3;
      break;
    case "B-":
      num = 2.75;
      break;
    case "C+":
      num = 2.25;
      break;
    case "C":
      num = 2;
      break;
    case "T":
    case "S":
      num = 1.9;
      break;
    case "C-":
      num = 1.75;
      break;
    case "D+":
      num = 1.25;
      break;
    case "D":
      num = 1;
      break;
    case "D-":
      num = 0.75;
      break;
    //What to do about W, etc?
    case "F":
    default:
      num = 0;
  }
  return num;
}

//convert number to grade equivalent (as string)
function numToGrade(num) {
  let grade;
  if (num > 4) {
    return -1; //illegal argument
  } else if (num === 4) {
    grade = "A";
  } else if (num >= 3.75) {
    grade = "A-";
  } else if (num >= 3.25) {
    grade = "B+";
  } else if (num >= 3) {
    grade = "B";
  } else if (num >= 2.75) {
    grade = "B-";
  } else if (num >= 2.25) {
    grade = "C+";
  } else if (num >= 2) {
    grade = "C";
  } else if (num >= 1.75) {
    grade = "C-";
  } else if (num >= 1.25) {
    grade = "D+";
  } else if (num >= 1) {
    grade = "D";
  } else if (num >= 0.75) {
    grade = "D-";
  } else {
    grade = "F";
  }
  return grade;
}

//calculate average grade and average semesters for each course in coursesArray
function averageGradesSems(coursesArray) {
  for (let course of coursesArray) {
    // console.log(course.catalogNumber);
    if (course.grades.length !== course.sems.length) {
      console.log("ERROR! grades and sems not equal length!");
    }
    let totalGrade = 0;
    for (let i = 0; i < course.grades.length; i++) {
      totalGrade += gradeToNum(course.grades[i]);
    }
    course.averageGrade = totalGrade / course.grades.length;
    let totalSems = 0;
    for (let sem of course.sems) {
      totalSems += sem;
    }
    course.averageSems = totalSems / course.sems.length;
  }
}

function BestTraceResults(props) {
  const MANDATORYCOURSES = props.MANDATORYCOURSES;
  let currentStudent = props.currentStudent;
  let termsFromStudentStart = props.termsFromStudentStart;
  let numClusters = 4; //number of clusters for this method
  const [clusterDistancesArray, setClusterDistancesArray] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(-1);
  const [resultSemesterSTR, setResultSemester] = useState(3);
  const [displayFlag, setDisplayFlag] = useState(0); //0 -> display nothing; 1 -> display grid; 2 -> display Sankey
  const [catalogNumberSelected, setCatalogNumberSelected] = useState(null);
  const [queryResults, setQueryResults] = useState([]);

  //   const [clusterMeans, setClusterMeans] = useState(null);

  useEffect(() => {
    //Get cluster distance information
    async function initialize() {
      let studentVector = [];
      let studentCourses = {};
      currentStudent.grades.sort((a, b) => {
        return a.catalogNumber - b.catalogNumber;
      });
      for (let grade of currentStudent.grades) {
        if (MANDATORYCOURSES.includes(grade.catalogNumber)) {
          if (!(grade.catalogNumber in studentCourses)) {
            studentCourses[grade.catalogNumber] = true;
          }
          studentVector.push(gradeToNum(grade.grade));
          studentVector.push(grade.termsFromStudentStart);
        }
      }

      let res = await axios.post(`http://localhost:9000/database-results`, {
        query:
          "SELECT * FROM TraceClusterGrades ORDER BY cluster, catalogNumber;",
      });
      let clusterMeanArray = []; //2d array of cluster mean vectors
      for (let grade of res.data) {
        //if grade is of catalogNumber that student doesn't have, skip it
        if (grade.catalogNumber in studentCourses) {
          //if there isn't an array for this cluster yet, make one
          if (clusterMeanArray[grade.cluster] === undefined) {
            clusterMeanArray[grade.cluster] = [];
          }
          clusterMeanArray[grade.cluster].push(grade.grade);
          clusterMeanArray[grade.cluster].push(grade.termsFromStudentStart);
        }
      }
      let clusterDistances = [];
      for (let cluster = 0; cluster < numClusters; cluster++) {
        clusterDistances.push({
          distance: calculateDistance(studentVector, clusterMeanArray[cluster]),
          cluster: cluster,
          students: (
            await axios.post(`http://localhost:9000/database-results`, {
              query: `SELECT COUNT(*) AS count FROM Students WHERE traceCluster = ${cluster};`,
            })
          ).data[0].count,
        });
      }
      //Now clusterDistances should be filled with distances.
      clusterDistances.sort((a, b) => {
        if (a.distance < b.distance) {
          return -1;
        } else if (a.distance > b.distance) {
          return 1;
        } else {
          return 0;
        }
      });
      setClusterDistancesArray(clusterDistances);
    }
    initialize();
  }, [currentStudent, numClusters, MANDATORYCOURSES]);

  function chooseCluster(value) {
    setSelectedCluster(value.value);
  }

  async function sendQuery(query, setFunction) {
    let res = await axios.post(`http://localhost:9000/database-results`, {
      query: query,
    });
    setFunction(res.data);
  }

  function clickCourse(catalogNumber, e) {
    setDisplayFlag(2);
    setCatalogNumberSelected(catalogNumber);
  }

  function submitButton(event) {
    event.preventDefault();
    if (selectedCluster !== -1) {
      let resultSemester = parseInt(resultSemesterSTR);
      let sql = `SELECT * FROM Grades WHERE termsFromStudentStart > ${termsFromStudentStart} AND termsFromStudentStart <= ${
        termsFromStudentStart + resultSemester
      } AND studentID IN \n (SELECT studentID FROM Students WHERE traceCluster = ${selectedCluster});\n`;
      sendQuery(sql, setQueryResults);
      setDisplayFlag(1);
    }
  }

  function backButton(e) {
    setDisplayFlag(1);
    setCatalogNumberSelected(null);
  }

  //Set up options for drop-down menu
  let options = [{ value: -1, label: "Select a Cluster: " }];
  for (let i = 0; i < clusterDistancesArray.length; i++) {
    options.push({
      value: clusterDistancesArray[i].cluster,
      label: `Cluster ${clusterDistancesArray[i].cluster} (${
        clusterDistancesArray[i].students
      } students): Distance ${clusterDistancesArray[i].distance.toFixed(3)}`,
    });
  }

  let currentStudentCourses = [];
  for (let grade of currentStudent.grades) {
    if (!currentStudentCourses.includes(grade.catalogNumber)) {
      currentStudentCourses.push(grade.catalogNumber);
    }
  }

  let courses = {};
  //Group results by catalog number, keeping track of the semesters and grades
  for (let grade of queryResults) {
    if (currentStudentCourses.includes(grade.catalogNumber)) {
      continue;
    }
    let course;
    if (courses[grade.catalogNumber] == null) {
      course = {
        catalogNumber: grade.catalogNumber,
        sems: [],
        grades: [],
      };
      courses[grade.catalogNumber] = course;
    } else {
      course = courses[grade.catalogNumber];
    }
    course.sems.push(grade.termsFromStudentStart - termsFromStudentStart);
    course.grades.push(grade.grade);
  }
  //   let keys = Object.keys(courses);
  //   console.log("DEBUG: courses");
  //   for (let i = 0; i < keys.length; i++) {
  //     let course = courses[keys[i]];
  //     console.log(`${course.catalogNumber};
  //         Sems: ${course.sems};
  //         Grades: ${course.grades}`);
  //   }

  //convert results into array for easy indexing.
  let coursesArray = Object.keys(courses).map((catalogNumber) => {
    return courses[catalogNumber];
  });

  //calculate average grade and average semester for each course
  averageGradesSems(coursesArray);

  //sort results
  coursesArray.sort((a, b) => {
    if (
      MANDATORYCOURSES.includes(a.catalogNumber) &&
      !MANDATORYCOURSES.includes(b.catalogNumber)
    ) {
      return -1;
    } else if (
      !MANDATORYCOURSES.includes(a.catalogNumber) &&
      MANDATORYCOURSES.includes(b.catalogNumber)
    ) {
      return 1;
    } else if (a.catalogNumber < b.catalogNumber) {
      return -1;
    } else if (a.catalogNumber > b.catalogNumber) {
      return 1;
    } else {
      return 0;
    }
  });

  let cells = coursesArray.map((course) => {
    return (
      <>
        <td>
          <button onClick={(e) => clickCourse(course.catalogNumber, e)}>
            CS-{course.catalogNumber}
          </button>
        </td>
        <td>{course.grades.length}</td>
        <td>
          {numToGrade(course.averageGrade)} ({course.averageGrade.toFixed(2)})
        </td>
        <td>{course.averageSems.toFixed(2)}</td>
      </>
    );
  });

  let table = [];
  for (let i = 0; i < cells.length; i += 2) {
    //It is safe to do cells[i+1] since javascript just returns "undefined" if out of bounds
    table.push(
      <tr key={"Row " + Math.floor(i)}>
        {cells[i]}
        <td></td>
        {cells[i + 1]}
      </tr>
    );
  }
  return (
    <div>
      <form onSubmit={submitButton}>
        <label htmlFor="resultSemester">
          How many semesters into the future from the current semester are you
          looking?&nbsp;
        </label>
        <input
          type="number"
          min="0"
          id="resultSemester"
          name="resultSemester"
          value={resultSemesterSTR}
          onChange={(event) => {
            setResultSemester(event.target.value);
          }}
        />
        <br />

        <Select
          className="selectCluster"
          name="clusterChoice"
          onChange={chooseCluster}
          defaultValue={options[0]}
          options={options}
          menuPlacement="auto"
        />
        <br />
        <button type="submit">Submit</button>
      </form>

      {/* {selectedCluster !== -1 } */}
      <br />
      {displayFlag === 1 && (
        <div className="resultsTable">
          <table className="border">
            <thead>
              <tr>
                <th>Catalog Number: </th>
                <th># of Students: </th>
                <th>Average Grade: </th>
                <th>
                  Average # of <br />
                  Semesters Ahead:{" "}
                </th>
                <th></th>
                <th>Catalog Number: </th>
                <th># of Students: </th>
                <th>Average Grade: </th>
                <th>
                  Average # of <br />
                  Semesters Ahead:{" "}
                </th>
              </tr>
            </thead>
            <tbody>{table}</tbody>
          </table>
        </div>
      )}
      {displayFlag === 2 && (
        <div>
          <h3>CS-{catalogNumberSelected}</h3>
          <MySankey
            course={courses[catalogNumberSelected]}
            width={600}
            height={400}
            margin={50}
          />
          <br />
          <button onClick={backButton} className="back">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

export default BestTraceResults;
