/**
 * Field Normalization and Smart Matching Utility
 * Matches external form labels, input names, placeholders, and aria-labels
 * to the student's stored CareerAI profile and active resume data.
 * Includes query prefill detection for supported form engines.
 */

export interface StudentProfileData {
  userId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
  year?: string | number;
  college?: string;
  cgpa?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  codolioUrl?: string;
  location?: string;
  skillsList?: string[];
  educationList?: any[];
  projectsList?: any[];
  experiencesList?: any[];
  resumeName?: string | null;
  resumeUrl?: string | null;
}

export interface MatchedFieldResult {
  key: string;
  label: string;
  value: string;
  isMatched: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'NONE';
}

/**
 * Detects whether a URL belongs to a form engine known to consume GET query string parameters.
 * Examples: Google Forms (/viewform), Typeform, Tally.so, JotForm.
 */
export function isQueryPrefillSupported(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('docs.google.com/forms') || lower.includes('forms.gle')) return true;
  if (lower.includes('typeform.com') || lower.includes('.tally.so') || lower.includes('jotform.com')) return true;
  return false;
}

/**
 * Constructs a prefilled registration URL ONLY when the target domain is known
 * to consume query parameters natively. Returns original URL otherwise.
 */
export function buildPrefilledRegistrationUrl(baseUrl: string, studentData: StudentProfileData): string {
  if (!baseUrl) return '';
  if (!isQueryPrefillSupported(baseUrl)) return baseUrl;

  try {
    const url = new URL(baseUrl);
    const nameVal = studentData.fullName || studentData.name;
    if (nameVal) {
      url.searchParams.set('name', nameVal);
      url.searchParams.set('fullName', nameVal);
    }
    if (studentData.email) url.searchParams.set('email', studentData.email);
    if (studentData.phone) {
      url.searchParams.set('phone', studentData.phone);
      url.searchParams.set('mobile', studentData.phone);
    }
    if (studentData.college) {
      url.searchParams.set('college', studentData.college);
      url.searchParams.set('institution', studentData.college);
    }
    if (studentData.department) url.searchParams.set('department', studentData.department);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Normalizes field strings by stripping punctuation, extra spaces, and casing.
 */
export function normalizeLabel(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[*:\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart matching layer that links form field labels / names / placeholders
 * to student profile fields.
 */
export function matchFieldToProfile(fieldIdentifier: string, studentData: StudentProfileData): MatchedFieldResult {
  const norm = normalizeLabel(fieldIdentifier);

  // 1. Full Name
  if (/full name|candidate name|participant name|applicant name|^name$/i.test(norm)) {
    const val = studentData.fullName || studentData.name || '';
    return { key: 'fullName', label: 'Full Name', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 2. Email
  if (/email address|e mail|participant email|candidate email|^email$/i.test(norm)) {
    const val = studentData.email || '';
    return { key: 'email', label: 'Email', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 3. Phone / Mobile Number
  if (/mobile number|phone number|contact number|whatsapp number|^phone$|^mobile$/i.test(norm)) {
    const val = studentData.phone || '';
    return { key: 'phone', label: 'Phone Number', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 4. Institution / College
  if (/institution|institute name|organization|college name|university name|^college$|^university$/i.test(norm)) {
    const val = studentData.college || '';
    return { key: 'college', label: 'College / Institution', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 5. Department / Branch / Course
  if (/department|branch|stream|specialization|course|degree program/i.test(norm)) {
    const val = studentData.department || '';
    return { key: 'department', label: 'Department', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 6. Academic Year
  if (/academic year|current year|year of study|^year$/i.test(norm)) {
    const val = studentData.year ? String(studentData.year) : '';
    return { key: 'year', label: 'Academic Year', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 7. CGPA / Percentage
  if (/cgpa|grade|gpa|percentage/i.test(norm)) {
    const val = studentData.cgpa || '';
    return { key: 'cgpa', label: 'CGPA', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 8. GitHub Profile
  if (/github profile|github url|^github$/i.test(norm)) {
    const val = studentData.githubUrl || '';
    return { key: 'githubUrl', label: 'GitHub Profile', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 9. LinkedIn Profile
  if (/linkedin profile|linkedin url|^linkedin$/i.test(norm)) {
    const val = studentData.linkedinUrl || '';
    return { key: 'linkedinUrl', label: 'LinkedIn Profile', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 10. Codolio Profile
  if (/codolio profile|codolio url|^codolio$/i.test(norm)) {
    const val = studentData.codolioUrl || '';
    return { key: 'codolioUrl', label: 'Codolio Profile', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  // 11. Skills (from Profile/Resume)
  if (/skills|technical skills|key skills/i.test(norm)) {
    const val = (studentData.skillsList || []).join(', ');
    return { key: 'skills', label: 'Skills', value: val, isMatched: !!val, confidence: 'MEDIUM' };
  }

  // 12. Location
  if (/location|city|current city/i.test(norm)) {
    const val = studentData.location || '';
    return { key: 'location', label: 'Location', value: val, isMatched: !!val, confidence: 'MEDIUM' };
  }

  // 13. Resume File
  if (/resume|cv|upload resume|attach resume/i.test(norm)) {
    const val = studentData.resumeUrl || '';
    return { key: 'resume', label: 'Active Resume', value: val, isMatched: !!val, confidence: 'HIGH' };
  }

  return { key: norm, label: fieldIdentifier, value: '', isMatched: false, confidence: 'NONE' };
}

/**
 * Returns summary counts of matched vs manual input required fields.
 */
export function evaluateFormMatching(fields: string[], studentData: StudentProfileData) {
  const matched: MatchedFieldResult[] = [];
  const manual: string[] = [];

  for (const field of fields) {
    const res = matchFieldToProfile(field, studentData);
    if (res.isMatched) {
      matched.push(res);
    } else {
      manual.push(field);
    }
  }

  return {
    matched,
    manual,
    matchedCount: matched.length,
    manualCount: manual.length
  };
}
