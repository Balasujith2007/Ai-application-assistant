import prisma from '../lib/prisma';

async function main() {
  const deleted = await prisma.roleSidebarItem.deleteMany({
    where: {
      role: 'STUDENT',
      title: 'Announcements',
    },
  });
  console.log(`Deleted ${deleted.count} Announcements items for STUDENT`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
