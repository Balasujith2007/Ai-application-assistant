import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';

async function getMentor(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { user: null, status: 401 };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  if (!user) return { user: null, status: 401 };
  if (user.role !== 'MENTOR' && user.role !== 'HOD' && user.role !== 'ADMIN') {
    return { user: null, status: 403 };
  }
  return { user, status: 200 };
}

function calculateProfileCompletion(student: any): number {
  let score = 20; // Base score for account creation
  const p = student.profile;
  if (p?.registerNo) score += 10;
  if (p?.department) score += 10;
  if (p?.year) score += 10;
  if (p?.section) score += 10;
  if (p?.phone) score += 10;
  if (p?.skills && p.skills.length > 0) score += 15;
  if (student.resumes && student.resumes.length > 0) score += 15;
  return Math.min(100, score);
}

export async function GET(req: Request) {
  try {
    const { user: mentor, status } = await getMentor(req);
    if (!mentor) {
      return NextResponse.json(
        { message: status === 403 ? 'Forbidden: Mentor access required' : 'Unauthorized' },
        { status }
      );
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType') || 'assigned-career';
    const opportunityTypeFilter = (searchParams.get('opportunityType') || 'ALL').toUpperCase();
    const registrationStatusFilter = (searchParams.get('registrationStatus') || 'ALL').toUpperCase();
    const resumeStatusFilter = (searchParams.get('resumeStatus') || 'ALL').toUpperCase();

    // SERVER-SIDE SECURITY SCOPING:
    // Mentor can ONLY access students assigned to them.
    // Derived strictly from the authenticated session (mentor.id).
    const assignedStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        mentorId: mentor.id,
      },
      include: {
        profile: {
          include: {
            education: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
        },
        resumes: {
          where: { isActive: true },
          orderBy: { uploadedAt: 'desc' },
        },
        applications: {
          include: {
            opportunity: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        registrations: {
          include: {
            opportunity: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        interviews: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Compute Overall Summary Metrics across all assigned students
    const assignedStudentsCount = assignedStudents.length;

    let totalInternshipRegistrations = 0;
    let totalHackathonRegistrations = 0;
    let studentsWithResume = 0;
    let studentsWithoutResume = 0;
    let studentsNeedingAttention = 0;

    assignedStudents.forEach((student: any) => {
      const hasResume = student.resumes.length > 0;
      if (hasResume) {
        studentsWithResume++;
      } else {
        studentsWithoutResume++;
      }

      const activeResume = student.resumes[0];
      const needsResumeReview = !activeResume || activeResume.reviewStatus === 'PENDING_REVIEW' || activeResume.reviewStatus === 'CHANGES_REQUESTED';
      const noApps = student.applications.length === 0 && student.registrations.length === 0;
      if (needsResumeReview || noApps || !hasResume) {
        studentsNeedingAttention++;
      }

      student.registrations.forEach((reg: any) => {
        const type = reg.opportunity?.type || 'OTHER';
        if (type === 'INTERNSHIP') totalInternshipRegistrations++;
        if (type === 'HACKATHON') totalHackathonRegistrations++;
      });

      student.applications.forEach((app: any) => {
        const type = app.applicationType || app.opportunity?.type || 'OTHER';
        const existsInReg = student.registrations.some((r: any) => r.opportunityId === app.opportunityId);
        if (!existsInReg) {
          if (type === 'INTERNSHIP') totalInternshipRegistrations++;
          if (type === 'HACKATHON') totalHackathonRegistrations++;
        }
      });
    });

    let reportData: any[] = [];

    if (reportType === 'assigned-career') {
      // REPORT 1 — Assigned Student Career Report
      reportData = assignedStudents
        .map((s: any) => {
          const activeResume = s.resumes[0];
          const rawResumeStatus = activeResume ? activeResume.reviewStatus || 'PENDING_REVIEW' : 'NOT_UPLOADED';

          // Apply Resume Status Filter
          if (resumeStatusFilter !== 'ALL') {
            if (resumeStatusFilter === 'NOT_UPLOADED' && activeResume) return null;
            if (resumeStatusFilter === 'UPLOADED' && !activeResume) return null;
            if (['PENDING_REVIEW', 'REVIEWED', 'CHANGES_REQUESTED'].includes(resumeStatusFilter) && rawResumeStatus !== resumeStatusFilter) {
              return null;
            }
          }

          // Filter student applications/registrations by Opportunity Type & Reg Status if specified
          let studentApps = s.applications;
          let studentRegs = s.registrations;

          if (opportunityTypeFilter !== 'ALL') {
            studentApps = studentApps.filter((a: any) => (a.applicationType || a.opportunity?.type) === opportunityTypeFilter);
            studentRegs = studentRegs.filter((r: any) => (r.opportunity?.type) === opportunityTypeFilter);
          }

          if (registrationStatusFilter !== 'ALL') {
            studentApps = studentApps.filter((a: any) => a.status === registrationStatusFilter);
            studentRegs = studentRegs.filter((r: any) => r.status === registrationStatusFilter);
          }

          const skillsList = s.profile?.skills?.map((sk: any) => sk.skill.name) || [];
          const internshipCount = studentRegs.filter((r: any) => r.opportunity?.type === 'INTERNSHIP').length +
            studentApps.filter((a: any) => (a.applicationType || a.opportunity?.type) === 'INTERNSHIP').length;
          const hackathonCount = studentRegs.filter((r: any) => r.opportunity?.type === 'HACKATHON').length +
            studentApps.filter((a: any) => (a.applicationType || a.opportunity?.type) === 'HACKATHON').length;

          const completion = calculateProfileCompletion(s);
          const needsAttn = !activeResume || rawResumeStatus === 'PENDING_REVIEW' || (s.applications.length === 0 && s.registrations.length === 0);

          return {
            id: s.id,
            name: s.name,
            registerNo: s.profile?.registerNo || '—',
            email: s.email,
            department: s.profile?.department || '—',
            year: s.profile?.year ? String(s.profile.year) : '—',
            section: s.profile?.section || '—',
            cgpa: s.profile?.education?.[0]?.grade || (s.profile?.careerPreferences as any)?.cgpa || '—',
            profileCompletion: `${completion}%`,
            resumeUploaded: activeResume ? 'Yes' : 'No',
            resumeStatus: activeResume ? (rawResumeStatus === 'PENDING_REVIEW' ? 'Pending Review' : rawResumeStatus === 'REVIEWED' ? 'Reviewed' : 'Changes Requested') : 'Not Uploaded',
            skills: skillsList.length > 0 ? skillsList.join(', ') : 'None',
            applicationsCount: studentApps.length,
            registrationsCount: studentRegs.length,
            internshipRegistrations: internshipCount,
            hackathonRegistrations: hackathonCount,
            studentStatus: needsAttn ? 'Needs Attention' : 'Active / Good',
          };
        })
        .filter(Boolean);
    } else if (reportType === 'internship-hackathon') {
      // REPORT 2 — Internship & Hackathon Report
      const rows: any[] = [];

      assignedStudents.forEach((s: any) => {
        const activeResume = s.resumes[0];
        const resStatus = activeResume ? activeResume.reviewStatus || 'PENDING_REVIEW' : 'NOT_UPLOADED';

        if (resumeStatusFilter !== 'ALL') {
          if (resumeStatusFilter === 'NOT_UPLOADED' && activeResume) return;
          if (resumeStatusFilter === 'UPLOADED' && !activeResume) return;
          if (['PENDING_REVIEW', 'REVIEWED', 'CHANGES_REQUESTED'].includes(resumeStatusFilter) && resStatus !== resumeStatusFilter) {
            return;
          }
        }

        s.registrations.forEach((reg: any) => {
          const type = reg.opportunity?.type || 'INTERNSHIP';
          if (type !== 'INTERNSHIP' && type !== 'HACKATHON') return;

          if (opportunityTypeFilter !== 'ALL' && type !== opportunityTypeFilter) return;
          if (registrationStatusFilter !== 'ALL' && reg.status !== registrationStatusFilter) return;

          const matchedApp = s.applications.find((app: any) => app.opportunityId === reg.opportunityId);

          rows.push({
            id: reg.id,
            studentName: s.name,
            registerNo: s.profile?.registerNo || '—',
            department: s.profile?.department || '—',
            year: s.profile?.year ? String(s.profile.year) : '—',
            section: s.profile?.section || '—',
            opportunityName: reg.opportunity?.title || reg.opportunity?.organization || '—',
            opportunityType: type,
            company: reg.opportunity?.companyName || reg.opportunity?.organization || '—',
            registrationStatus: reg.status,
            registrationDate: reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : reg.initiatedAt ? new Date(reg.initiatedAt).toLocaleDateString() : '—',
            deadline: reg.opportunity?.applicationDeadline ? new Date(reg.opportunity.applicationDeadline).toLocaleDateString() : reg.opportunity?.deadline ? new Date(reg.opportunity.deadline).toLocaleDateString() : '—',
            applicationStatus: matchedApp?.status || 'N/A',
          });
        });

        s.applications.forEach((app: any) => {
          const type = app.applicationType || app.opportunity?.type || 'INTERNSHIP';
          if (type !== 'INTERNSHIP' && type !== 'HACKATHON') return;

          if (opportunityTypeFilter !== 'ALL' && type !== opportunityTypeFilter) return;
          if (registrationStatusFilter !== 'ALL' && app.status !== registrationStatusFilter) return;

          const alreadyAdded = s.registrations.some((r: any) => r.opportunityId === app.opportunityId);
          if (!alreadyAdded) {
            rows.push({
              id: app.id,
              studentName: s.name,
              registerNo: s.profile?.registerNo || '—',
              department: s.profile?.department || '—',
              year: s.profile?.year ? String(s.profile.year) : '—',
              section: s.profile?.section || '—',
              opportunityName: app.position || app.companyName,
              opportunityType: type,
              company: app.companyName,
              registrationStatus: 'N/A',
              registrationDate: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : new Date(app.createdAt).toLocaleDateString(),
              deadline: app.deadline ? new Date(app.deadline).toLocaleDateString() : '—',
              applicationStatus: app.status,
            });
          }
        });
      });

      reportData = rows;
    } else if (reportType === 'application-placement') {
      // REPORT 3 — Student Application & Placement Report
      const rows: any[] = [];

      assignedStudents.forEach((s: any) => {
        const activeResume = s.resumes[0];
        const resStatus = activeResume ? activeResume.reviewStatus || 'PENDING_REVIEW' : 'NOT_UPLOADED';

        if (resumeStatusFilter !== 'ALL') {
          if (resumeStatusFilter === 'NOT_UPLOADED' && activeResume) return;
          if (resumeStatusFilter === 'UPLOADED' && !activeResume) return;
          if (['PENDING_REVIEW', 'REVIEWED', 'CHANGES_REQUESTED'].includes(resumeStatusFilter) && resStatus !== resumeStatusFilter) {
            return;
          }
        }

        s.applications.forEach((app: any) => {
          const type = app.applicationType || app.opportunity?.type || 'INTERNSHIP';

          if (opportunityTypeFilter !== 'ALL' && type !== opportunityTypeFilter) return;
          if (registrationStatusFilter !== 'ALL' && app.status !== registrationStatusFilter) return;

          const matchedReg = s.registrations.find((r: any) => r.opportunityId === app.opportunityId);
          const matchedInterview = s.interviews.find((i: any) => i.companyName.toLowerCase() === app.companyName.toLowerCase());

          rows.push({
            id: app.id,
            studentName: s.name,
            registerNo: s.profile?.registerNo || '—',
            department: s.profile?.department || '—',
            year: s.profile?.year ? String(s.profile.year) : '—',
            section: s.profile?.section || '—',
            opportunityName: app.position || app.companyName,
            opportunityType: type,
            company: app.companyName,
            applicationStatus: app.status,
            registrationStatus: matchedReg?.status || 'N/A',
            appliedDate: app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : new Date(app.createdAt).toLocaleDateString(),
            currentStage: app.nextAction || app.status,
            interviewStatus: matchedInterview ? `${matchedInterview.type} on ${new Date(matchedInterview.date).toLocaleDateString()}` : 'None Scheduled',
            offerStatus: app.status === 'SELECTED' ? 'Selected / Offer Received' : app.status === 'REJECTED' ? 'Not Selected' : 'In Progress',
          });
        });
      });

      reportData = rows;
    } else if (reportType === 'resume-readiness') {
      // REPORT 4 — Resume & Student Readiness Report
      reportData = assignedStudents
        .map((s: any) => {
          const activeResume = s.resumes[0];
          const rawResumeStatus = activeResume ? activeResume.reviewStatus || 'PENDING_REVIEW' : 'NOT_UPLOADED';

          if (resumeStatusFilter !== 'ALL') {
            if (resumeStatusFilter === 'NOT_UPLOADED' && activeResume) return null;
            if (resumeStatusFilter === 'UPLOADED' && !activeResume) return null;
            if (['PENDING_REVIEW', 'REVIEWED', 'CHANGES_REQUESTED'].includes(resumeStatusFilter) && rawResumeStatus !== resumeStatusFilter) {
              return null;
            }
          }

          const skillsList = s.profile?.skills?.map((sk: any) => sk.skill.name) || [];
          const completion = calculateProfileCompletion(s);

          return {
            id: s.id,
            studentName: s.name,
            registerNo: s.profile?.registerNo || '—',
            department: s.profile?.department || '—',
            year: s.profile?.year ? String(s.profile.year) : '—',
            section: s.profile?.section || '—',
            resumeUploaded: activeResume ? 'Yes' : 'No',
            resumeStatus: activeResume ? (rawResumeStatus === 'PENDING_REVIEW' ? 'Pending Review' : rawResumeStatus === 'REVIEWED' ? 'Reviewed' : 'Changes Requested') : 'Not Uploaded',
            resumeUploadDate: activeResume ? new Date(activeResume.uploadedAt).toLocaleDateString() : '—',
            skills: skillsList.length > 0 ? skillsList.join(', ') : 'None',
            profileCompletion: `${completion}%`,
            readinessProgress: completion >= 80 ? 'High' : completion >= 50 ? 'Medium' : 'Low',
            mentorFeedback: activeResume?.reviewFeedback || 'No feedback submitted yet',
          };
        })
        .filter(Boolean);
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      summary: {
        assignedStudentsCount,
        internshipRegistrationsCount: totalInternshipRegistrations,
        hackathonRegistrationsCount: totalHackathonRegistrations,
        studentsWithResume,
        studentsWithoutResume,
        studentsNeedingAttention,
      },
      mentorInfo: {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
      },
    });
  } catch (error) {
    console.error('Mentor Reports GET API Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
