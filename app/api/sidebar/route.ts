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

    // Super Admin sees all enabled items in its list
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ data: dbItems.filter(i => i.enabled) });
    }

    // Query active features to cross-reference
    const allFeatures = await prisma.appFeature.findMany();
    const featureStates = new Map(allFeatures.map(f => [f.name, f]));

    const filteredItems = [];

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
    return NextResponse.json({ data: [] });
  }
}
