import prisma from '@/lib/prisma';

export type ProfileValueMeta = {
  value: string;
  source: string;
  verified: boolean;
  confidence: number;
  updatedAt?: string;
  enabled?: boolean;
  fillPolicy?: string;
  sensitive?: boolean;
  label?: string;
  category?: string;
  customFieldId?: string;
};

export type ExtensionProfileSnapshot = {
  userId: string;
  personal: Record<string, ProfileValueMeta | undefined>;
  education: Record<string, ProfileValueMeta | undefined>;
  links: Record<string, ProfileValueMeta | undefined>;
  preferences: Record<string, ProfileValueMeta | undefined>;
  documents: Record<string, ProfileValueMeta | undefined>;
  skills: string[];
  experience: Array<{ company: string; role: string; description?: string | null }>;
  projects: Array<{ title: string; description?: string | null; technologies: string[] }>;
  custom: Record<string, ProfileValueMeta>;
  flat: Record<string, string>;
};

function meta(
  value: string | null | undefined,
  source: string,
  extra: Partial<ProfileValueMeta> = {},
): ProfileValueMeta | undefined {
  if (!value || !String(value).trim()) return extra.value ? extra as ProfileValueMeta : undefined;
  return {
    value: String(value).trim(),
    source,
    verified: extra.verified ?? true,
    confidence: extra.confidence ?? 1,
    ...extra,
  };
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

export async function buildExtensionProfile(userId: string): Promise<ExtensionProfileSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          education: { orderBy: { startYear: 'desc' } },
          projects: { orderBy: { id: 'desc' } },
          experiences: { orderBy: { startDate: 'desc' } },
          skills: { include: { skill: true } },
        },
      },
      verifiedProfiles: true,
      resumes: { where: { isActive: true }, orderBy: { uploadedAt: 'desc' }, take: 1 },
      customProfileFields: { where: { enabled: true } },
    },
  });

  if (!user) return null;

  const profile = user.profile;
  const prefs = (profile?.careerPreferences || {}) as Record<string, unknown>;
  const { first, last } = splitName(user.name);
  const verifiedMap = new Map(user.verifiedProfiles.map((vp) => [vp.platform, vp]));
  const activeResume = user.resumes[0] || null;
  const edu = profile?.education?.[0];

  const snapshot: ExtensionProfileSnapshot = {
    userId: user.id,
    personal: {
      fullName: meta(user.name, 'existing-profile', { label: 'Full Name', category: 'personal' }),
      firstName: meta(first, 'existing-profile', { label: 'First Name', category: 'personal' }),
      lastName: meta(last, 'existing-profile', { label: 'Last Name', category: 'personal' }),
      email: meta(user.email, 'existing-profile', { label: 'Email', category: 'personal' }),
      phone: meta(profile?.phone, 'existing-profile', { label: 'Phone', category: 'personal' }),
    },
    education: {
      college: meta(profile?.college || edu?.institution, 'existing-profile', { label: 'College', category: 'education' }),
      department: meta(profile?.department || edu?.fieldOfStudy, 'existing-profile', { label: 'Department', category: 'education' }),
      degree: meta(edu?.degree, 'existing-profile', { label: 'Degree', category: 'education' }),
      cgpa: meta(edu?.grade, 'existing-profile', { label: 'CGPA', category: 'education' }),
      year: meta(profile?.year != null ? String(profile.year) : '', 'existing-profile', { label: 'Year', category: 'education' }),
      graduationYear: meta(edu?.endYear != null ? String(edu.endYear) : '', 'existing-profile', { label: 'Graduation Year', category: 'education' }),
    },
    links: {
      github: meta(profile?.githubUrl || verifiedMap.get('GITHUB')?.profileUrl, 'existing-profile', { label: 'GitHub', category: 'links' }),
      linkedin: meta(profile?.linkedinUrl || verifiedMap.get('LINKEDIN')?.profileUrl, 'existing-profile', { label: 'LinkedIn', category: 'links' }),
      portfolio: meta(profile?.portfolioUrl, 'existing-profile', { label: 'Portfolio', category: 'links' }),
      codolio: meta(profile?.codolioUrl || verifiedMap.get('CODOLIO')?.profileUrl, 'existing-profile', { label: 'Codolio', category: 'links' }),
    },
    preferences: {
      expectedSalary: meta(
        typeof prefs.expectedSalary === 'string' ? prefs.expectedSalary : '',
        'existing-profile',
        { label: 'Expected Salary', category: 'preferences' },
      ),
      preferredLocation: meta(
        Array.isArray(prefs.locations) ? (prefs.locations as string[]).join(', ') : '',
        'existing-profile',
        { label: 'Preferred Location', category: 'preferences' },
      ),
      workMode: meta(
        Array.isArray(prefs.workTypes) ? (prefs.workTypes as string[]).join(', ') : '',
        'existing-profile',
        { label: 'Work Mode', category: 'preferences' },
      ),
    },
    documents: {
      resume: meta(activeResume?.originalName || activeResume?.fileName, 'existing-profile', {
        label: 'Resume',
        category: 'documents',
      }),
      resumeUrl: meta(activeResume?.fileUrl, 'existing-profile', { label: 'Resume URL', category: 'documents' }),
    },
    skills: profile?.skills?.map((s) => s.skill.name) || [],
    experience: (profile?.experiences || []).map((e) => ({
      company: e.company,
      role: e.role,
      description: e.description,
    })),
    projects: (profile?.projects || []).map((p) => ({
      title: p.title,
      description: p.description,
      technologies: p.technologies,
    })),
    custom: {},
    flat: {},
  };

  for (const field of user.customProfileFields) {
    const entry: ProfileValueMeta = {
      value: field.value,
      source: field.source,
      verified: field.verified,
      confidence: field.confidence,
      updatedAt: field.updatedAt.toISOString(),
      enabled: field.enabled,
      fillPolicy: field.fillPolicy,
      sensitive: field.sensitive,
      label: field.label,
      category: field.category,
      customFieldId: field.id,
    };
    snapshot.custom[field.key] = entry;

    const [group, leaf] = field.key.includes('.') ? field.key.split('.') : [field.category, field.key];
    const bucket = (snapshot as unknown as Record<string, Record<string, ProfileValueMeta | undefined>>)[group];
    if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
      bucket[leaf || field.key] = entry;
    }
  }

  const flatten = (prefix: string, obj: Record<string, ProfileValueMeta | undefined>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v?.value && v.enabled !== false) snapshot.flat[`${prefix}.${k}`] = v.value;
    }
  };
  flatten('personal', snapshot.personal);
  flatten('education', snapshot.education);
  flatten('links', snapshot.links);
  flatten('preferences', snapshot.preferences);
  flatten('documents', snapshot.documents);
  for (const [k, v] of Object.entries(snapshot.custom)) {
    if (v?.value && v.enabled !== false) snapshot.flat[k.includes('.') ? k : `custom.${k}`] = v.value;
  }
  if (snapshot.skills.length) snapshot.flat['skills.list'] = snapshot.skills.join(', ');

  // Short keys used by older agent payload
  snapshot.flat.fullName = snapshot.flat['personal.fullName'] || '';
  snapshot.flat.firstName = snapshot.flat['personal.firstName'] || '';
  snapshot.flat.lastName = snapshot.flat['personal.lastName'] || '';
  snapshot.flat.email = snapshot.flat['personal.email'] || '';
  snapshot.flat.phone = snapshot.flat['personal.phone'] || '';
  snapshot.flat.college = snapshot.flat['education.college'] || '';
  snapshot.flat.department = snapshot.flat['education.department'] || '';
  snapshot.flat.cgpa = snapshot.flat['education.cgpa'] || '';
  snapshot.flat.year = snapshot.flat['education.year'] || '';
  snapshot.flat.github = snapshot.flat['links.github'] || '';
  snapshot.flat.linkedin = snapshot.flat['links.linkedin'] || '';
  snapshot.flat.codolio = snapshot.flat['links.codolio'] || '';
  snapshot.flat.expectedSalary = snapshot.flat['preferences.expectedSalary'] || '';
  snapshot.flat.noticePeriod = snapshot.flat['preferences.noticePeriod'] || '';
  snapshot.flat.workAuthorization = snapshot.flat['preferences.workAuthorization'] || '';
  snapshot.flat.preferredLocation = snapshot.flat['preferences.preferredLocation'] || '';

  return snapshot;
}

export function lookupProfileValue(snapshot: ExtensionProfileSnapshot, key: string): ProfileValueMeta | undefined {
  if (snapshot.custom[key]) return snapshot.custom[key];
  if (key.includes('.')) {
    const [group, leaf] = key.split('.');
    const bucket = (snapshot as unknown as Record<string, Record<string, ProfileValueMeta | undefined>>)[group];
    if (bucket?.[leaf]) return bucket[leaf];
  }
  const flat = snapshot.flat[key];
  if (flat) return { value: flat, source: 'existing-profile', verified: true, confidence: 1 };
  return undefined;
}
