import prisma from '@/lib/prisma';
import { classifyField, defaultFillPolicy, isReusableClassification } from './classifier';
import { customKeyFromLabel } from './mapper';

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
  'education.college': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, college: value },
      update: { college: value },
    });
  },
  'education.department': async (userId, value) => {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, department: value },
      update: { department: value },
    });
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
  'personal.fullName': async (userId, value) => {
    await prisma.user.update({ where: { id: userId }, data: { name: value } });
  },
};

async function syncCareerPreference(userId: string, patch: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const current = ((profile?.careerPreferences || {}) as Record<string, unknown>);
  const next = { ...current, ...patch };
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

  if (input.saveMode === 'USE_ONCE' || classification === 'APPLICATION_SPECIFIC_FIELD' || classification === 'LEGAL_FIELD') {
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
      message: classification === 'APPLICATION_SPECIFIC_FIELD'
        ? 'Answer used for this application only.'
        : 'Value will be used once and not saved to your profile.',
    };
  }

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

  if (PROFILE_COLUMN_SYNC[key]) {
    await PROFILE_COLUMN_SYNC[key](userId, value);
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
