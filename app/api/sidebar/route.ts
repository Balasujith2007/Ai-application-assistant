import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { Role } from '@prisma/client';

const DEFAULT_SIDEBARS: Record<Role, Array<{ title: string; path: string; order: number; enabled: boolean }>> = {
  STUDENT: [
    { title: 'Overview', path: '/dashboard/student', order: 0, enabled: true },
    { title: 'Opportunities', path: '/dashboard/student/opportunities', order: 1, enabled: true },
    { title: 'My Applications', path: '/dashboard/student/applications', order: 2, enabled: true },
    { title: 'My Tasks', path: '/dashboard/student/tasks', order: 3, enabled: true },
    { title: 'My Resume', path: '/resume', order: 4, enabled: true },
    { title: 'My Progress', path: '/dashboard/student/progress', order: 5, enabled: true },
    { title: 'Announcements', path: '/dashboard/student/announcements', order: 6, enabled: true },
    { title: 'Notifications', path: '/dashboard/notifications', order: 7, enabled: true },
    { title: 'Settings', path: '/dashboard/settings', order: 8, enabled: true },
  ],
  MENTOR: [
    { title: 'Dashboard', path: '/dashboard/mentor', order: 0, enabled: true },
    { title: 'My Students', path: '/dashboard/mentor/students', order: 1, enabled: true },
    { title: 'Our Students', path: '/dashboard/mentor/our-students', order: 2, enabled: true },
    { title: 'Resumes', path: '/dashboard/mentor/resumes', order: 3, enabled: true },
    { title: 'Tasks', path: '/dashboard/mentor/tasks', order: 4, enabled: true },
    { title: 'Student Progress', path: '/dashboard/mentor/progress', order: 5, enabled: true },
    { title: 'Reports', path: '/dashboard/mentor/reports', order: 6, enabled: true },
    { title: 'Forms', path: '/dashboard/mentor/forms', order: 7, enabled: true },
    { title: 'Notifications', path: '/dashboard/notifications', order: 8, enabled: true },
    { title: 'Settings', path: '/dashboard/settings', order: 9, enabled: true },
  ],
  HOD: [
    { title: 'Dashboard', path: '/dashboard/hod', order: 0, enabled: true },
    { title: 'Students', path: '/dashboard/hod/students', order: 1, enabled: true },
    { title: 'Mentors', path: '/dashboard/hod/mentors', order: 2, enabled: true },
    { title: 'Student Assignment', path: '/dashboard/hod/assign-mentor', order: 3, enabled: true },
    { title: 'Student Progress', path: '/dashboard/hod/progress', order: 4, enabled: true },
    { title: 'Internship / Hackathon', path: '/dashboard/hod/placements', order: 5, enabled: true },
    { title: 'Resumes', path: '/dashboard/hod/resumes', order: 6, enabled: true },
    { title: 'Tasks', path: '/dashboard/hod/tasks', order: 7, enabled: true },
    { title: 'Announcements', path: '/dashboard/hod/announcements', order: 8, enabled: true },
    { title: 'Reports', path: '/dashboard/hod/reports', order: 9, enabled: true },
    { title: 'Forms', path: '/dashboard/hod/forms', order: 10, enabled: true },
    { title: 'Settings', path: '/dashboard/settings', order: 11, enabled: true },
  ],
  SUPER_ADMIN: [
    { title: 'Dashboard', path: '/dashboard/super-admin', order: 0, enabled: true },
    { title: 'User Management', path: '/dashboard/super-admin/users', order: 1, enabled: true },
    { title: 'Roles & Permissions', path: '/dashboard/super-admin/roles', order: 2, enabled: true },
    { title: 'Sidebar Management', path: '/dashboard/super-admin/sidebar-management', order: 3, enabled: true },
    { title: 'Feature Management', path: '/dashboard/super-admin/features', order: 4, enabled: true },
    { title: 'Audit Logs', path: '/dashboard/super-admin/audit-logs', order: 5, enabled: true },
    { title: 'Opportunities', path: '/dashboard/super-admin/opportunities', order: 6, enabled: true },
    { title: 'Registrations', path: '/dashboard/super-admin/registrations', order: 7, enabled: true },
    { title: 'Auto-Fill Agent', path: '/dashboard/super-admin/auto-fill-agent', order: 8, enabled: true },
    { title: 'AI Features', path: '/dashboard/super-admin/ai-features', order: 9, enabled: true },
    { title: 'System Health', path: '/dashboard/super-admin/system-health', order: 10, enabled: true },
    { title: 'Settings', path: '/dashboard/settings', order: 11, enabled: true },
  ],
  FACULTY: [],
  PLACEMENT_CELL: [],
  ADMIN: []
};

// Map sidebar titles to app features
const FEATURE_MAP: Record<string, string> = {
  'Opportunities': 'opportunities',
  'Internship / Hackathon': 'opportunities',
  'My Applications': 'opportunities',
  'My Tasks': 'opportunities',
  'My Resume': 'resume-management',
  'Resumes': 'resume-management',
  'My Progress': 'career-readiness',
  'Student Progress': 'career-readiness',
  'Reports': 'reports',
  'Forms': 'form-builder',
  'Notifications': 'notifications',
  'Auto-Fill Agent': 'auto-fill-agent',
};

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 401 });
    if (user.active === false) return NextResponse.json({ message: 'Deactivated' }, { status: 403 });

    // Fetch sidebar items from DB
    let dbItems = await prisma.roleSidebarItem.findMany({
      where: { role: user.role },
      orderBy: { order: 'asc' }
    });

    // Fallback to static defaults if DB is not seeded
    if (dbItems.length === 0) {
      const defaults = DEFAULT_SIDEBARS[user.role] || [];
      dbItems = defaults.map(d => ({
        id: d.title,
        role: user.role,
        title: d.title,
        path: d.path,
        order: d.order,
        enabled: d.enabled,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    // Filter items based on feature state and permissions
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin sees all enabled items in its list
      return NextResponse.json({ data: dbItems.filter(i => i.enabled) });
    }

    const filteredItems = [];

    // Query active features to cross-reference
    const allFeatures = await prisma.appFeature.findMany();
    const featureStates = new Map(allFeatures.map(f => [f.name, f]));

    for (const item of dbItems) {
      if (!item.enabled) continue;

      const featureName = FEATURE_MAP[item.title];
      if (featureName) {
        const feature = featureStates.get(featureName);
        if (feature) {
          // If the feature is globally disabled or this role is excluded, hide the link
          if (!feature.enabled || !feature.roles.includes(user.role)) {
            continue;
          }
        }
      }

      // Check view permission for this resource
      const permission = await prisma.rolePermission.findUnique({
        where: {
          role_resource_action: {
            role: user.role,
            resource: item.title,
            action: 'VIEW'
          }
        }
      });

      // Default permissions: allow if there is no explicit view check, or if permitted
      if (permission && !permission.allowed) {
        continue;
      }

      filteredItems.push(item);
    }

    return NextResponse.json({ data: filteredItems });
  } catch (error) {
    console.error('Error fetching sidebar:', error);
    // Absolute fallback: static defaults
    return NextResponse.json({ data: [] });
  }
}
