import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: { orderBy: { startYear: 'desc' } },
        projects: { orderBy: { id: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        skills: { include: { skill: true } },
      },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId },
        include: { education: true, projects: true, experiences: true, skills: { include: { skill: true } } },
      });
    }
    return NextResponse.json({ data: profile });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    
    const { name, ...profileData } = body;

    // Extract valid profile fields to prevent Prisma errors
    const validProfileData: Record<string, any> = {
      phone: profileData.phone,
      department: profileData.department,
      year: profileData.year,
      section: profileData.section,
      college: profileData.college,
      location: profileData.location,
      careerObjective: profileData.careerObjective,
      linkedinUrl: profileData.linkedinUrl,
      githubUrl: profileData.githubUrl,
      portfolioUrl: profileData.portfolioUrl,
      codolioUrl: profileData.codolioUrl,
      
      // Personal Information
      dob: profileData.dob,
      nationality: profileData.nationality,
      country: profileData.country,
      state: profileData.state,
      preferredLocation: profileData.preferredLocation,
      pinCode: profileData.pinCode,

      // Career Information
      preferredRole: profileData.preferredRole,
      expectedSalary: profileData.expectedSalary,

      // School Education
      tenthSchool: profileData.tenthSchool,
      tenthPercentage: profileData.tenthPercentage,
      twelfthSchool: profileData.twelfthSchool,
      twelfthPercentage: profileData.twelfthPercentage,

      // College Education
      collegeName: profileData.collegeName,
      cgpa: profileData.cgpa,
      collegeJoiningYear: profileData.collegeJoiningYear ? parseInt(profileData.collegeJoiningYear) : profileData.collegeJoiningYear,
      collegeGraduationYear: profileData.collegeGraduationYear ? parseInt(profileData.collegeGraduationYear) : profileData.collegeGraduationYear,
      major: profileData.major,
      minor: profileData.minor,

      // Work Preferences
      previousWorkMode: profileData.previousWorkMode,
      preferredWorkMode: profileData.preferredWorkMode,
    };

    // Remove undefined fields
    Object.keys(validProfileData).forEach(key => {
      if (validProfileData[key] === undefined) {
        delete validProfileData[key];
      }
    });

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    const updated = await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...validProfileData },
      update: validProfileData,
    });
    return NextResponse.json({ data: updated });
  } catch (error) { 
    console.error('Profile Update Error:', error);
    return NextResponse.json({ message: 'Error updating profile' }, { status: 500 }); 
  }
}

