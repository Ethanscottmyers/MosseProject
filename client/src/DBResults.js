/*
    Display the given results. 
*/

import React, { useState } from "react";
import MySankey from "./MySankey.js";
import axios from "axios";
// import Student from "./Student.js";

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

async function DBResults(props) {
  const [displayAllResults, setDisplayAllResults] = useState(true);
  const [catalogNumberSelected, setCatalogNumberSelected] = useState(null);
  const MANDATORYCOURSES = props.MANDATORYCOURSES;
  let currentStudent = props.currentStudent;
  let id = props.id;
  let resultSemester = props.resultSemester;
  let semLeeway = props.semLeeway;
  let gradeLeeway = props.gradeLeeway;
  let mandatory = props.mandatory;
  let completed = props.completed;
  let termsFromStudentStart = props.termsFromStudentStart;

  let query =
    `SELECT * FROM Grades WHERE termsFromStudentStart > ${termsFromStudentStart} AND termsFromStudentStart <= ${
      termsFromStudentStart + resultSemester
    } AND studentID IN \n` +
    `(SELECT studentID FROM Students WHERE studentID != '${id}'\n`;
  if (completed) {
    query += ` AND allMandatory = true\n`;
  }
  let grades = currentStudent.grades;
  for (let i = 0; i < grades.length; i++) {
    let grade = grades[i];
    if (grade.termsFromStudentStart > termsFromStudentStart) continue;
    if (mandatory && !MANDATORYCOURSES.includes(grade.catalogNumber)) continue;
    query +=
      `AND EXISTS (SELECT 1 FROM Grades WHERE Grades.studentID = Students.studentID AND catalogNumber = ${grade.catalogNumber} ` +
      `AND ABS(termsFromStudentStart - ${grade.termsFromStudentStart}) <= ${semLeeway} ` +
      `AND ABS(parseGrade('${grade.grade}') - parseGrade(grade)) <= ${gradeLeeway})\n`;
    // `AND ABS(parseGrade('${grade.grade}') - parseGrade(grade)) / ((parseGrade('${grade.grade}')+parseGrade(grade))/2)` +
    // `<= ${percentDifference}))\n`;
  }
  query += `\n) ORDER BY studentID ASC, catalogNumber ASC, term ASC;`;
  // console.log(query);
  let res = await axios.post(`http://localhost:9000/database-results`, {
    query: query,
  });

  let queryResults = res.data;

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

  function clickCourse(catalogNumber, e) {
    setDisplayAllResults(false);
    setCatalogNumberSelected(catalogNumber);
  }

  function backButton(e) {
    setDisplayAllResults(true);
    setCatalogNumberSelected(null);
  }

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
      {displayAllResults && (
        <div id="results">
          Number of matching students: {queryResults.length}
          <table>
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
      {!displayAllResults && (
        <div>
          <h3>CS-{catalogNumberSelected}</h3>
          <MySankey
            course={courses[catalogNumberSelected]}
            width={600}
            height={400}
          />
          <button onClick={backButton} className="back">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

export default DBResults;
