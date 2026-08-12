import { InspectableField } from './FormInspector';

export interface MatchResult {
  fieldKey: string;
  confidence: number;
}

export class FieldMatcher {
  private static dictionaries: Record<string, string[]> = {
    fullName: ['full name', 'name', 'candidate name', 'applicant name', 'student name', 'your name', 'first name', 'last name'],
    email: ['email', 'email address', 'e-mail', 'candidate email', 'applicant email', 'student email'],
    phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'contact number', 'whatsapp', 'phone no'],
    college: ['college', 'institution', 'institution name', 'university', 'university name', 'college name', 'school', 'institute'],
    department: ['department', 'branch', 'course', 'academic branch', 'stream', 'field of study', 'specialization'],
    year: ['year', 'academic year', 'current year', 'year of study', 'semester'],
    cgpa: ['cgpa', 'gpa', 'percentage', 'grade', 'marks', 'academic score'],
    github: ['github', 'github url', 'github profile', 'github link'],
    linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link'],
    codolio: ['codolio', 'codolio url', 'codolio profile', 'codolio link'],
    resume: ['resume', 'cv', 'upload resume', 'attach resume', 'upload cv', 'resume link']
  };

  public static match(field: InspectableField): MatchResult | null {
    const textToMatch = `${field.label} ${field.placeholder} ${field.name} ${field.id} ${field.parentText}`.toLowerCase();

    let bestMatch: MatchResult | null = null;

    for (const [key, aliases] of Object.entries(this.dictionaries)) {
      for (const alias of aliases) {
        if (textToMatch.includes(alias)) {
          // Calculate confidence score based on match position & signal strength
          let confidence = 0.85;

          const exactLabelMatch = field.label.toLowerCase().includes(alias);
          const exactNameMatch = field.name.toLowerCase().includes(alias);
          const exactPlaceholderMatch = field.placeholder.toLowerCase().includes(alias);

          if (exactLabelMatch || exactNameMatch) confidence = 0.98;
          else if (exactPlaceholderMatch) confidence = 0.92;

          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { fieldKey: key, confidence };
          }
        }
      }
    }

    return bestMatch;
  }
}
