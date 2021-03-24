import React from "react";

// function gradeArrayToString(a) {
//   let result = "[";
//   for (let i = 0; i < a.length; i++) {
//     if (a[i] == null) {
//       result += `null, `;
//     } else {
//       result += `${a[i].term}/${a[i].catalogNumber}/${a[i].grade}, `;
//     }
//   }
//   result += "]";
//   return result;
// }

// function GradeArray2dToString(a) {
//   //   console.log("start GradeArray2dToString: " + a.length);
//   //   console.log("is array: " + Array.isArray(a));
//   let result = "[";
//   for (let i = 0; i < a.length; i++) {
//     result += "[";
//     // console.log("col is array: " + Array.isArray(a[i]));
//     if (a[i] != null) {
//       //   console.log("row " + i);
//       for (let j = 0; j < a[i].length; j++) {
//         let grade = a[i][j];
//         if (grade != null) {
//           //   console.log("col " + j);
//           result += `${grade.term}/${grade.catalogNumber}/${grade.grade}, `;
//         } else {
//           //   console.log("col null");
//           result += `blank, `;
//         }
//         // console.log("result so far: " + result);
//       }
//       result += "]\n";
//     } else {
//       //   console.log("row null");
//       result += "null\n";
//     }
//   }
//   result += "]";
//   return result;
// }

function arrayTranspose(a) {
  let newArray = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] != null) {
      for (let j = 0; j < a[i].length; j++) {
        if (newArray[j] == null) {
          newArray[j] = [];
        }
        newArray[j][i] = a[i][j];
      }
    }
  }
  return newArray;
}

function History(props) {
  const MANDATORYCOURSES = [401, 441, 445, 447, 449, 1501, 1502, 1550];
  let student = props.student;
  let startTerm = student.startTerm;
  //sort by catalog number, with mandatory courses taking precedence.
  student.grades.sort((a, b) => {
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

  //build table as 2d array. Horizontal is term, vertical is just number of courses in that term
  //easier to build table the other way, then transpose.
  let courseTableByTerm = [];
  //   let maxRowLength = 0;
  for (let grade of student.grades) {
    let difference = grade.term - startTerm;
    difference = Math.floor((difference - Math.floor(difference / 10)) / 3);
    grade.termsFromStudentStart = difference;
    if (courseTableByTerm[difference] == null) {
      courseTableByTerm[difference] = [];
    }
    //since grades is sorted by catalogNumber, term bins will also be sorted by catalog number.
    courseTableByTerm[difference].push(grade);
  }
  //now table is correctly set up, with each row representing the number of terms since the student started.
  let courseTable = arrayTranspose(courseTableByTerm);
  let maxRowLength = 0; //in order to do the headers correctly, it's useful to know the max row length
  for (let i = 0; i < courseTable.length; i++) {
    if (courseTable[i] != null && courseTable[i].length > maxRowLength) {
      maxRowLength = courseTable[i].length;
    }
  }
  //Generate table JSX
  let tableHeader = [];
  for (let i = 0; i < maxRowLength; i++) {
    tableHeader.push(<th key={"header " + i}>Term {i}</th>);
  }

  // let table = courseTable.map((row, i) => {
  //   let rowJSX = row.map((grade) => {
  //     return (
  //       <td key={"Term " + i + ", catalog " + grade.catalogNumber}>
  //         {grade.catalogNumber}, {grade.grade}, {grade.term}
  //       </td>
  //     );
  //   });
  //   return <tr key={"Row Term " + i}>{rowJSX}</tr>;
  // });

  let table = [];
  for (let i = 0; i < courseTable.length; i++) {
    let row = courseTable[i];
    let rowJSX = [];
    for (let j = 0; j < row.length; j++) {
      let grade = row[j];
      if (grade != null) {
        rowJSX.push(
          <td key={"Term " + i + ", catalog " + grade.catalogNumber}>
            {grade.catalogNumber}, {grade.grade}, {grade.term}
          </td>
        );
      } else {
        rowJSX.push(<td key={"Term " + i + ", null " + j}></td>);
      }
    }
    table.push(<tr key={"Row Term " + i}>{rowJSX}</tr>);
  }

  return (
    <div id="history">
      <h3>{student.name}</h3>
      <br />
      <h4>Terms from start: {props.termsFromStudentStart}</h4>
      <table className="border">
        <tbody>
          <tr key="headerRow">{tableHeader}</tr>
          {table}
        </tbody>
      </table>
    </div>
  );
}

export default History;
