import { PlatformAdapter } from './adapterInterface';
import { ExtractedEvidenceData } from '../types';

export class UnstopAdapter implements PlatformAdapter {
  id = 'unstop';
  name = 'Unstop (formerly Dare2Compete)';

  matches(url?: string | null, text?: string | null, sender?: string | null): boolean {
    const u = (url || '').toLowerCase();
    const t = (text || '').toLowerCase();
    const s = (sender || '').toLowerCase();

    return (
      u.includes('unstop.com') ||
      s.includes('unstop.com') ||
      t.includes('unstop') ||
      t.includes('dare2compete')
    );
  }

  extract(text: string, lines: string[]): Partial<ExtractedEvidenceData> {
    const lower = text.toLowerCase();
    const result: Partial<ExtractedEvidenceData> = {};

    result.platformName = {
      value: 'Unstop',
      found: true,
      confidence: 0.95,
      rawSnippet: 'Unstop'
    };

    // Unstop Registration / Team ID
    const unstopIdMatch = text.match(/(?:registration\s*id|team\s*id|candidate\s*id)[:\s#]+([A-Za-z0-9-_]{4,24})/i);
    if (unstopIdMatch && unstopIdMatch[1]) {
      result.referenceId = {
        value: unstopIdMatch[1].trim(),
        found: true,
        confidence: 0.95,
        rawSnippet: unstopIdMatch[0]
      };
    }

    // Unstop competition confirmation wording
    if (lower.includes('registration confirmed') || lower.includes('you have successfully registered') || lower.includes('your team is registered')) {
      result.confirmationWording = {
        value: 'SUCCESSFUL_REGISTRATION',
        found: true,
        confidence: 0.98,
        rawSnippet: 'Unstop registration confirmed'
      };
    }

    return result;
  }
}
