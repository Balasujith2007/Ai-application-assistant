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

  const profile = user.profile as any;
  const prefs = (profile?.careerPreferences || {}) as Record<string, unknown>;
  const { first, last } = splitName(user.name);
  const verifiedMap = new Map<string, { platform: string; profileUrl: string }>(
    user.verifiedProfiles.map((vp: { platform: string; profileUrl: string }) => [vp.platform, vp])
  );
  const activeResume = user.resumes[0] || null;
  const edu = profile?.education?.[0] as any;

  const snapshot: ExtensionProfileSnapshot = {
    userId: user.id,
    personal: {
      fullName: meta(user.name, 'existing-profile', { label: 'Full Name', category: 'personal' }),
      firstName: meta(first, 'existing-profile', { label: 'First Name', category: 'personal' }),
      lastName: meta(last, 'existing-profile', { label: 'Last Name', category: 'personal' }),
      email: meta(user.email, 'existing-profile', { label: 'Email', category: 'personal' }),
      phone: meta(profile?.phone, 'existing-profile', { label: 'Phone', category: 'personal' }),
      location: meta(profile?.location, 'existing-profile', { label: 'Location', category: 'personal' }),
      dateOfBirth: meta(profile?.dob, 'existing-profile', { label: 'Date of Birth', category: 'personal' }),
      dob: meta(profile?.dob, 'existing-profile', { label: 'Date of Birth', category: 'personal' }),
      nationality: meta(profile?.nationality, 'existing-profile', { label: 'Nationality', category: 'personal' }),
      country: meta(profile?.country, 'existing-profile', { label: 'Country', category: 'personal' }),
      state: meta(profile?.state, 'existing-profile', { label: 'State', category: 'personal' }),
      preferredLocation: meta(profile?.preferredLocation || (Array.isArray(prefs.locations) ? (prefs.locations as string[]).join(', ') : ''), 'existing-profile', { label: 'Preferred Location', category: 'personal' }),
      pinCode: meta(profile?.pinCode, 'existing-profile', { label: 'PIN Code', category: 'personal' }),
    },
    education: {
      college: meta(profile?.collegeName || profile?.college || edu?.institution, 'existing-profile', { label: 'College', category: 'education' }),
      collegeName: meta(profile?.collegeName || profile?.college || edu?.institution, 'existing-profile', { label: 'College Name', category: 'education' }),
      department: meta(profile?.department || edu?.fieldOfStudy, 'existing-profile', { label: 'Department', category: 'education' }),
      degree: meta(edu?.degree, 'existing-profile', { label: 'Degree', category: 'education' }),
      cgpa: meta(profile?.cgpa || edu?.grade, 'existing-profile', { label: 'CGPA', category: 'education' }),
      year: meta(profile?.year != null ? String(profile.year) : '', 'existing-profile', { label: 'Year', category: 'education' }),
      collegeJoiningYear: meta(profile?.collegeJoiningYear != null ? String(profile.collegeJoiningYear) : '', 'existing-profile', { label: 'Joining Year', category: 'education' }),
      collegeGraduationYear: meta(profile?.collegeGraduationYear != null ? String(profile.collegeGraduationYear) : '', 'existing-profile', { label: 'Expected Graduation Year', category: 'education' }),
      graduationYear: meta(profile?.collegeGraduationYear != null ? String(profile.collegeGraduationYear) : (edu?.endYear != null ? String(edu.endYear) : ''), 'existing-profile', { label: 'Graduation Year', category: 'education' }),
      major: meta(profile?.major || edu?.fieldOfStudy, 'existing-profile', { label: 'Major', category: 'education' }),
      minor: meta(profile?.minor || (edu as any)?.minor, 'existing-profile', { label: 'Minor', category: 'education' }),
      tenthSchool: meta(profile?.tenthSchool, 'existing-profile', { label: '10th School', category: 'education' }),
      tenthPercentage: meta(profile?.tenthPercentage, 'existing-profile', { label: '10th Percentage', category: 'education' }),
      twelfthSchool: meta(profile?.twelfthSchool, 'existing-profile', { label: '12th School', category: 'education' }),
      twelfthPercentage: meta(profile?.twelfthPercentage, 'existing-profile', { label: '12th Percentage', category: 'education' }),
    },
    links: {
      github: meta(profile?.githubUrl || verifiedMap.get('GITHUB')?.profileUrl, 'existing-profile', { label: 'GitHub', category: 'links' }),
      linkedin: meta(profile?.linkedinUrl || verifiedMap.get('LINKEDIN')?.profileUrl, 'existing-profile', { label: 'LinkedIn', category: 'links' }),
      portfolio: meta(profile?.portfolioUrl, 'existing-profile', { label: 'Portfolio', category: 'links' }),
      codolio: meta(profile?.codolioUrl || verifiedMap.get('CODOLIO')?.profileUrl, 'existing-profile', { label: 'Codolio', category: 'links' }),
    },
    preferences: {
      preferredRole: meta(profile?.preferredRole, 'existing-profile', { label: 'Preferred Role', category: 'preferences' }),
      desiredJobRole: meta(profile?.preferredRole, 'existing-profile', { label: 'Desired Job Role', category: 'preferences' }),
      expectedSalary: meta(
        profile?.expectedSalary || (typeof prefs.expectedSalary === 'string' ? prefs.expectedSalary : ''),
        'existing-profile',
        { label: 'Expected Salary', category: 'preferences' },
      ),
      salaryExpectation: meta(
        profile?.expectedSalary || (typeof prefs.expectedSalary === 'string' ? prefs.expectedSalary : ''),
        'existing-profile',
        { label: 'Salary Expectation', category: 'preferences' },
      ),
      noticePeriod: meta(
        typeof prefs.noticePeriod === 'string' ? prefs.noticePeriod : '',
        'existing-profile',
        { label: 'Notice Period', category: 'preferences' },
      ),
      preferredLocation: meta(
        profile?.preferredLocation || (Array.isArray(prefs.locations) ? (prefs.locations as string[]).join(', ') : ''),
        'existing-profile',
        { label: 'Preferred Location', category: 'preferences' },
      ),
      previousWorkMode: meta(
        profile?.previousWorkMode,
        'existing-profile',
        { label: 'Previous Work Mode', category: 'preferences' },
      ),
      preferredWorkMode: meta(
        profile?.preferredWorkMode,
        'existing-profile',
        { label: 'Preferred Work Mode', category: 'preferences' },
      ),
      workMode: meta(
        profile?.preferredWorkMode || (Array.isArray(prefs.workTypes) ? (prefs.workTypes as string[]).join(', ') : ''),
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
    skills: profile?.skills?.map((s: { skill: { name: string } }) => s.skill.name) || [],
    experience: (profile?.experiences || []).map((e: { company: string; role: string; description?: string | null; duration?: string | null }) => ({
      company: e.company,
      role: e.role,
      description: e.description,
      duration: e.duration,
    })),
    projects: (profile?.projects || []).map((p: { title: string; description?: string | null; technologies: string[] }) => ({
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

  // Short keys used by older agent payload & dynamic runner lookups
  snapshot.flat.fullName = snapshot.flat['personal.fullName'] || '';
  snapshot.flat.firstName = snapshot.flat['personal.firstName'] || '';
  snapshot.flat.lastName = snapshot.flat['personal.lastName'] || '';
  snapshot.flat.email = snapshot.flat['personal.email'] || '';
  snapshot.flat.phone = snapshot.flat['personal.phone'] || '';
  snapshot.flat.dob = snapshot.flat['personal.dob'] || snapshot.flat['personal.dateOfBirth'] || '';
  snapshot.flat.dateOfBirth = snapshot.flat['personal.dateOfBirth'] || snapshot.flat['personal.dob'] || '';
  snapshot.flat.nationality = snapshot.flat['personal.nationality'] || '';
  snapshot.flat.country = snapshot.flat['personal.country'] || '';
  snapshot.flat.state = snapshot.flat['personal.state'] || '';
  snapshot.flat.location = snapshot.flat['personal.location'] || '';
  snapshot.flat.pinCode = snapshot.flat['personal.pinCode'] || '';
  snapshot.flat.college = snapshot.flat['education.college'] || '';
  snapshot.flat.collegeName = snapshot.flat['education.collegeName'] || snapshot.flat['education.college'] || '';
  snapshot.flat.department = snapshot.flat['education.department'] || '';
  snapshot.flat.cgpa = snapshot.flat['education.cgpa'] || '';
  snapshot.flat.year = snapshot.flat['education.year'] || '';
  snapshot.flat.tenthSchool = snapshot.flat['education.tenthSchool'] || '';
  snapshot.flat.tenthPercentage = snapshot.flat['education.tenthPercentage'] || '';
  snapshot.flat.twelfthSchool = snapshot.flat['education.twelfthSchool'] || '';
  snapshot.flat.twelfthPercentage = snapshot.flat['education.twelfthPercentage'] || '';
  snapshot.flat.collegeJoiningYear = snapshot.flat['education.collegeJoiningYear'] || '';
  snapshot.flat.collegeGraduationYear = snapshot.flat['education.collegeGraduationYear'] || '';
  snapshot.flat.graduationYear = snapshot.flat['education.graduationYear'] || snapshot.flat['education.collegeGraduationYear'] || '';
  snapshot.flat.major = snapshot.flat['education.major'] || '';
  snapshot.flat.minor = snapshot.flat['education.minor'] || '';
  snapshot.flat.github = snapshot.flat['links.github'] || '';
  snapshot.flat.linkedin = snapshot.flat['links.linkedin'] || '';
  snapshot.flat.portfolio = snapshot.flat['links.portfolio'] || '';
  snapshot.flat.codolio = snapshot.flat['links.codolio'] || '';
  snapshot.flat.preferredRole = snapshot.flat['preferences.preferredRole'] || '';
  snapshot.flat.desiredJobRole = snapshot.flat['preferences.desiredJobRole'] || snapshot.flat['preferences.preferredRole'] || '';
  snapshot.flat.expectedSalary = snapshot.flat['preferences.expectedSalary'] || '';
  snapshot.flat.salaryExpectation = snapshot.flat['preferences.salaryExpectation'] || snapshot.flat['preferences.expectedSalary'] || '';
  snapshot.flat.noticePeriod = snapshot.flat['preferences.noticePeriod'] || '';
  snapshot.flat.workAuthorization = snapshot.flat['preferences.workAuthorization'] || '';
  snapshot.flat.preferredLocation = snapshot.flat['preferences.preferredLocation'] || '';
  snapshot.flat.previousWorkMode = snapshot.flat['preferences.previousWorkMode'] || '';
  snapshot.flat.preferredWorkMode = snapshot.flat['preferences.preferredWorkMode'] || '';
  snapshot.flat.workMode = snapshot.flat['preferences.preferredWorkMode'] || snapshot.flat['preferences.workMode'] || '';

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
