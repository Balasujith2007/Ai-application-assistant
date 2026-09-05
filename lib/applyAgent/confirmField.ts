import prisma from '@/lib/prisma';
import { classifyField, defaultFillPolicy, isReusableClassification } from './classifier';
import { customKeyFromLabel } from './mapper';
import type { Prisma } from '@prisma/client';

export type SaveMode = 'SAVE' | 'USE_ONCE';

export interface ConfirmFieldInput {
  key?: string;
  label: string;
  value: string;
  category?: string;
  saveMode: SaveMode;
  classification?: string;
  fieldPattern?: string;
  siteHost?: string;
  forceUpdate?: boolean;
  sessionToken?: string;
  opportunityId?: string;
}

const PROFILE_COLUMN_SYNC: Record<string, (userId: string, value: string) => Promise<void>> = {
  'personal.phone': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, phone: value },
      update: { phone: value },
    });
  },
  'personal.dob': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, dob: value },
      update: { dob: value },
    });
  },
  'personal.dateOfBirth': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, dob: value },
      update: { dob: value },
    });
  },
  'personal.nationality': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, nationality: value },
      update: { nationality: value },
    });
  },
  'personal.country': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, country: value },
      update: { country: value },
    });
  },
  'personal.state': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, state: value },
      update: { state: value },
    });
  },
  'personal.location': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, location: value },
      update: { location: value },
    });
  },
  'personal.pinCode': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, pinCode: value },
      update: { pinCode: value },
    });
  },
  'education.college': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, college: value, collegeName: value },
      update: { college: value, collegeName: value },
    });
  },
  'education.collegeName': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, college: value, collegeName: value },
      update: { college: value, collegeName: value },
    });
  },
  'education.cgpa': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, cgpa: value },
      update: { cgpa: value },
    });
  },
  'education.department': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, department: value },
      update: { department: value },
    });
  },
  'education.major': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, major: value },
      update: { major: value },
    });
  },
  'education.minor': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, minor: value },
      update: { minor: value },
    });
  },
  'education.tenthSchool': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, tenthSchool: value },
      update: { tenthSchool: value },
    });
  },
  'education.tenthPercentage': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, tenthPercentage: value },
      update: { tenthPercentage: value },
    });
  },
  'education.twelfthSchool': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, twelfthSchool: value },
      update: { twelfthSchool: value },
    });
  },
  'education.twelfthPercentage': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, twelfthPercentage: value },
      update: { twelfthPercentage: value },
    });
  },
  'education.collegeJoiningYear': async (userId, value) => {
    const yr = parseInt(value);
    if (!isNaN(yr)) {
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, collegeJoiningYear: yr },
        update: { collegeJoiningYear: yr },
      });
    }
  },
  'education.collegeGraduationYear': async (userId, value) => {
    const yr = parseInt(value);
    if (!isNaN(yr)) {
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, collegeGraduationYear: yr },
        update: { collegeGraduationYear: yr },
      });
    }
  },
  'links.github': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, githubUrl: value },
      update: { githubUrl: value },
    });
  },
  'links.linkedin': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, linkedinUrl: value },
      update: { linkedinUrl: value },
    });
  },
  'links.portfolio': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, portfolioUrl: value },
      update: { portfolioUrl: value },
    });
  },
  'links.codolio': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, codolioUrl: value },
      update: { codolioUrl: value },
    });
  },
  'preferences.preferredRole': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, preferredRole: value },
      update: { preferredRole: value },
    });
  },
  'preferences.expectedSalary': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, expectedSalary: value },
      update: { expectedSalary: value },
    });
  },
  'preferences.previousWorkMode': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, previousWorkMode: value },
      update: { previousWorkMode: value },
    });
  },
  'preferences.preferredWorkMode': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, preferredWorkMode: value },
      update: { preferredWorkMode: value },
    });
  },
  'personal.fullName': async (userId, value) => {
    await prisma.user.update({ where: { id: userId }, data: { name: value } });
  },
};

async function syncCareerPreference(userId: string, patch: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const current = ((profile?.careerPreferences || {}) as Record<string, unknown>);
  const next = { ...current, ...patch } as Prisma.InputJsonValue;
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, careerPreferences: next },
    update: { careerPreferences: next },
  });
}

