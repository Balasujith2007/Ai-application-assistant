import { getUserIdFromRequest } from '@/lib/serverAuth';
import { jsonWithCors, optionsOk } from '@/lib/applyAgent/cors';
import { matchField, StoredMapping } from '@/lib/applyAgent/mapper';
import { classifyField } from '@/lib/applyAgent/classifier';
import prisma from '@/lib/prisma';

export function OPTIONS(req: Request) {
  return optionsOk(req);
}

/**
 * Maps extracted form fields to profile keys.
 * AI may ONLY suggest a mapping key — never invent a user value.
 */
export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return jsonWithCors(req, { success: false, message: 'Unauthorized' }, 401);

  const body = await req.json();
  const fields: Array<{
    label?: string;
    name?: string;
    id?: string;
    placeholder?: string;
    autocomplete?: string;
    type?: string;
  }> = body.fields || [];
  const siteHost: string = body.siteHost || '';

  const memoryRows = await prisma.fieldMappingMemory.findMany({
    where: { OR: [{ userId }, { userId: '' }] },
  });
  const memory: StoredMapping[] = memoryRows.map((m) => ({
    fieldPattern: m.fieldPattern,
    mappedField: m.mappedField,
    confidence: m.confidence,
    verified: m.verified,
    siteHost: m.siteHost || undefined,
  }));

  const mapped = fields.map((field) => {
    const hit = matchField(field, memory, siteHost);
    const classification = classifyField([field.label, field.placeholder, field.name].filter(Boolean).join(' '));
    return {
      label: field.label || field.placeholder || field.name || field.id || '',
      type: field.type || 'text',
      classification,
      mapping: hit,
      aiSuggested: false,
    };
  });

  const unknown = mapped.filter((m) => !m.mapping || m.mapping.confidence < 0.75);
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (apiKey && unknown.length > 0) {
    try {
      const suggestions = await suggestMappingsWithAi(unknown.map((u) => u.label), apiKey);
      for (const item of mapped) {
        if (item.mapping && item.mapping.confidence >= 0.75) continue;
        const suggested = suggestions[item.label];
        if (suggested?.key) {
          item.mapping = {
            key: suggested.key,
            confidence: suggested.confidence ?? 0.7,
            method: 'semantic',
            classification: item.classification,
          };
          item.aiSuggested = true;
        }
      }
    } catch (err) {
      console.warn('[apply-agent] AI mapping fallback skipped:', err);
    }
  }

  return jsonWithCors(req, { success: true, fields: mapped });
}

async function suggestMappingsWithAi(
  labels: string[],
  apiKey: string,
): Promise<Record<string, { key: string; confidence: number }>> {
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You map job-application form labels to canonical profile keys. Return JSON {"mappings":[{"label":"...","key":"preferences.expectedSalary"|"custom.someKey"|null,"confidence":0-1}]}. Never invent the user\'s answer. If unsure, key=null. Reusable keys: personal.firstName, personal.lastName, personal.fullName, personal.email, personal.phone, education.college, education.cgpa, education.department, preferences.expectedSalary, preferences.noticePeriod, preferences.workAuthorization, preferences.preferredLocation, links.github, links.linkedin, documents.resume. Application-specific essays should use key=null.',
        },
        { role: 'user', content: JSON.stringify({ labels }) },
      ],
    }),
  });

  if (!res.ok) return {};
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  const out: Record<string, { key: string; confidence: number }> = {};
  for (const row of parsed.mappings || []) {
    if (row?.label && row?.key) out[row.label] = { key: row.key, confidence: row.confidence ?? 0.7 };
  }
  return out;
}
