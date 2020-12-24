import React from "react";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

// convert letter grade to number equivalent
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

//Generate node and link data from given data
function generateSankeyData(course) {
  let catalogNumberString = course.catalogNumber.toString();
  let graph = {
    nodes: [
      { name: catalogNumberString },
      { name: "A" },
      { name: "B" },
      { name: "C" },
      { name: "D" },
      { name: "F" },
    ],
    links: [],
  };
  //course contains two arrays: sems and grades. They should be parallel (so index 0 of sems and index 0 of
  //grades are for the same student)
  let semsList = {}; //list of grades sorted into buckets by their semester (# from the student's first semester)
  let maxSems = 0;
  //course.grades and course.sems should be same length
  for (let i = 0; i < course.grades.length; i++) {
    if (!(course.sems[i] in semsList)) {
      semsList[course.sems[i]] = [];
    }
    if (course.sems[i] > maxSems) {
      maxSems = course.sems[i];
    }
    semsList[course.sems[i]].push(course.grades[i]);
  }

  //for each semester number:
  for (let i of Object.keys(semsList)) {
    let sem = semsList[i];

    //count how many a's, b's, c's, d's, and f's are in that semester and calculate averages
    sem.as = 0;
    sem.bs = 0;
    sem.cs = 0;
    sem.ds = 0;
    sem.fs = 0;
    let totalGP = 0;
    let numGrades = 0;
    for (let grade of sem) {
      numGrades++;
      totalGP += gradeToNum(grade);
      switch (grade) {
        case "A+":
        case "A":
        case "A-":
          sem.as++;
          break;
        case "B+":
        case "B":
        case "B-":
          sem.bs++;
          break;
        case "C+":
        case "C":
        case "C-":
        case "T":
        case "S":
          sem.cs++;
          break;
        case "D+":
        case "D":
        case "D-":
          sem.ds++;
          break;
        default:
          sem.fs++;
      }
    }

    //add node for this semester and calculate average grade
    graph.nodes.push({ name: i.toString(), average: totalGP / numGrades });

    //add link to this semester
    graph.links.push({
      source: catalogNumberString,
      target: i.toString(),
      value: sem.length,
      ratio: sem.length / course.grades.length,
    });

    //Now that we have the counts for each grade, make the links
    if (sem.as !== 0) {
      graph.links.push({
        source: i.toString(),
        target: "A",
        value: sem.as,
        ratio: sem.as / sem.length,
      });
    }
    if (sem.bs !== 0) {
      graph.links.push({
        source: i.toString(),
        target: "B",
        value: sem.bs,
        ratio: sem.bs / sem.length,
      });
    }
    if (sem.cs !== 0) {
      graph.links.push({
        source: i.toString(),
        target: "C",
        value: sem.cs,
        ratio: sem.cs / sem.length,
      });
    }
    if (sem.ds !== 0) {
      graph.links.push({
        source: i.toString(),
        target: "D",
        value: sem.ds,
        ratio: sem.ds / sem.length,
      });
    }
    if (sem.fs !== 0) {
      graph.links.push({
        source: i.toString(),
        target: "F",
        value: sem.fs,
        ratio: sem.fs / sem.length,
      });
    }
  }
  // for (let node of graph.nodes) {
  //   console.log("Node: " + node.name + "\n");
  // }
  // for (let link of graph.links) {
  //   console.log(
  //     "Link: " + link.source + " -> " + link.target + ": " + link.value + "\n"
  //   );
  // }
  return graph;
}

//Generate svg rectangle from node data. copied from https://reactviz.holiday/sankey/
const SankeyNode = ({ name, x0, x1, y0, y1, color, average }) => {
  let newY = y0 + (y1 - y0) / 2;
  if (average == null) {
    return (
      <g>
        <rect
          x={x0}
          y={y0}
          width={x1 - x0}
          height={y1 - y0}
          fill={color}
          className="node"
        >
          <title>{name}</title>
        </rect>
        <text
          x={x1 + 6}
          y={newY}
          dy=".35em"
          textAnchor="start"
          transform={null}
        >
          {name}
        </text>
      </g>
    );
  } else {
    return (
      <g>
        <rect
          x={x0}
          y={y0}
          width={x1 - x0}
          height={y1 - y0}
          fill={color}
          className="node"
        >
          <title>{name}</title>
        </rect>
        <text
          x={x0 - 6}
          y={newY - 15}
          dy=".35em"
          textAnchor="end"
          transform={null}
        >
          {"Term " + name}
        </text>
        <text x={x0 - 6} y={newY} dy=".35em" textAnchor="end" transform={null}>
          {"Avg: " + average.toFixed(2)}
        </text>
        <text
          x={x0 - 6}
          y={newY + 15}
          dy=".35em"
          textAnchor="end"
          transform={null}
        >
          {"(" + numToGrade(average) + ")"}
        </text>
      </g>
    );
  }
};

//Generate svg path from link data. copied from https://reactviz.holiday/sankey/
const SankeyLink = ({ link, color }) => (
  <path
    d={sankeyLinkHorizontal()(link)}
    className="link"
    style={{
      stroke: color,
      strokeWidth: Math.max(1, link.width),
    }}
  >
    <title>
      {(link.ratio * 100).toFixed(2)}% of {link.source.name}
    </title>
  </path>
);

//returns string (in form "rgb(r, g, b)") based on grade (number 0-4) given. If negative number is given, return black
function colorByGrade(grade) {
  let r, g;
  if (grade < 0) {
    r = 0;
    g = 0;
  } else if (grade > 4) {
    r = 0;
    g = 255;
  } else {
    r = ((4 - grade) / 4) * 255;
    g = (grade / 4) * 255;
  }

  return `rgb(${r}, ${g}, 0)`;
}

function MySankey({ course, width, height }) {
  var graph = generateSankeyData(course);
  const { nodes, links } = sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .nodeId((d) => d.name)
    .extent([
      [1, 1],
      [width - 1, height - 5],
    ])
    .nodeSort(null)(graph);

  return (
    <svg width="100%" height="800">
      <g>
        {nodes.map((node, i) => {
          let color;
          switch (node.name) {
            case "A":
              color = colorByGrade(4);
              break;
            case "B":
              color = colorByGrade(3);
              break;
            case "C":
              color = colorByGrade(2);
              break;
            case "D":
              color = colorByGrade(1);
              break;
            case "F":
              color = colorByGrade(0);
              break;
            default:
              color = colorByGrade(-1);
          }
          if (node.average != null) {
            color = colorByGrade(node.average);
          }
          return (
            <SankeyNode
              {...node}
              color={color}
              key={node.name}
              average={node.average}
            />
          );
        })}
        {links.map((link, i) => {
          let color;
          switch (link.target.name) {
            case "A":
              color = colorByGrade(4);
              break;
            case "B":
              color = colorByGrade(3);
              break;
            case "C":
              color = colorByGrade(2);
              break;
            case "D":
              color = colorByGrade(1);
              break;
            case "F":
              color = colorByGrade(0);
              break;
            default:
              color = colorByGrade(-1);
          }
          if (link.target.average != null) {
            color = colorByGrade(link.target.average);
          }
          return <SankeyLink link={link} color={color} key={i} />;
        })}
      </g>
    </svg>
  );
}

export default MySankey;