export async function confirmField(userId: string, input: ConfirmFieldInput) {
  const classification = (input.classification as ReturnType<typeof classifyField>) || classifyField(input.label);
  const value = String(input.value || '').trim();
  if (!value) return { ok: false, error: 'Value is required.' };

  if (input.saveMode === 'USE_ONCE' || classification === 'LEGAL_FIELD') {
    await prisma.applicationDraftAnswer.create({
      data: {
        userId,
        opportunityId: input.opportunityId || null,
        sessionToken: input.sessionToken || null,
        fieldLabel: input.label,
        fieldKey: input.key || null,
        value,
      },
    });
    return {
      ok: true,
      saved: false,
      useOnce: true,
      classification,
      message: classification === 'LEGAL_FIELD'
        ? 'Value will be used once and not saved to your profile.'
        : 'Answer used for this application only.',
    };
  }

  // APPLICATION_SPECIFIC_FIELD may be saved when the user explicitly chose SAVE
  // (e.g. reusable essay answers they want on future applications).
  if (!isReusableClassification(classification) && classification === 'UNKNOWN_FIELD' && !input.key) {
    // Unknown fields can still be saved as custom if user explicitly chose SAVE
  }

  const key = input.key || `custom.${customKeyFromLabel(input.label)}`;
  const category = input.category || key.split('.')[0] || 'custom';
  const sensitive = classification === 'SENSITIVE_FIELD';
  const fillPolicy = defaultFillPolicy(classification);

  const existing = await prisma.customProfileField.findUnique({
    where: { userId_key: { userId, key } },
  });

  if (existing && existing.value !== value && !input.forceUpdate) {
    return {
      ok: false,
      conflict: true,
      current: existing.value,
      incoming: value,
      key,
      label: existing.label,
      fieldId: existing.id,
    };
  }

  const field = await prisma.customProfileField.upsert({
    where: { userId_key: { userId, key } },
    create: {
      userId,
      key,
      category,
      label: input.label,
      value,
      source: 'USER_ENTERED',
      verified: true,
      confidence: 1,
      enabled: true,
      sensitive,
      fillPolicy: sensitive ? 'ASK_BEFORE_FILLING' : fillPolicy,
    },
    update: {
      value,
      label: input.label,
      source: 'USER_ENTERED',
      verified: true,
      confidence: 1,
      category,
      sensitive,
    },
  });

  await prisma.profileFieldHistory.create({
    data: {
      fieldId: field.id,
      oldValue: existing?.value ?? null,
      newValue: value,
      source: 'USER_ENTERED',
      updatedBy: 'USER',
    },
  });

  const syncHandler = PROFILE_COLUMN_SYNC[key]
    || PROFILE_COLUMN_SYNC[`personal.${key}`]
    || PROFILE_COLUMN_SYNC[`education.${key}`]
    || PROFILE_COLUMN_SYNC[`preferences.${key}`]
    || PROFILE_COLUMN_SYNC[`links.${key}`]
    || (key.startsWith('custom.') ? (
        PROFILE_COLUMN_SYNC[key.replace(/^custom\./, 'personal.')]
        || PROFILE_COLUMN_SYNC[key.replace(/^custom\./, 'education.')]
        || PROFILE_COLUMN_SYNC[key.replace(/^custom\./, 'preferences.')]
        || PROFILE_COLUMN_SYNC[key.replace(/^custom\./, 'links.')]
       ) : undefined);

  if (syncHandler) {
    await syncHandler(userId, value);
  }

  if (key === 'preferences.expectedSalary') {
    await syncCareerPreference(userId, { expectedSalary: value });
  }
  if (key === 'preferences.noticePeriod') {
    await syncCareerPreference(userId, { noticePeriod: value });
  }
  if (key === 'preferences.preferredLocation') {
    await syncCareerPreference(userId, { locations: value.split(',').map((s) => s.trim()).filter(Boolean) });
  }
  if (key === 'preferences.workMode') {
    await syncCareerPreference(userId, { workTypes: value.split(',').map((s) => s.trim()).filter(Boolean) });
  }

  if (input.fieldPattern) {
    await prisma.fieldMappingMemory.upsert({
      where: {
        userId_fieldPattern_siteHost: {
          userId,
          fieldPattern: input.fieldPattern,
          siteHost: input.siteHost || '',
        },
      },
      create: {
        userId,
        fieldPattern: input.fieldPattern,
        mappedField: key,
        confidence: 0.95,
        verified: true,
        siteHost: input.siteHost || '',
      },
      update: {
        mappedField: key,
        confidence: 0.95,
        verified: true,
      },
    });
  }

  return {
    ok: true,
    saved: true,
    field,
    classification,
  };
}
