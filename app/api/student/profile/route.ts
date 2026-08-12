import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            education: true,
            skills: { include: { skill: true } },
            projects: true,
            experiences: true
          }
        },
        verifiedProfiles: true,
        resumes: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const activeResume = user.resumes && user.resumes.length > 0 ? user.resumes[0] : null;

    const verifiedGithub = user.verifiedProfiles.find((vp: any) => vp.platform === 'GITHUB');
    const verifiedLinkedin = user.verifiedProfiles.find((vp: any) => vp.platform === 'LINKEDIN');
    const verifiedCodolio = user.verifiedProfiles.find((vp: any) => vp.platform === 'CODOLIO');

    const profileData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.profile?.phone || '',
      college: user.profile?.college || '',
      department: user.profile?.department || '',
      year: user.profile?.year ? String(user.profile.year) : '',
      cgpa: '',
      githubUrl: user.profile?.githubUrl || '',
      linkedinUrl: user.profile?.linkedinUrl || '',
      codolioUrl: user.profile?.codolioUrl || '',
      verifiedGitHub: !!verifiedGithub,
      verifiedLinkedIn: !!verifiedLinkedin,
      verifiedCodolio: !!verifiedCodolio,
      activeResume: activeResume ? {
        id: activeResume.id,
        filename: activeResume.fileName || activeResume.originalName,
        fileUrl: activeResume.fileUrl,
        uploadedAt: activeResume.uploadedAt
      } : null,
      skills: user.profile?.skills?.map((ps: any) => ps.skill.name) || [],
      education: user.profile?.education || [],
      projects: user.profile?.projects || [],
      experiences: user.profile?.experiences || []
    };

    return NextResponse.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch student profile.' }, { status: 500 });
  }
}
