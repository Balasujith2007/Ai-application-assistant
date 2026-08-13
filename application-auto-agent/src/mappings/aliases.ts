export type CanonicalFieldKey =
  | 'personal.firstName'
  | 'personal.lastName'
  | 'personal.fullName'
  | 'personal.email'
  | 'personal.phone'
  | 'personal.dateOfBirth'
  | 'personal.gender'
  | 'education.college'
  | 'education.degree'
  | 'education.department'
  | 'education.cgpa'
  | 'education.graduationYear'
  | 'education.year'
  | 'links.github'
  | 'links.linkedin'
  | 'links.portfolio'
  | 'links.codolio'
  | 'preferences.expectedSalary'
  | 'preferences.preferredLocation'
  | 'preferences.noticePeriod'
  | 'preferences.workMode'
  | 'preferences.workAuthorization'
  | 'documents.resume'
  | 'documents.coverLetter'
  | 'skills.list';

export const FIELD_ALIASES: Record<CanonicalFieldKey, string[]> = {
  'personal.firstName': ['first name', 'given name', 'forename', 'candidate first name', 'firstname', 'fname'],
  'personal.lastName': ['last name', 'surname', 'family name', 'candidate last name', 'lastname', 'lname'],
  'personal.fullName': ['full name', 'candidate name', 'applicant name', 'student name', 'participant name', 'your name', 'name of applicant'],
  'personal.email': ['email', 'email address', 'e mail', 'e-mail', 'candidate email', 'student email', 'work email', 'contact email'],
  'personal.phone': ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'whatsapp', 'phone no', 'cell', 'telephone'],
  'personal.dateOfBirth': ['date of birth', 'dob', 'birth date', 'birthday'],
  'personal.gender': ['gender', 'sex'],
  'education.college': ['college', 'college name', 'institution', 'institution name', 'university', 'university name', 'institute', 'school name'],
  'education.degree': ['degree', 'qualification', 'highest qualification', 'program'],
  'education.department': ['department', 'branch', 'stream', 'specialization', 'course', 'field of study', 'major'],
  'education.cgpa': ['cgpa', 'gpa', 'grade', 'percentage', 'marks', 'academic score', 'current cgpa'],
  'education.graduationYear': ['graduation year', 'year of graduation', 'passing year', 'expected graduation'],
  'education.year': ['academic year', 'current year', 'year of study', 'year'],
  'links.github': ['github', 'github url', 'github profile', 'github link'],
  'links.linkedin': ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link'],
  'links.portfolio': ['portfolio', 'portfolio url', 'personal website', 'website'],
  'links.codolio': ['codolio', 'codolio url', 'codolio profile'],
  'preferences.expectedSalary': [
    'expected salary', 'expected compensation', 'desired salary', 'salary expectation',
    'expected annual compensation', 'expected annual ctc', 'expected annual salary',
    'current annual ctc', 'ctc', 'expected ctc', 'desired compensation', 'current compensation',
  ],
  'preferences.preferredLocation': ['preferred location', 'preferred city', 'location preference', 'job location', 'preferred work location'],
  'preferences.noticePeriod': [
    'notice period', 'expected notice period', 'availability notice period',
    'availability / notice period', 'how soon can you join', 'joining time',
  ],
  'preferences.workMode': ['work mode', 'work type', 'preferred work mode'],
  'preferences.workAuthorization': [
    'work authorization', 'work authorisation', 'authorized to work', 'eligible to work',
    'legally authorized', 'work permit',
  ],
  'documents.resume': ['resume', 'cv', 'upload resume', 'attach resume', 'upload cv', 'resume file'],
  'documents.coverLetter': ['cover letter', 'covering letter', 'upload cover letter'],
  'skills.list': ['skills', 'technical skills', 'key skills', 'skill set'],
};

export const SENSITIVE_PATTERNS = [
  'citizenship', 'citizen', 'nationality', 'gender', 'sex', 'disability', 'disabled',
  'veteran', 'visa', 'work authorization', 'work authorisation', 'race', 'ethnicity',
  'criminal', 'conviction', 'hispanic', 'religion', 'caste',
];

export const LEGAL_PATTERNS = [
  'terms', 'conditions', 'privacy policy', 'i agree', 'declaration', 'certify',
  'signature', 'acknowledge', 'consent to',
];

export const APPLICATION_SPECIFIC_PATTERNS = [
  'why do you want', 'why this company', 'why should we hire', 'what motivates',
  'why are you interested', 'tell us about a time', 'describe a time',
  'leadership experience', 'greatest weakness', 'why join', 'motivation to join',
];

export const DOCUMENT_PATTERNS = ['resume', 'cv', 'cover letter', 'certificate', 'transcript', 'portfolio file'];
