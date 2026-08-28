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
  const demoPassword = await bcrypt.hash('Demo@1234', 10);
  const mentorPassword = await bcrypt.hash('Mentor@123', 10);
  const hodPassword = await bcrypt.hash('Hod@123', 10);

  // Seed Super Admin
  const superAdminPassword = await bcrypt.hash('Superadmin@123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@careerai.edu' },
    update: { name: 'Super Admin', role: Role.SUPER_ADMIN, password: superAdminPassword },
    create: {
      email: 'superadmin@careerai.edu',
      name: 'Super Admin',
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // Seed default AppFeatures
  const defaultFeatures = [
    { name: 'opportunities', description: 'Access to campus jobs, internships, hackathons', roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.PLACEMENT_CELL, Role.ADMIN, Role.SUPER_ADMIN] },
    { name: 'resume-management', description: 'Upload and manage student resumes', roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.PLACEMENT_CELL, Role.ADMIN, Role.SUPER_ADMIN] },
    { name: 'reports', description: 'Access to department and student performance reports', roles: [Role.MENTOR, Role.HOD, Role.PLACEMENT_CELL, Role.ADMIN, Role.SUPER_ADMIN] },
    { name: 'form-builder', description: 'Create and publish feedback or evaluation forms', roles: [Role.MENTOR, Role.HOD, Role.ADMIN, Role.SUPER_ADMIN] },
    { name: 'notifications', description: 'Send and receive platform notifications', roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.PLACEMENT_CELL, Role.ADMIN, Role.SUPER_ADMIN] },
    { name: 'ai-resume-analysis', description: 'AI-assisted resume checks', roles: [Role.STUDENT, Role.MENTOR, Role.SUPER_ADMIN] },
    { name: 'skill-analysis', description: 'AI-assisted student skill mapping', roles: [Role.STUDENT, Role.MENTOR, Role.SUPER_ADMIN] },
    { name: 'career-readiness', description: 'AI-assisted placement readiness checks', roles: [Role.STUDENT, Role.MENTOR, Role.SUPER_ADMIN] },
    { name: 'auto-fill-agent', description: 'Chrome extension autofill capabilities', roles: [Role.STUDENT, Role.SUPER_ADMIN] },
  ];

  for (const feat of defaultFeatures) {
    await prisma.appFeature.upsert({
      where: { name: feat.name },
      update: { description: feat.description, roles: feat.roles },
      create: { name: feat.name, description: feat.description, roles: feat.roles, enabled: true },
    });
  }
  console.log('✅ Default App Features seeded.');

  // Seed default RolePermissions
  const defaultPermissions: Array<{ role: Role; resource: string; action: string; allowed: boolean }> = [];

  // Super Admin permissions
  const allResources = [
    'Dashboard', 'Opportunities', 'My Applications', 'My Tasks', 'My Resume', 'My Progress',
    'Announcements', 'Notifications', 'Reports', 'Forms', 'User Management', 'Roles & Permissions',
    'Sidebar Management', 'Feature Management', 'System Health', 'Audit Logs', 'Settings',
    'My Students', 'Our Students', 'Resumes', 'Tasks', 'Student Progress', 'Students', 'Mentors', 'Student Assignment', 'Internship / Hackathon'
  ];
  const allActions = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE'];

  for (const resource of allResources) {
    for (const action of allActions) {
      defaultPermissions.push({ role: Role.SUPER_ADMIN, resource, action, allowed: true });
    }
  }

  // Student permissions
  const studentViewOnly = ['Dashboard', 'Opportunities', 'My Applications', 'My Tasks', 'My Resume', 'My Progress', 'Announcements', 'Notifications', 'Settings'];
  for (const resource of studentViewOnly) {
    defaultPermissions.push({ role: Role.STUDENT, resource, action: 'VIEW', allowed: true });
  }
  defaultPermissions.push({ role: Role.STUDENT, resource: 'My Resume', action: 'CREATE', allowed: true });
  defaultPermissions.push({ role: Role.STUDENT, resource: 'My Resume', action: 'EDIT', allowed: true });
  defaultPermissions.push({ role: Role.STUDENT, resource: 'My Resume', action: 'DELETE', allowed: true });
  defaultPermissions.push({ role: Role.STUDENT, resource: 'My Tasks', action: 'EDIT', allowed: true });

  // Mentor permissions
  const mentorViewOnly = ['Dashboard', 'My Students', 'Our Students', 'Resumes', 'Tasks', 'Student Progress', 'Reports', 'Forms', 'Notifications', 'Settings'];
  for (const resource of mentorViewOnly) {
    defaultPermissions.push({ role: Role.MENTOR, resource, action: 'VIEW', allowed: true });
  }
  const mentorCreateEdit = ['Tasks', 'Forms'];
  for (const resource of mentorCreateEdit) {
    defaultPermissions.push({ role: Role.MENTOR, resource, action: 'CREATE', allowed: true });
    defaultPermissions.push({ role: Role.MENTOR, resource, action: 'EDIT', allowed: true });
    defaultPermissions.push({ role: Role.MENTOR, resource, action: 'DELETE', allowed: true });
  }
  defaultPermissions.push({ role: Role.MENTOR, resource: 'Reports', action: 'EXPORT', allowed: true });

  // HOD permissions
  const hodViewOnly = [
    'Dashboard', 'Students', 'Mentors', 'Student Assignment', 'Student Progress', 'Internship / Hackathon',
    'Resumes', 'Tasks', 'Announcements', 'Reports', 'Forms', 'Settings'
  ];
  for (const resource of hodViewOnly) {
    defaultPermissions.push({ role: Role.HOD, resource, action: 'VIEW', allowed: true });
  }
  const hodCreateEdit = ['Students', 'Mentors', 'Student Assignment', 'Tasks', 'Announcements', 'Forms'];
  for (const resource of hodCreateEdit) {
    defaultPermissions.push({ role: Role.HOD, resource, action: 'CREATE', allowed: true });
    defaultPermissions.push({ role: Role.HOD, resource, action: 'EDIT', allowed: true });
    defaultPermissions.push({ role: Role.HOD, resource, action: 'DELETE', allowed: true });
  }
  defaultPermissions.push({ role: Role.HOD, resource: 'Reports', action: 'EXPORT', allowed: true });

  for (const perm of defaultPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_resource_action: {
          role: perm.role,
          resource: perm.resource,
          action: perm.action,
        }
      },
      update: { allowed: perm.allowed },
      create: { role: perm.role, resource: perm.resource, action: perm.action, allowed: perm.allowed },
    });
  }
  console.log('✅ Default Role Permissions seeded.');

  // Seed default RoleSidebarItems
  const defaultSidebarItems = [
    // STUDENT
    { role: Role.STUDENT, title: 'Overview', path: '/dashboard/student', order: 0 },
    { role: Role.STUDENT, title: 'Opportunities', path: '/dashboard/student/opportunities', order: 1 },
    { role: Role.STUDENT, title: 'My Applications', path: '/dashboard/student/applications', order: 2 },
    { role: Role.STUDENT, title: 'My Tasks', path: '/dashboard/student/tasks', order: 3 },
    { role: Role.STUDENT, title: 'My Resume', path: '/resume', order: 4 },
    { role: Role.STUDENT, title: 'My Progress', path: '/dashboard/student/progress', order: 5 },
    { role: Role.STUDENT, title: 'Announcements', path: '/dashboard/student/announcements', order: 6 },

    // MENTOR
    { role: Role.MENTOR, title: 'Dashboard', path: '/dashboard/mentor', order: 0 },
    { role: Role.MENTOR, title: 'My Students', path: '/dashboard/mentor/students', order: 1 },
    { role: Role.MENTOR, title: 'Our Students', path: '/dashboard/mentor/our-students', order: 2 },
    { role: Role.MENTOR, title: 'Resumes', path: '/dashboard/mentor/resumes', order: 3 },
    { role: Role.MENTOR, title: 'Tasks', path: '/dashboard/mentor/tasks', order: 4 },
    { role: Role.MENTOR, title: 'Student Progress', path: '/dashboard/mentor/progress', order: 5 },
    { role: Role.MENTOR, title: 'Reports', path: '/dashboard/mentor/reports', order: 6 },
    { role: Role.MENTOR, title: 'Forms', path: '/dashboard/mentor/forms', order: 7 },

    // HOD
    { role: Role.HOD, title: 'Dashboard', path: '/dashboard/hod', order: 0 },
    { role: Role.HOD, title: 'Students', path: '/dashboard/hod/students', order: 1 },
    { role: Role.HOD, title: 'Mentors', path: '/dashboard/hod/mentors', order: 2 },
    { role: Role.HOD, title: 'Student Assignment', path: '/dashboard/hod/assign-mentor', order: 3 },
    { role: Role.HOD, title: 'Student Progress', path: '/dashboard/hod/progress', order: 4 },
    { role: Role.HOD, title: 'Internship / Hackathon', path: '/dashboard/hod/placements', order: 5 },
    { role: Role.HOD, title: 'Resumes', path: '/dashboard/hod/resumes', order: 6 },
    { role: Role.HOD, title: 'Tasks', path: '/dashboard/hod/tasks', order: 7 },
    { role: Role.HOD, title: 'Announcements', path: '/dashboard/hod/announcements', order: 8 },
    { role: Role.HOD, title: 'Reports', path: '/dashboard/hod/reports', order: 9 },
    { role: Role.HOD, title: 'Forms', path: '/dashboard/hod/forms', order: 10 },

    // SUPER_ADMIN
    { role: Role.SUPER_ADMIN, title: 'Dashboard', path: '/dashboard/super-admin', order: 0 },
    { role: Role.SUPER_ADMIN, title: 'User Management', path: '/dashboard/super-admin/users', order: 1 },
    { role: Role.SUPER_ADMIN, title: 'Roles & Permissions', path: '/dashboard/super-admin/roles', order: 2 },
    { role: Role.SUPER_ADMIN, title: 'Sidebar Management', path: '/dashboard/super-admin/sidebar-management', order: 3 },
    { role: Role.SUPER_ADMIN, title: 'Feature Management', path: '/dashboard/super-admin/features', order: 4 },
    { role: Role.SUPER_ADMIN, title: 'Audit Logs', path: '/dashboard/super-admin/audit-logs', order: 5 },
    { role: Role.SUPER_ADMIN, title: 'Opportunities', path: '/dashboard/super-admin/opportunities', order: 6 },
    { role: Role.SUPER_ADMIN, title: 'Registrations', path: '/dashboard/super-admin/registrations', order: 7 },
    { role: Role.SUPER_ADMIN, title: 'Auto-Fill Agent', path: '/dashboard/super-admin/auto-fill-agent', order: 8 },
    { role: Role.SUPER_ADMIN, title: 'AI Features', path: '/dashboard/super-admin/ai-features', order: 9 },
    { role: Role.SUPER_ADMIN, title: 'System Health', path: '/dashboard/super-admin/system-health', order: 10 },
  ];

  for (const item of defaultSidebarItems) {
    await prisma.roleSidebarItem.upsert({
      where: {
        role_title: {
          role: item.role,
          title: item.title,
        }
      },
      update: { path: item.path, order: item.order },
      create: { role: item.role, title: item.title, path: item.path, order: item.order, enabled: true },
    });
  }
  console.log('✅ Default Role Sidebar Items seeded.');

  // 1. Seed Primary Mentor: Kavitha
  const kavithaMentor = await prisma.user.upsert({
    where: { email: 'kavitha@careerai.edu' },
    update: { name: 'Kavitha', role: Role.MENTOR, password: mentorPassword },
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
    update: { name: 'Prof. Priya Sundaram', role: Role.MENTOR, password: mentorPassword },
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
    update: { name: 'Dr. S. Kanthaswamy (HOD)', role: Role.HOD, password: hodPassword },
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

  // 3. Seed Demo Student
  const demoStudent = await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: { name: 'Demo Student', role: Role.STUDENT, mentorId: kavithaMentor.id, password: demoPassword },
    create: {
      email: 'student@demo.com',
      name: 'Demo Student',
      password: demoPassword,
      role: Role.STUDENT,
      mentorId: kavithaMentor.id,
      profile: {
        create: {
          registerNo: '711524DEMO001',
          department: 'Artificial Intelligence & Data Science',
          year: 2,
          section: 'A',
        },
      },
    },
  });
  console.log(`✅ Demo Student created: ${demoStudent.email}`);

  // 4. Seed Class Students & assign all 33 to Kavitha
  let count = 0;
  for (const s of RAW_STUDENTS) {
    const email = `${s.registerNo.toLowerCase()}@student.careerai.edu`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: s.name,
        role: Role.STUDENT,
        mentorId: kavithaMentor.id,
        password: defaultPassword,
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

  console.log(`🎉 Successfully seeded ${count} class students assigned to Kavitha!`);

  // Seed default sidebars, features, and permissions
  console.log('⚙️ Seeding default sidebars, features, and permissions...');
  const { ensureAllDefaults } = await import('../lib/initializeDefaults');
  await ensureAllDefaults();
  console.log('✅ Default configuration successfully seeded!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
