import prisma from '../lib/prisma';

async function main() {
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      profile: {
        department: { contains: 'Artificial', mode: 'insensitive' },
        year: 2,
        section: { equals: 'A', mode: 'insensitive' },
      },
    },
    include: {
      profile: true,
      pointsLedgers: true,
      verifiedActivities: true,
      dailyStreaks: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log('Total students found in cohort:', students.length);
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const totalXp = s.pointsLedgers.reduce((acc, p) => acc + p.pointsAwarded, 0);
    console.log(
      `${i + 1}. ${s.name} (${s.profile?.registerNo || 'no reg'}) - XP: ${totalXp}, Streaks: ${s.dailyStreaks.length}, Acts: ${s.verifiedActivities.length}`
    );
  }
}

main().then(() => prisma.$disconnect());
