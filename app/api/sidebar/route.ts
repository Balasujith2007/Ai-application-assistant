import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';
import { ensureRoleSidebarDefaults, CANONICAL_SIDEBARS } from '@/lib/initializeDefaults';

// Map sidebar titles to app features
const FEATURE_MAP: Record<string, string> = {
  'Opportunities': 'opportunities',
  'Internship / Hackathon': 'opportunities',
  'My Applications': 'opportunities',
  'My Tasks': 'opportunities',
  'Tasks': 'opportunities',
  'My Resume': 'resume-management',
  'Resumes': 'resume-management',
  'My Progress': 'career-readiness',
  'Student Progress': 'career-readiness',
  'Reports': 'reports',
  'Forms': 'form-builder',
  'Notifications': 'notifications',
  'Announcements': 'announcements',
  'Auto-Fill Agent': 'auto-fill-agent',
  'AI Features': 'ai-resume-analysis',
};

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 401 });
    if (user.active === false) return NextResponse.json({ message: 'Deactivated' }, { status: 403 });

    // Auto-initialize defaults if DB is empty for this role
    await ensureRoleSidebarDefaults(user.role);

    // Fetch sidebar items from DB
    let dbItems = await prisma.roleSidebarItem.findMany({
      where: { role: user.role },
      orderBy: { order: 'asc' }
    });

    if (dbItems.length === 0) {
      const defaults = CANONICAL_SIDEBARS[user.role] || [];
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

    // Filter out Preferences items (Notifications and Settings) so they are not duplicated in Main Menu
    dbItems = dbItems.filter(
      item => item.title !== 'Notifications' && item.title !== 'Settings' && item.path !== '/dashboard/notifications' && item.path !== '/dashboard/settings'
    );

    // Remove Announcements and Tasks for Student role
    if (user.role === 'STUDENT') {
      dbItems = dbItems.filter(
        item =>
          item.title !== 'Announcements' &&
          item.path !== '/dashboard/student/announcements' &&
          item.title !== 'My Tasks' &&
          item.title !== 'Tasks' &&
          !item.path.includes('/tasks')
      );
    }

    // Super Admin sees all enabled items in its list
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ data: dbItems.filter(i => i.enabled) });
    }

    // PERF FIX: Batch-fetch ALL data needed in 2 parallel queries instead of N+1
    const enabledItems = dbItems.filter(i => i.enabled);
    const itemTitles = enabledItems.map(i => i.title);

    const [allFeatures, allPermissions] = await Promise.all([
      prisma.appFeature.findMany(),
      // Single batch query for all VIEW permissions for this role — replaces N individual lookups
      prisma.rolePermission.findMany({
        where: {
          role: user.role,
          resource: { in: itemTitles },
          action: 'VIEW',
        },
        select: { resource: true, allowed: true },
      }),
    ]);

    const featureStates = new Map(allFeatures.map(f => [f.name, f]));
    // Build a Map<resource, allowed> for O(1) permission lookups
    const permissionMap = new Map(allPermissions.map(p => [p.resource, p.allowed]));

    const filteredItems = [];

    for (const item of enabledItems) {
      const featureName = FEATURE_MAP[item.title];
      if (featureName) {
        const feature = featureStates.get(featureName);
        if (feature && (!feature.enabled || !feature.roles.includes(user.role))) {
          continue;
        }
      }

      // O(1) Map lookup instead of DB query
      const allowed = permissionMap.get(item.title);
      if (allowed === false) {
        continue;
      }

      filteredItems.push(item);
    }

    return NextResponse.json({ data: filteredItems });
  } catch (error) {
    console.error('Error fetching sidebar:', error);
    return NextResponse.json({ data: [] });
  }
}
