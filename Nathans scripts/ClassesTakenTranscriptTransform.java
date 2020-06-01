import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.TreeSet;
import java.util.Scanner;

/**
 * A java command line script to take the reduced form of Classes Taken.xlsx, and convert them into single transcripts.
 * There are four flags that are available
 * -noCOE means any student who has ever taken a COE course is excluded from the resulting set
 * -allMandatory means any student who has not completed all mandatory courses is excluded from the resulting set
 * -mandatoryOnly means student transcripts will only contain mention of mandatory courses.  No electives will be included.
 * -time=<time> means which grade will be taken if repeats are found.  The options are "first", "last", "best", "average", "lastExceptFailing".  If the flag is not used, the default is all grades are reported.
 * -gpa means letter grades are converted to GPA values.
 * Finally, if the file name extension is ".elki", it will output a file that is formatted to allow ELKI to read it.  Note that this is only supported with all flags set, since ELKI requires each vector to be the same.  Other options may not gurantee this.
 * NOTE: Assumption is made that catalog number is sufficient to describe the class, when in fact, you need subject + catalog number.
 * @author Nathan Ong
 */
public class ClassesTakenTranscriptTransform
{
	private static final String[] MANDATORY_COURSES = new String[]{"0401","0441","0445","0447","0449","1501","1502","1550"}; //NOT GENERALIZED
	//private static final int MANDATORY_NUM_MIN = 401;
	//private static final int MANDATORY_NUM_MAX = 1550;
	private static final String CSV_DELIMITER = ",";
	private static final String ELKI_DELIMITER = " ";
	private static HashMap<String,Double> letterToGPA = new HashMap<>();		//letter grade to GPA converter

	private static boolean noCOECoursesFlag = false;		//removes students with any COE courses
	private static boolean allMandatoryCoursesFlag = false;		//removes students who have not taken all mandatory CS classes
	private static boolean mandatoryOnlyFlag = false;		//removes classes that are not mandatory CS courses
	private static int timeFlag = 0;				//can remove course repeats when set on the command line
	private static boolean elkiOutputFlag = false;			//outputs an elki-formatted input file
	private static String delimiter = ",";				//default delimiter
	private static boolean gpaFlag = false;				//converts letter grades into GPA values
	
	static
	{
		final String[] grades = new String[]{"A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"};
		final double[] gpaVals = new double[]{4.0, 4.0, 3.75, 3.25, 3.0, 2.75, 2.25, 2.0, 1.75, 1.25, 1.0, 0.75, 0.0};
		for(int i = 0; i < grades.length; i++)
		{
			letterToGPA.put(grades[i],gpaVals[i]);
		}
	}

