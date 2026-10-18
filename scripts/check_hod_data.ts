import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const hods = await prisma.user.findMany({
    where: { role: 'HOD' },
    include: {
      profile: true,
      verifiedProfiles: true
    }
  });

  console.log(`Found ${hods.length} HOD users:`);
  for (const h of hods) {
    console.log({
      id: h.id,
      name: h.name,
      email: h.email,
      role: h.role,
      profile: h.profile,
      verifiedProfiles: h.verifiedProfiles
    });
  }

  // Also check departments in the system
  const departments = await prisma.profile.findMany({
    where: { department: { not: null } },
    select: { department: true },
    distinct: ['department']
  });
  console.log('Existing Departments in system:', departments.map(d => d.department));
}

main().catch(console.error).finally(() => prisma.$disconnect());
