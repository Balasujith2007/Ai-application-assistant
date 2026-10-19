import prisma from '../lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { profile: true },
    orderBy: { name: 'asc' },
  });
  console.log('Total students:', users.length);
  const cohorts: Record<string, string[]> = {};
  for (const u of users) {
    const key = `${u.profile?.department || 'NO_DEPT'} - Year ${u.profile?.year} - Sec ${u.profile?.section}`;
    if (!cohorts[key]) cohorts[key] = [];
    cohorts[key].push(`${u.name} (${u.email})`);
  }
  for (const [k, v] of Object.entries(cohorts)) {
    console.log(`\n=== COHORT: ${k} (${v.length} students) ===`);
    v.slice(0, 10).forEach(s => console.log('  -', s));
    if (v.length > 10) console.log(`  ... and ${v.length - 10} more`);
  }
}
main().then(() => prisma.$disconnect());
