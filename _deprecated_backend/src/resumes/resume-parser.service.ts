import { Injectable, Logger } from '@nestjs/common';

/**
 * ResumeParserService — Extension Point for Phase 2
 *
 * This service is intentionally left as a stub.
 * In Phase 2, implement actual PDF/DOCX text extraction
 * and AI-powered profile parsing here.
 */
@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  /**
   * Extract raw text from a resume file.
   * TODO Phase 2: Integrate pdf-parse / mammoth for text extraction
   */
  async extractText(filePath: string): Promise<string> {
    this.logger.log(`[STUB] extractText called for: ${filePath}`);
    return '';
  }

  /**
   * Parse raw resume text into a structured career profile.
   * TODO Phase 2: Use AI/NLP to extract name, skills, education, experience
   */
  async parseProfile(rawText: string): Promise<Record<string, unknown>> {
    this.logger.log('[STUB] parseProfile called — AI parsing not yet implemented');
    return {
      skills: [],
      education: [],
      experience: [],
      projects: [],
      summary: '',
    };
  }
}
