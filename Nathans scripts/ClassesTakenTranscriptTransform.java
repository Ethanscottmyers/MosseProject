import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Scanner;

/* A java command line script to take the reduced form of Classes Taken.xlsx, and convert them into single transcripts.
 * There are three flags that are available
 * -noCOE means any student who has ever taken a COE course is excluded from the resulting set
 * -allMandatory means any student who has not completed all mandatory courses is excluded from the resulting set
 * -mandatoryOnly means student transcripts will only contain mention of mandatory courses.  No electives will be included.
 */
public class ClassesTakenTranscriptTransform
{
	private static boolean noCOECoursesFlag = false;		//removes students with any COE courses
	private static boolean allMandatoryCoursesFlag = false;		//removes students who have not taken all mandatory CS classes
	private static boolean mandatoryOnlyFlag = false;		//removes classes that are not mandatory CS courses

	private static final String[] MANDATORY_COURSES = new String[]{"401","441","445","447","449","1501","1502","1550"};
	private static final int MANDATORY_NUM_MIN = 401;
	private static final int MANDATORY_NUM_MAX = 1550;

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
		//else if(!args[1].endsWith(".csv")  && !args[1].endsWith(".CSV"))
		//{
		//	System.out.println("Output file needs to be a CSV file.");
		//	return;
		//}
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
		final HashSet<String> coeTracker = new HashSet<>();

		try(final BufferedReader reader = new BufferedReader(new FileReader(inputFile)))
		{
			//skip first line
			reader.readLine();
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
				final StringBuilder row = studentToClasses.containsKey(vals[0]) ? studentToClasses.get(vals[0]) : new StringBuilder();
				if(!mandatoryOnlyFlag || isMandatoryCourse(vals[2])) //NOT GENERALIZED: skip courses that are non-mandatory, if the flag is set
				{
					for(int i = 1; i < vals.length; i++)
					{
						row.append("," + vals[i]);
					}
					studentToClasses.put(vals[0],row);
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

		//write out to file
		//also skip students that do not satisfy constraints from flags set
		try(final FileWriter writer = new FileWriter(outputFile))
		{
			for(final String key : studentToClasses.keySet())
			{
				//removes students who do not satisfy constraints
				if((!noCOECoursesFlag || !hasCOECourses(coeTracker, key)) && (!allMandatoryCoursesFlag || hasAllMandatoryCourses(mandatoryClassTracker, key)))
				{
					writer.write(key + studentToClasses.get(key) + "\n");
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
