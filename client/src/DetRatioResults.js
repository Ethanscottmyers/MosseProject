import React, { useEffect, useState } from "react";
import MySankey from "./MySankey.js";
import axios from "axios";
import Select from "react-select";
import mahalanobis from "mahalanobis";

/* 
Assumptions: Calculating the distance only relies on the mandatory CS courses.  
Only the student's last known time taking a course is used (i.e. if a student repeats a course, 
assume only the last time they took the course).  Each student's data vector should be organized as 
Y = <GPA_(CS0401), Sem_(CS0401), GPA_(CS0441), Sem_(CS0441),...,GPA_(CS1550),Sem_(CS1550)> 
in order of ascending course number value.

For each student for each cluster:
1. Take the mean (which is the first line of the CSV) called M
2. Put everything else (mean excluded) in a matrix called X
3. Remove course columns from M, X, and Y if the student did not take a course 
    (e.g. if a student did not take CS 1550, remove the columns corresponding to GPA_(CS1550) and Sem(CS1550) 
    from all vectors and matrices).
3. Caculate the pseudoinverse of the covariance matrix of X called cov(X)^-1
4. The distance is calculated as sqrt((Y-M)*(cov(X)^-1)*(Y-M))
  This is also called the Mahalanobis distance
*/
//Calculate the distance to each cluster mean using the above formula.
function calculateDistance(studentVector, matrix) {
  //studentVector = Y, matrix = X. All are arrays (matrix is 2d) of the form specified above.
  let m = mahalanobis(matrix);
  return m.distance(studentVector);
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

function DetRatioResults(props) {
  const MANDATORYCOURSES = props.MANDATORYCOURSES;
  let currentStudent = props.currentStudent;
  let termsFromStudentStart = props.termsFromStudentStart;
  let side = props.side;
  let numClusters = 7; //number of clusters for this method
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

      let sql =
        `SELECT s.studentID AS studentID, catalogNumber, grade, termsFromStudentStart, detRatioCluster AS cluster\n` +
        `FROM Grades g INNER JOIN Students s ON g.studentID = s.studentID \n` +
        `WHERE catalogNumber IN (${MANDATORYCOURSES}) AND detRatioCluster IS NOT NULL\n` +
        `ORDER BY studentID, termsFromStudentStart`;

      let clusterStudents = await axios.post(
        `http://localhost:9000/database-results`,
        {
          query: sql,
        }
      );
      //need to generate and set up cluster data matrices as array of matrices where masterMatrix[i] = matrix for cluster i
      //first, gather data in object by studentID
      let gradesByStudent = {};
      for (let gradeData of clusterStudents.data) {
        if (gradeData.catalogNumber in studentCourses) {
          if (!(gradeData.studentID in gradesByStudent)) {
            gradesByStudent[gradeData.studentID] = {
              cluster: gradeData.cluster,
              grades: {},
            };
          }
          //grades is an object instead of an array so that duplicates are overwritten with no extra complexity
          //Since gradeData is sorted by termsFromStudentStart, the most recent grade will be the last one written
          gradesByStudent[gradeData.studentID].grades[
            gradeData.catalogNumber
          ] = {
            catalogNumber: gradeData.catalogNumber,
            grade: gradeData.grade,
            semester: gradeData.termsFromStudentStart,
          };
        }
      }

      //now that gradesByStudent is done, re-arrange all grades into the masterMatrix
      let masterMatrix = [];
      for (let studentID in gradesByStudent) {
        let student = gradesByStudent[studentID];
        student.grades = Object.values(student.grades); //turn object back into array so that it can be sorted
        student.grades.sort((a, b) => {
          return a.catalogNumber - b.catalogNumber;
        }); //objects have no order, so need to sort it.

        //if there is no matrix for this student's cluster yet, make one
        if (masterMatrix[student.cluster] === undefined) {
          masterMatrix[student.cluster] = [];
        }
        let tempStudentVector = []; //vector as described in distance formula
        for (let grade of student.grades) {
          //catalogNumber will be in MANDATORYCOURSES and a course that the target student took
          tempStudentVector.push(gradeToNum(grade.grade));
          tempStudentVector.push(grade.semester);
        }
        masterMatrix[student.cluster].push(tempStudentVector);
      }
      // console.log(studentVector);
      // console.log(masterMatrix);
      //masterMatrix is complete. Now we can finally compute distances
      let clusterDistances = [];
      for (let cluster = 0; cluster < numClusters; cluster++) {
        clusterDistances.push({
          distance: calculateDistance(studentVector, masterMatrix[cluster]),
          cluster: cluster,
          students: masterMatrix[cluster].length,
        });
      }
      //Now clusterDistances should be filled with distances.
      clusterDistances.sort((a, b) => {
        if (a.distance < b.distance || isNaN(b.distance)) {
          return -1;
        } else if (a.distance > b.distance || isNaN(a.distance)) {
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
      } AND studentID IN \n (SELECT studentID FROM Students WHERE DetRatioCluster = ${selectedCluster});\n`;
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
  let students = {};
  //Group results by catalog number, keeping track of the semesters and grades
  for (let grade of queryResults) {
    if (!(grade.studentID in students)) {
      students[grade.studentID] = true;
    }
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
        <label htmlFor={"resultSemester" + side}>
          How many semesters into the future from the current semester are you
          looking?&nbsp;
        </label>
        <input
          type="number"
          min="0"
          id={"resultSemester" + side}
          name={"resultSemester" + side}
          value={resultSemesterSTR}
          onChange={(event) => {
            setResultSemester(event.target.value);
          }}
        />
        <br />

        <label htmlFor={"completed" + side}>
          Only include students who completed all mandatory CS courses:&nbsp;
        </label>
        <input
          type="checkbox"
          id={"completed" + side}
          name={"completed" + side}
          checked={true}
          disabled
        />
        <Select
          className="selectCluster"
          name={"clusterChoice" + side}
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
          Number of matching students: {Object.keys(students).length}
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

export default DetRatioResults;
