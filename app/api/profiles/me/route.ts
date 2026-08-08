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
    const validProfileData = {
      phone: profileData.phone,
      department: profileData.department,
      year: profileData.year,
      section: profileData.section,
      college: profileData.college,
      location: profileData.location,
      careerObjective: profileData.careerObjective,
      linkedinUrl: profileData.linkedinUrl,
      githubUrl: profileData.githubUrl,
      portfolioUrl: profileData.portfolioUrl
    };

    // Remove undefined fields
    Object.keys(validProfileData).forEach(key => {
      if ((validProfileData as any)[key] === undefined) {
        delete (validProfileData as any)[key];
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

