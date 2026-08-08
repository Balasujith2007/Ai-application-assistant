import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const RAW_STUDENTS = [
  { registerNo: '711524BAD008', name: 'AKILAN R' },
  { registerNo: '711524BAD010', name: 'AKSHAI S' },
  { registerNo: '711524BAD013', name: 'ANBU SELVAN R' },
  { registerNo: '711524BAD015', name: 'ANNAMALAI R' },
  { registerNo: '711524BAD016', name: 'APPARNA S' },
  { registerNo: '711524BAD017', name: 'ARFATH J' },
  { registerNo: '711524BAD019', name: 'ARUNKUMAR M' },
  { registerNo: '711524BAD026', name: 'BALASUJITH S' },
  { registerNo: '711524BAD023', name: 'ASHWIN V' },
  { registerNo: '711524BAD032', name: 'CHANDRU S' },
  { registerNo: '711524BAD033', name: 'DEEKSHA M S' },
  { registerNo: '711524BAD038', name: 'DHARSHIKA P' },
  { registerNo: '711524BAD042', name: 'DHYANESH S E' },
  { registerNo: '711524BAD043', name: 'FARUKBABU M' },
  { registerNo: '711524BAD045', name: 'GAYATHRI G' },
  { registerNo: '711524BAD048', name: 'GOKULA KRISHNAN M' },
  { registerNo: '711524BAD054', name: 'HARIDHARANI B' },
  { registerNo: '711524BAD057', name: 'HESYA A' },
  { registerNo: '711524BAD058', name: 'INDHU R' },
  { registerNo: '711524BAD059', name: 'INDHU SREE M' },
  { registerNo: '711524BAD065', name: 'JANANI M' },
  { registerNo: '711524BAD066', name: 'JANANI S' },
  { registerNo: '711524BAD071', name: 'JOTHI DURGA NARAYANI' },
  { registerNo: '711524BAD072', name: 'KANIMOZHI R' },
  { registerNo: '711524BAD074', name: 'KANISHKA S' },
  { registerNo: '711524BAD079', name: 'KISHANTH G' },
  { registerNo: '711524BAD080', name: 'KISHOR P M' },
  { registerNo: '711524BAD082', name: 'KUMARAN R P' },
  { registerNo: '711524BAD090', name: 'MAHESHWARAN B' },
  { registerNo: '711524BAD091', name: 'MAHESWARAN G' },
  { registerNo: '711524BAD092', name: 'MALAVIKA M' },
  { registerNo: '711524BAD093', name: 'MANISH R' },
  { registerNo: '711524BAD095', name: 'MANORANJAN P' },
];

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = await bcrypt.hash('Student@123', 10);
  const mentorPassword = await bcrypt.hash('Mentor@123', 10);
  const hodPassword = await bcrypt.hash('Hod@123', 10);

  // 1. Seed Primary Mentor: Kavitha
  const kavithaMentor = await prisma.user.upsert({
    where: { email: 'kavitha@careerai.edu' },
    update: { name: 'Kavitha', role: Role.MENTOR },
    create: {
      email: 'kavitha@careerai.edu',
      name: 'Kavitha',
      password: mentorPassword,
      role: Role.MENTOR,
      profile: {
        create: {
          department: 'Artificial Intelligence & Data Science',
          employeeId: 'M-AI-001',
        },
      },
    },
  });

  // Additional mentor
  await prisma.user.upsert({
    where: { email: 'mentor2@careerai.edu' },
    update: { name: 'Prof. Priya Sundaram', role: Role.MENTOR },
    create: {
      email: 'mentor2@careerai.edu',
      name: 'Prof. Priya Sundaram',
      password: mentorPassword,
      role: Role.MENTOR,
      profile: {
        create: {
          department: 'Artificial Intelligence & Data Science',
          employeeId: 'M-AI-002',
        },
      },
    },
  });

  console.log(`✅ Primary Mentor created: ${kavithaMentor.name} (kavitha@careerai.edu)`);

  // 2. Seed HOD
  const hod = await prisma.user.upsert({
    where: { email: 'hod@careerai.edu' },
    update: { name: 'Dr. S. Kanthaswamy (HOD)', role: Role.HOD },
    create: {
      email: 'hod@careerai.edu',
      name: 'Dr. S. Kanthaswamy (HOD)',
      password: hodPassword,
      role: Role.HOD,
      profile: {
        create: {
          department: 'Artificial Intelligence & Data Science',
          employeeId: 'HOD-AI-001',
        },
      },
    },
  });

  console.log(`✅ HOD created: ${hod.name}`);

  // 3. Seed Students & assign all 33 to Kavitha
  let count = 0;
  for (const s of RAW_STUDENTS) {
    const email = `${s.registerNo.toLowerCase()}@student.careerai.edu`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: s.name,
        role: Role.STUDENT,
        mentorId: kavithaMentor.id,
      },
      create: {
        email,
        name: s.name,
        password: defaultPassword,
        role: Role.STUDENT,
        mentorId: kavithaMentor.id,
      },
    });

    // Create or update profile with registerNo
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        registerNo: s.registerNo,
        department: 'Artificial Intelligence & Data Science',
        year: 2,
        section: 'A',
      },
      create: {
        userId: user.id,
        registerNo: s.registerNo,
        department: 'Artificial Intelligence & Data Science',
        year: 2,
        section: 'A',
      },
    });

    count++;
  }

  console.log(`🎉 Successfully seeded ${count} students assigned to Kavitha!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
