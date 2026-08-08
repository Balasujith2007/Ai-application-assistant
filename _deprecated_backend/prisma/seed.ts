import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const HASH_ROUNDS = 12;

  // ============================================================
  // USERS (Development Credentials — NOT for production)
  // ============================================================

  const student = await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: {
      name: 'Arjun Kumar',
      email: 'student@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.STUDENT,
      profile: {
        create: {
          phone: '9876543210',
          department: 'Computer Science Engineering',
          year: 3,
          section: 'A',
          college: 'National Institute of Technology',
          location: 'Tiruchirappalli, Tamil Nadu',
          careerObjective:
            'Passionate software engineer seeking challenging internship opportunities in full-stack development and cloud computing.',
          linkedinUrl: 'https://linkedin.com/in/arjunkumar',
          githubUrl: 'https://github.com/arjunkumar',
          portfolioUrl: 'https://arjunkumar.dev',
        },
      },
    },
    include: { profile: true },
  });

  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@demo.com' },
    update: {},
    create: {
      name: 'Dr. Priya Sharma',
      email: 'mentor@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.MENTOR,
      profile: { create: { department: 'Computer Science Engineering', college: 'NIT Trichy' } },
    },
  });

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@demo.com' },
    update: {},
    create: {
      name: 'Prof. Ramesh Babu',
      email: 'faculty@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.FACULTY,
      profile: { create: { department: 'Electronics Engineering', college: 'NIT Trichy' } },
    },
  });

  const hod = await prisma.user.upsert({
    where: { email: 'hod@demo.com' },
    update: {},
    create: {
      name: 'Dr. Anand Krishnaswamy',
      email: 'hod@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.HOD,
      profile: { create: { department: 'Computer Science Engineering', college: 'NIT Trichy' } },
    },
  });

  const placementCell = await prisma.user.upsert({
    where: { email: 'placement@demo.com' },
    update: {},
    create: {
      name: 'Meera Nair',
      email: 'placement@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.PLACEMENT_CELL,
      profile: { create: { college: 'NIT Trichy' } },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@demo.com',
      password: await bcrypt.hash('Demo@1234', HASH_ROUNDS),
      role: Role.ADMIN,
      profile: { create: {} },
    },
  });

  console.log('✅ Users created');

  // ============================================================
  // SKILLS
  // ============================================================

  const skillNames = [
    'javascript', 'typescript', 'react', 'next.js', 'node.js',
    'python', 'java', 'c++', 'postgresql', 'mongodb',
    'docker', 'aws', 'git', 'tailwind css', 'nestjs',
  ];

  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  console.log('✅ Skills created');

  // ============================================================
  // STUDENT PROFILE DATA
  // ============================================================

  if (student.profile) {
    const profileId = student.profile.id;

    // Education
    await prisma.education.upsert({
      where: { id: `edu_seed_1` },
      update: {},
      create: {
        id: 'edu_seed_1',
        profileId,
        institution: 'National Institute of Technology, Tiruchirappalli',
        degree: 'B.Tech',
        fieldOfStudy: 'Computer Science Engineering',
        startYear: 2022,
        endYear: 2026,
        grade: '8.7 CGPA',
      },
    });

    await prisma.education.upsert({
      where: { id: 'edu_seed_2' },
      update: {},
      create: {
        id: 'edu_seed_2',
        profileId,
        institution: 'DAV Senior Secondary School',
        degree: 'Class XII (CBSE)',
        fieldOfStudy: 'Science (PCM)',
        startYear: 2020,
        endYear: 2022,
        grade: '94.2%',
      },
    });

    // Projects
    await prisma.project.upsert({
      where: { id: 'proj_seed_1' },
      update: {},
      create: {
        id: 'proj_seed_1',
        profileId,
        title: 'AI Career Management Platform',
        description:
          'Full-stack platform for managing student career profiles, applications, and resumes using NestJS + Next.js.',
        technologies: ['Next.js', 'TypeScript', 'NestJS', 'PostgreSQL', 'Prisma'],
        githubUrl: 'https://github.com/arjunkumar/ai-career-platform',
        startDate: new Date('2024-01-01'),
      },
    });

    await prisma.project.upsert({
      where: { id: 'proj_seed_2' },
      update: {},
      create: {
        id: 'proj_seed_2',
        profileId,
        title: 'E-Commerce Microservices',
        description:
          'Scalable e-commerce backend with microservices architecture using Node.js and Docker.',
        technologies: ['Node.js', 'Docker', 'RabbitMQ', 'PostgreSQL', 'Redis'],
        githubUrl: 'https://github.com/arjunkumar/ecommerce-microservices',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-12-01'),
      },
    });

    // Experience
    await prisma.experience.upsert({
      where: { id: 'exp_seed_1' },
      update: {},
      create: {
        id: 'exp_seed_1',
        profileId,
        company: 'TCS iON',
        role: 'Software Development Intern',
        description:
          'Worked on React frontend for internal HR portal. Implemented dashboards and data visualization components.',
        startDate: new Date('2023-05-01'),
        endDate: new Date('2023-07-31'),
        currentlyWorking: false,
      },
    });

    // Assign skills to student profile
    const studentSkills = skills.slice(0, 8);
    for (const skill of studentSkills) {
      await prisma.profileSkill.upsert({
        where: {
          profileId_skillId: { profileId, skillId: skill.id },
        },
        update: {},
        create: { profileId, skillId: skill.id },
      });
    }

    console.log('✅ Student profile data created');
  }

  // ============================================================
  // SAMPLE APPLICATIONS
  // ============================================================

  const applications = [
    {
      id: 'app_seed_1',
      userId: student.id,
      companyName: 'Google',
      position: 'SWE Intern (Summer 2025)',
      applicationType: 'INTERNSHIP' as const,
      applicationUrl: 'https://careers.google.com',
      status: 'INTERVIEW' as const,
      appliedDate: new Date('2024-10-15'),
      deadline: new Date('2025-01-15'),
      notes: 'Cleared OA and first round. Second round scheduled.',
    },
    {
      id: 'app_seed_2',
      userId: student.id,
      companyName: 'Microsoft',
      position: 'Software Engineer (Full-time)',
      applicationType: 'JOB' as const,
      applicationUrl: 'https://careers.microsoft.com',
      status: 'APPLIED' as const,
      appliedDate: new Date('2024-11-01'),
      deadline: new Date('2025-02-01'),
    },
    {
      id: 'app_seed_3',
      userId: student.id,
      companyName: 'Smart India Hackathon',
      position: 'Team Lead — Health Tech Track',
      applicationType: 'HACKATHON' as const,
      status: 'SHORTLISTED' as const,
      appliedDate: new Date('2024-09-20'),
    },
    {
      id: 'app_seed_4',
      userId: student.id,
      companyName: 'Flipkart',
      position: 'Backend Engineer Intern',
      applicationType: 'INTERNSHIP' as const,
      status: 'REJECTED' as const,
      appliedDate: new Date('2024-09-01'),
    },
    {
      id: 'app_seed_5',
      userId: student.id,
      companyName: 'Amazon',
      position: 'SDE-1',
      applicationType: 'JOB' as const,
      status: 'SAVED' as const,
      deadline: new Date('2025-03-01'),
    },
  ];

  for (const app of applications) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: {},
      create: app,
    });
  }

  console.log('✅ Sample applications created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Student:        student@demo.com   / Demo@1234');
  console.log('  Mentor:         mentor@demo.com    / Demo@1234');
  console.log('  Faculty:        faculty@demo.com   / Demo@1234');
  console.log('  HOD:            hod@demo.com       / Demo@1234');
  console.log('  Placement Cell: placement@demo.com / Demo@1234');
  console.log('  Admin:          admin@demo.com     / Demo@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
