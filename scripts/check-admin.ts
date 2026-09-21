import prisma from '../lib/prisma';

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      profile: { select: { phone: true } },
    },
  });

  console.log('Admins count:', admins.length);
  for (const a of admins) {
    console.log(`- ${a.role}: ${a.email} (${a.name || 'No Name'}), Phone: ${a.profile?.phone || 'Not set'}`);
  }
}

main().finally(() => prisma.$disconnect());
