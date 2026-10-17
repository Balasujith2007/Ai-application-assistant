import { ExtractedEvidenceData } from '../types';

export interface PlatformAdapter {
  id: string;
  name: string;
  matches(url?: string | null, text?: string | null, sender?: string | null): boolean;
  extract(text: string, lines: string[]): Partial<ExtractedEvidenceData>;
}
