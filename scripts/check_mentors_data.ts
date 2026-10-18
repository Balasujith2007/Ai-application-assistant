import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const mentors = await prisma.user.findMany({
    where: { role: 'MENTOR' },
    include: {
      profile: {
        include: {
          education: true,
          experiences: true,
          skills: { include: { skill: true } }
        }
      },
      verifiedProfiles: true,
      students: {
        include: { profile: true }
      }
    }
  });

  console.log(`Found ${mentors.length} mentors:`);
  for (const m of mentors) {
    console.log({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      profile: m.profile,
      verifiedProfiles: m.verifiedProfiles,
      assignedStudentsCount: m.students.length,
      sampleStudentDepartments: [...new Set(m.students.map(s => s.profile?.department).filter(Boolean))],
      sampleStudentYears: [...new Set(m.students.map(s => s.profile?.year).filter(Boolean))],
      sampleStudentSections: [...new Set(m.students.map(s => s.profile?.section).filter(Boolean))]
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
