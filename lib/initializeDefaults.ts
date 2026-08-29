import 'dotenv/config';
import prisma from './prisma';
import { Role } from '@prisma/client';

export const CANONICAL_SIDEBARS: Record<Role, Array<{ title: string; path: string; order: number; enabled: boolean }>> = {
  STUDENT: [
    { title: 'Overview', path: '/dashboard/student', order: 0, enabled: true },
    { title: 'Opportunities', path: '/dashboard/student/opportunities', order: 1, enabled: true },
    { title: 'My Applications', path: '/dashboard/student/applications', order: 2, enabled: true },
    { title: 'My Tasks', path: '/dashboard/student/tasks', order: 3, enabled: true },
    { title: 'My Resume', path: '/resume', order: 4, enabled: true },
    { title: 'My Progress', path: '/dashboard/student/progress', order: 5, enabled: true },
  ],
  MENTOR: [
    { title: 'Dashboard', path: '/dashboard/mentor', order: 0, enabled: true },
    { title: 'My Students', path: '/dashboard/mentor/students', order: 1, enabled: true },
    { title: 'Our Students', path: '/dashboard/mentor/our-students', order: 2, enabled: true },
    { title: 'Opportunities', path: '/dashboard/mentor/opportunities', order: 3, enabled: true },
    { title: 'Resumes', path: '/dashboard/mentor/resumes', order: 4, enabled: true },
    { title: 'Tasks', path: '/dashboard/mentor/tasks', order: 5, enabled: true },
    { title: 'Student Progress', path: '/dashboard/mentor/progress', order: 6, enabled: true },
    { title: 'Reports', path: '/dashboard/mentor/reports', order: 7, enabled: true },
    { title: 'Forms', path: '/dashboard/mentor/forms', order: 8, enabled: true },
  ],
  HOD: [
    { title: 'Dashboard', path: '/dashboard/hod', order: 0, enabled: true },
    { title: 'Students', path: '/dashboard/hod/students', order: 1, enabled: true },
    { title: 'Mentors', path: '/dashboard/hod/mentors', order: 2, enabled: true },
    { title: 'Student Assignment', path: '/dashboard/hod/assign-mentor', order: 3, enabled: true },
    { title: 'Opportunities', path: '/dashboard/hod/opportunities', order: 4, enabled: true },
    { title: 'Registrations', path: '/dashboard/hod/placements', order: 5, enabled: true },
    { title: 'Resumes', path: '/dashboard/hod/resumes', order: 6, enabled: true },
    { title: 'Tasks', path: '/dashboard/hod/tasks', order: 7, enabled: true },
    { title: 'Student Progress', path: '/dashboard/hod/progress', order: 8, enabled: true },
    { title: 'Announcements', path: '/dashboard/hod/announcements', order: 9, enabled: true },
    { title: 'Reports', path: '/dashboard/hod/reports', order: 10, enabled: true },
    { title: 'Forms', path: '/dashboard/hod/forms', order: 11, enabled: true },
  ],
  SUPER_ADMIN: [
    { title: 'Dashboard', path: '/dashboard/super-admin', order: 0, enabled: true },
    { title: 'User Management', path: '/dashboard/super-admin/users', order: 1, enabled: true },
    { title: 'Roles & Permissions', path: '/dashboard/super-admin/roles', order: 2, enabled: true },
    { title: 'Sidebar Management', path: '/dashboard/super-admin/sidebar-management', order: 3, enabled: true },
    { title: 'Feature Management', path: '/dashboard/super-admin/features', order: 4, enabled: true },
    { title: 'Opportunities', path: '/dashboard/super-admin/opportunities', order: 5, enabled: true },
    { title: 'Registrations', path: '/dashboard/super-admin/registrations', order: 6, enabled: true },
    { title: 'Auto-Fill Agent', path: '/dashboard/super-admin/auto-fill-agent', order: 7, enabled: true },
    { title: 'AI Features', path: '/dashboard/super-admin/ai-features', order: 8, enabled: true },
    { title: 'Audit Logs', path: '/dashboard/super-admin/audit-logs', order: 9, enabled: true },
    { title: 'System Health', path: '/dashboard/super-admin/system-health', order: 10, enabled: true },
  ],
  FACULTY: [],
  PLACEMENT_CELL: [],
  ADMIN: []
};