	public static void main(String[] args)
	{
		//command line validation
		if(args.length <= 1)
		{
			if(args.length == 0 || !args[1].equals("-help"))
			{
				System.out.println("Usage:\tNAMEOFPROGRAM -help\n\tNAMEOFPROGRAM <input file> <output file> [-noCOE -allMandatory -mandatoryOnly]");
			}
			return;
		}
		else if(!args[0].endsWith(".csv") && !args[0].endsWith(".CSV"))
		{
			System.out.println(args[0] + " Input file needs to be a CSV file.");
			return;
		}
		
		if(args[1].endsWith(".elki") || args[1].endsWith(".ELKI"))
		{
			elkiOutputFlag = true;
			delimiter = ELKI_DELIMITER;
		}
		else if(!args[1].endsWith(".csv")  && !args[1].endsWith(".CSV"))
		{
			System.out.println("Output file type not recognized.  Defaulting to CSV-style file.");
			//delimiter = CSV_DELIMITER;
			//return;
		}
		final File inputFile = new File(args[0]);
		final File outputFile = new File(args[1]);
		if(!inputFile.exists() || !inputFile.isFile())
		{
			System.out.println("Input file does not exist.");
			return;
		}

		for(int i = 2; i < args.length; i++)
		{
			switch(args[i])
			{
				case "-noCOE":
					noCOECoursesFlag = true;
					break;
				case "-allMandatory":
					allMandatoryCoursesFlag = true;
					break;
				case "-mandatoryOnly":
					mandatoryOnlyFlag = true;
					break;
				case "-time=first":
					timeFlag = 1;
					break;
				case "-time=last":
					timeFlag = 2;
					break;
				case "-time=best":
					timeFlag = 3;
					break;
				case "-time=average":
					timeFlag = 4;
					break;
				case "-time=lastExceptFailing":
					timeFlag = 5;
					break;
				case "-gpa":
					gpaFlag = true;
					break;
				default:
					System.out.println("Flag " + args[i] + "not recognized");
					return;
			}
		}

		if(outputFile.exists())
		{
			if(outputFile.isFile())
			{
				System.out.print("Do you want to overwrite (Y/N)? ");
				final Scanner scan = new Scanner(System.in);
				if(!scan.nextLine().equalsIgnoreCase("Y"))
				{
					System.out.println("Aborting");
					return;
				}
			}
			else
			{
				System.out.println("Invalid output file");
				return;
			}
		}
		
		//transcript builder
		final HashMap<String,StringBuilder> studentToClasses = new HashMap<>();
		final HashMap<String,boolean[]> mandatoryClassTracker = new HashMap<>();
		final HashMap<String,HashMap<String,String[]>> timedTracker = new HashMap<>(); //Student ID --> (class --> {important factor (semester/grade/something else), row string})
		final HashSet<String> coeTracker = new HashSet<>();
		String header = "";

		try(final BufferedReader reader = new BufferedReader(new FileReader(inputFile)))
		{
			header = reader.readLine();
			String line = reader.readLine();
			while(line != null)
			{
				//skip blank lines
				if(line.isEmpty())
				{
					line = reader.readLine();
					continue;
				}
				final String[] vals = line.split(",");
				//only commas in the line
				if(vals.length == 0)
				{
					line = reader.readLine();
					continue;
				}

				switch(timeFlag)
				{
					case 0:
						final StringBuilder row = studentToClasses.containsKey(vals[0]) ? studentToClasses.get(vals[0]) : new StringBuilder();
						if(!mandatoryOnlyFlag || isMandatoryCourse(vals[2])) //NOT GENERALIZED: skip courses that are non-mandatory, if the flag is set
						{
							//not sufficient, given the ordering is not preserved correctly
							if(elkiOutputFlag)
							{
								row.append(delimiter + (gpaFlag ? (letterToGPA.containsKey(vals[vals.length-1]) ? letterToGPA.get(vals[vals.length-1]) : "0.0") : vals[vals.length-1]));
							}
							else
							{
								for(int i = 1; i < vals.length; i++)
								{
									//NOT GENERALIZED
									if(gpaFlag && i == 4)
									{
										row.append(delimiter + (letterToGPA.containsKey(vals[i]) ? letterToGPA.get(vals[i]) : "0.0"));
									}
									else
									{
										row.append(delimiter + vals[i]);
									}
								}
							}
							studentToClasses.put(vals[0],row);
						}
						break;
					case 2: //NOT GENERALIZED
						final HashMap<String,String[]> classToFactor = timedTracker.containsKey(vals[0]) ? timedTracker.get(vals[0]) : new HashMap<>();
						if(!mandatoryOnlyFlag || isMandatoryCourse(vals[2])) //skip courses that are non-mandatory, if the flag is set
						{
							if(!classToFactor.containsKey(vals[2]) || classToFactor.get(vals[2])[0].compareTo(vals[1]) < 0) //either does not exist, or the semester is later than the other instance
							{
								String rowStr = "";
								if(elkiOutputFlag)
								{
									rowStr += delimiter + (gpaFlag ? (letterToGPA.containsKey(vals[vals.length-1]) ? letterToGPA.get(vals[vals.length-1]) : "0.0") : vals[vals.length-1]);
								}
								else
								{
									for(int i = 1; i < vals.length; i++)
									{
										//NOT GENERALIZED
										if(gpaFlag && i == 4)
										{
											rowStr += delimiter + (letterToGPA.containsKey(vals[i]) ? letterToGPA.get(vals[i]) : "0.0");
										}
										else
										{
											rowStr += delimiter + vals[i];
										}
									}

								}
								classToFactor.put(vals[2],new String[]{vals[1],rowStr});
								timedTracker.put(vals[0],classToFactor);
							}
						}
						break;
					default:
						throw new UnsupportedOperationException("Not yet implemented!");
				}

				if(allMandatoryCoursesFlag)
				{
					final boolean[] mandatoryCourseCheck = mandatoryClassTracker.containsKey(vals[0]) ? mandatoryClassTracker.get(vals[0]) : new boolean[MANDATORY_COURSES.length];
					for(int i = 1; i < vals.length; i++)
					{
						for(int j = 0; j < MANDATORY_COURSES.length; j++)
						{
							if(vals[i].equals(MANDATORY_COURSES[j]) && vals[i+1].equals("CS")) //NOT GENERALIZED
							{
								mandatoryCourseCheck[j] = true;
								break;
							}
						}
					}
					mandatoryClassTracker.put(vals[0],mandatoryCourseCheck);
				}

				if(noCOECoursesFlag)
				{
					for(int i = 1; i < vals.length; i++)
					{
						if(vals[i].equals("COE"))
						{
							coeTracker.add(vals[0]);
							break;
						}
					}
				}
				
				line = reader.readLine();
			}
		}
		catch(final IOException e)
		{
			System.err.println("Error while reading input file.");
			e.printStackTrace();
			return;
		}

		if(timeFlag != 0)
		{
			for(final String studentID : new TreeSet<String>(timedTracker.keySet())) //sort in lexicographic order
			{
				final StringBuilder row = new StringBuilder();
				//if(!mandatoryOnlyFlag || isMandatoryCourse(vals[2])) //NOT GENERALIZED: skip courses that are non-mandatory, if the flag is set
				//{
					final HashMap<String,String[]> classToFactor = timedTracker.get(studentID);
					//sorting by class num
					for(final String classNum : new TreeSet<String>(classToFactor.keySet())) // sort by class num value
					{
						row.append(classToFactor.get(classNum)[1]);
					}
					studentToClasses.put(studentID,row);
				//}
			}
		}

		//write out to file
		//also skip students that do not satisfy constraints from flags set
		try(final FileWriter writer = new FileWriter(outputFile))
		{
			if(elkiOutputFlag)
			{
				//writer.write("#" + header + "\n#");
				writer.write("#");
				for(final String classNum : MANDATORY_COURSES)
				{
					writer.write(classNum + " ");
				}
				writer.write("\n");
			}
			//else
			//{
			//	writer.write(header + "\n");
			//}
			for(final String key : studentToClasses.keySet())
			{
				//removes students who do not satisfy constraints
				if((!noCOECoursesFlag || !hasCOECourses(coeTracker, key)) && (!allMandatoryCoursesFlag || hasAllMandatoryCourses(mandatoryClassTracker, key)))
				{
					if(elkiOutputFlag)
					{
						writer.write(studentToClasses.get(key).toString().trim() + "\n");
						System.out.println(studentToClasses.get(key).toString().trim());
					}
					else
					{
						writer.write(key + studentToClasses.get(key) + "\n");
					}
				}
			}
			writer.flush();
		}
		catch(final IOException e)
		{
			System.err.println("Error while writing to output file.");
			e.printStackTrace();
		}
	}

	private static boolean isMandatoryCourse(final String courseNum)
	{
		for(final String mandatoryCourseNum : MANDATORY_COURSES)
		{
			if(mandatoryCourseNum.equals(courseNum))
			{
				return true;
			}
		}
		return false;
	}

	private static boolean hasCOECourses(final HashSet<String> coeTracker, final String key)
	{
		return coeTracker.contains(key);
	}

	private static boolean hasAllMandatoryCourses(final HashMap<String,boolean[]> mandatoryClassTracker, final String key)
	{
		for(final boolean b : mandatoryClassTracker.get(key))
		{
			if(!b)
			{
				return false;
			}
		}
		return true;
	}
}
