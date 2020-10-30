import React, { useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

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
    //What to do about W, S/NC, etc?
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

//Generate svg rectangle from node data. copied from https://reactviz.holiday/sankey/
const SankeyNode = ({ name, x0, x1, y0, y1, color }) => (
  <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={color}>
    <title>{name}</title>
  </rect>
);

//Generate svg link from link data. copied from https://reactviz.holiday/sankey/
const SankeyLink = ({ link, color }) => (
  <path
    d={sankeyLinkHorizontal()(link)}
    style={{
      fill: "none",
      strokeOpacity: ".3",
      stroke: color,
      strokeWidth: Math.max(1, link.width),
    }}
  />
);

function MySankey({ grades, catalogNumber, width, height }) {}

export default MySankey;