export const CANONICAL_FEATURES = [
  {
    name: 'opportunities',
    description: 'Campus placements, job postings, internships, and hackathon registrations',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'resume-management',
    description: 'Resume creation, version management, and ATS review tools',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'career-readiness',
    description: 'Student progress analytics, milestone tracking, and readiness indicators',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'reports',
    description: 'Placement analytics, department export reports, and progress summaries',
    enabled: true,
    roles: [Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'form-builder',
    description: 'Custom form creation, student responses, and Excel exports',
    enabled: true,
    roles: [Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'notifications',
    description: 'Automated email, broadcast alerts, and in-app updates',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'announcements',
    description: 'Department-wide and batch-wide announcements',
    enabled: true,
    roles: [Role.HOD, Role.SUPER_ADMIN],
  },
  {
    name: 'ai-resume-analysis',
    description: 'AI automated resume scoring, bullet point enhancement, and feedback',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.SUPER_ADMIN],
  },
  {
    name: 'skill-analysis',
    description: 'AI skill gap evaluator, role roadmap, and recommendations',
    enabled: true,
    roles: [Role.STUDENT, Role.MENTOR, Role.SUPER_ADMIN],
  },
  {
    name: 'auto-fill-agent',
    description: 'Chrome Extension Apply Agent for job autofill operations',
    enabled: true,
    roles: [Role.STUDENT, Role.SUPER_ADMIN],
  },
];

export const RESOURCES_LIST = [
  'Dashboard',
  'Opportunities',
  'My Applications',
  'My Tasks',
  'My Resume',
  'My Progress',
  'Announcements',
  'Notifications',
  'Reports',
  'Forms',
  'User Management',
  'Roles & Permissions',
  'Sidebar Management',
  'Feature Management',
  'System Health',
  'Audit Logs',
  'Settings'
];

export const ACTIONS_LIST = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE'];

export async function ensureRoleSidebarDefaults(role: Role) {
  // Clean up any redundant Preferences items from main sidebar table
  await prisma.roleSidebarItem.deleteMany({
    where: {
      role,
      title: { in: ['Notifications', 'Settings'] }
    }
  });

  // Clean up Announcements from Student role
  if (role === Role.STUDENT) {
    await prisma.roleSidebarItem.deleteMany({
      where: {
        role: Role.STUDENT,
        title: 'Announcements'
      }
    });
  }

  const count = await prisma.roleSidebarItem.count({ where: { role } });
  if (count > 0) return;

  const defaults = CANONICAL_SIDEBARS[role] || [];
  if (defaults.length === 0) return;

  for (const item of defaults) {
    await prisma.roleSidebarItem.upsert({
      where: { role_title: { role, title: item.title } },
      update: { path: item.path, order: item.order, enabled: item.enabled },
      create: { role, title: item.title, path: item.path, order: item.order, enabled: item.enabled },
    });
  }
}

export async function ensureAllDefaults() {
  // 1. Sidebars
  for (const r of [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN]) {
    await ensureRoleSidebarDefaults(r);
  }

  // 2. Features
  for (const f of CANONICAL_FEATURES) {
    await prisma.appFeature.upsert({
      where: { name: f.name },
      update: { description: f.description, roles: f.roles },
      create: { name: f.name, description: f.description, enabled: f.enabled, roles: f.roles },
    });
  }

  // 3. Default Permissions Matrix
  const countPerms = await prisma.rolePermission.count();
  if (countPerms === 0) {
    for (const r of [Role.STUDENT, Role.MENTOR, Role.HOD, Role.SUPER_ADMIN]) {
      for (const res of RESOURCES_LIST) {
        for (const act of ACTIONS_LIST) {
          let allowed = false;

          if (r === Role.SUPER_ADMIN) {
            allowed = true;
          } else if (r === Role.STUDENT) {
            if (act === 'VIEW' && ['Dashboard', 'Opportunities', 'My Applications', 'My Tasks', 'My Resume', 'My Progress', 'Announcements', 'Notifications', 'Settings'].includes(res)) {
              allowed = true;
            }
            if (['CREATE', 'EDIT'].includes(act) && ['My Applications', 'My Tasks', 'My Resume', 'Settings'].includes(res)) {
              allowed = true;
            }
          } else if (r === Role.MENTOR) {
            if (act === 'VIEW' && ['Dashboard', 'Opportunities', 'My Students', 'Our Students', 'Resumes', 'Tasks', 'Student Progress', 'Reports', 'Forms', 'Notifications', 'Settings'].includes(res)) {
              allowed = true;
            }
            if (['CREATE', 'EDIT'].includes(act) && ['Tasks', 'Forms', 'Opportunities', 'Settings'].includes(res)) {
              allowed = true;
            }
            if (act === 'EXPORT' && ['Reports', 'Forms'].includes(res)) {
              allowed = true;
            }
          } else if (r === Role.HOD) {
            if (act === 'VIEW') {
              allowed = true;
            }
            if (['CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE'].includes(act) && !['User Management', 'Roles & Permissions', 'Sidebar Management', 'Feature Management', 'Audit Logs'].includes(res)) {
              allowed = true;
            }
          }

          await prisma.rolePermission.upsert({
            where: { role_resource_action: { role: r, resource: res, action: act } },
            update: { allowed },
            create: { role: r, resource: res, action: act, allowed },
          });
        }
      }
    }
  }
}
