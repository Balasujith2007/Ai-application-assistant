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
  'personal.firstName': ['first name', 'given name', 'forename', 'candidate first name', 'firstname', 'fname', 'first_name', 'first'],
  'personal.lastName': ['last name', 'surname', 'family name', 'candidate last name', 'lastname', 'lname', 'last_name', 'last'],
  'personal.fullName': ['full name', 'candidate name', 'applicant name', 'student name', 'participant name', 'your name', 'name of applicant', 'legal name', 'legal full name', 'complete name', 'name'],
  'personal.email': ['email', 'email address', 'e mail', 'e-mail', 'candidate email', 'student email', 'work email', 'contact email', 'email_address', 'mail'],
  'personal.phone': ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'whatsapp', 'phone no', 'cell', 'telephone', 'phone_number', 'mobile_number', 'primary phone'],
  'personal.dateOfBirth': ['date of birth', 'dob', 'birth date', 'birthday'],
  'personal.gender': ['gender', 'sex'],
  'education.college': ['college', 'college name', 'institution', 'institution name', 'university', 'university name', 'institute', 'school name', 'school', 'undergraduate school', 'school or university'],
  'education.degree': ['degree', 'qualification', 'highest qualification', 'program', 'degree level', 'highest degree', 'education level'],
  'education.department': ['department', 'branch', 'stream', 'specialization', 'course', 'field of study', 'major', 'branch of study'],
  'education.cgpa': ['cgpa', 'gpa', 'grade point average', 'grade', 'percentage', 'marks', 'academic score', 'current cgpa', 'cumulative gpa', 'gpa score'],
  'education.graduationYear': ['graduation year', 'year of graduation', 'passing year', 'expected graduation', 'completion year'],
  'education.year': ['academic year', 'current year', 'year of study', 'year'],
  'links.github': ['github', 'github url', 'github profile', 'github link', 'github profile url', 'github account'],
  'links.linkedin': ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link', 'linkedin profile url', 'linkedin account'],
  'links.portfolio': ['portfolio', 'portfolio url', 'personal website', 'website', 'personal site', 'portfolio website', 'personal portfolio', 'blog url'],
  'links.codolio': ['codolio', 'codolio url', 'codolio profile', 'codolio link'],
  'preferences.expectedSalary': [
    'expected salary', 'expected compensation', 'desired salary', 'salary expectation',
    'expected annual compensation', 'expected annual ctc', 'expected annual salary',
    'current annual ctc', 'ctc', 'expected ctc', 'desired compensation', 'current compensation',
    'compensation expectation', 'salary expectations',
  ],
  'preferences.preferredLocation': [
    'preferred location', 'preferred city', 'location preference', 'job location',
    'preferred work location', 'where would you like to work', 'where would you like to work at',
    'desired location', 'work location preference',
  ],
  'preferences.noticePeriod': [
    'notice period', 'expected notice period', 'availability notice period',
    'availability / notice period', 'how soon can you join', 'joining time',
    'notice duration', 'joining notice', 'availability', 'earliest start date',
  ],
  'preferences.workMode': ['work mode', 'work type', 'preferred work mode', 'preferred workplace'],
  'preferences.workAuthorization': [
    'work authorization', 'work authorisation', 'authorized to work', 'eligible to work',
    'legally authorized', 'work permit', 'authorization to work', 'are you legally authorized',
  ],
  'documents.resume': ['resume', 'cv', 'upload resume', 'attach resume', 'upload cv', 'resume file', 'cv file', 'resume / cv', 'upload resume / cv', 'resume document'],
  'documents.coverLetter': ['cover letter', 'covering letter', 'upload cover letter', 'cover letter file'],
  'skills.list': ['skills', 'technical skills', 'key skills', 'skill set', 'top skills'],
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
