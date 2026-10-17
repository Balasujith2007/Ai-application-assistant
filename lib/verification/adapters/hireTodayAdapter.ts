import { PlatformAdapter } from './adapterInterface';
import { ExtractedEvidenceData } from '../types';

export class HireTodayAdapter implements PlatformAdapter {
  id = 'hiretoday';
  name = 'HireToday';

  matches(url?: string | null, text?: string | null, sender?: string | null): boolean {
    const u = (url || '').toLowerCase();
    const t = (text || '').toLowerCase();
    const s = (sender || '').toLowerCase();

    return (
      u.includes('hiretoday') ||
      s.includes('hiretoday') ||
      t.includes('hiretoday')
    );
  }

  extract(text: string, lines: string[]): Partial<ExtractedEvidenceData> {
    const lower = text.toLowerCase();
    const result: Partial<ExtractedEvidenceData> = {};

    result.platformName = {
      value: 'HireToday',
      found: true,
      confidence: 0.95,
      rawSnippet: 'HireToday'
    };

    const appIdMatch = text.match(/(?:application\s*id|job\s*id|applicant\s*id)[:\s#]+([A-Za-z0-9-_]{4,24})/i);
    if (appIdMatch && appIdMatch[1]) {
      result.referenceId = {
        value: appIdMatch[1].trim(),
        found: true,
        confidence: 0.95,
        rawSnippet: appIdMatch[0]
      };
    }

    if (lower.includes('application submitted') || lower.includes('application received')) {
      result.confirmationWording = {
        value: 'APPLICATION_RECEIVED',
        found: true,
        confidence: 0.95,
        rawSnippet: 'HireToday application received'
      };
    }

    return result;
  }
}
