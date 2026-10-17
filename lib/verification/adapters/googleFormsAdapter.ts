import { PlatformAdapter } from './adapterInterface';
import { ExtractedEvidenceData } from '../types';

export class GoogleFormsAdapter implements PlatformAdapter {
  id = 'google_forms';
  name = 'Google Forms';

  matches(url?: string | null, text?: string | null, sender?: string | null): boolean {
    const u = (url || '').toLowerCase();
    const t = (text || '').toLowerCase();
    const s = (sender || '').toLowerCase();

    return (
      u.includes('docs.google.com/forms') ||
      u.includes('forms.gle') ||
      s.includes('google.com') ||
      t.includes('google forms') ||
      t.includes('your response has been recorded') ||
      t.includes('thanks for filling out')
    );
  }

  extract(text: string, lines: string[]): Partial<ExtractedEvidenceData> {
    const lower = text.toLowerCase();
    const result: Partial<ExtractedEvidenceData> = {};

    result.platformName = {
      value: 'Google Forms',
      found: true,
      confidence: 0.95,
      rawSnippet: 'Google Forms'
    };

    // Google Forms response receipt
    if (lower.includes('your response has been recorded') || lower.includes('thanks for filling out') || lower.includes('response submitted')) {
      result.confirmationWording = {
        value: 'SUCCESSFUL_REGISTRATION',
        found: true,
        confidence: 0.98,
        rawSnippet: 'Google Forms confirmation receipt'
      };
    }

    // Google forms title extraction: usually line 1 or line 2 before "Thanks for filling out"
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      if (!line.toLowerCase().includes('google forms') && !line.toLowerCase().includes('thanks for') && line.length > 3) {
        result.opportunityName = {
          value: line.trim(),
          found: true,
          confidence: 0.85,
          rawSnippet: line
        };
        break;
      }
    }

    return result;
  }
}
