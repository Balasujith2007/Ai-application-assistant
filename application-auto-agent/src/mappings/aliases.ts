export type CanonicalFieldKey =
  | 'personal.firstName'
  | 'personal.lastName'
  | 'personal.fullName'
  | 'personal.email'
  | 'personal.phone'
  | 'personal.dateOfBirth'
  | 'personal.gender'
  | 'personal.nationality'
  | 'personal.country'
  | 'personal.state'
  | 'personal.location'
  | 'personal.pinCode'
  | 'education.college'
  | 'education.degree'
  | 'education.department'
  | 'education.cgpa'
  | 'education.graduationYear'
  | 'education.year'
  | 'education.tenthSchool'
  | 'education.tenthPercentage'
  | 'education.twelfthSchool'
  | 'education.twelfthPercentage'
  | 'education.collegeJoiningYear'
  | 'education.collegeGraduationYear'
  | 'education.major'
  | 'education.minor'
  | 'links.github'
  | 'links.linkedin'
  | 'links.portfolio'
  | 'links.codolio'
  | 'preferences.expectedSalary'
  | 'preferences.preferredLocation'
  | 'preferences.preferredRole'
  | 'preferences.noticePeriod'
  | 'preferences.workMode'
  | 'preferences.previousWorkMode'
  | 'preferences.preferredWorkMode'
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
  'personal.nationality': ['nationality', 'citizenship', 'citizen of', 'country of citizenship'],
  'personal.country': ['country', 'country of residence', 'current country', 'nation'],
  'personal.state': ['state', 'province', 'region', 'state / province', 'state/province'],
  'personal.location': ['location', 'city', 'current location', 'city, state', 'location (city)', 'current city', 'address'],
  'personal.pinCode': ['pincode', 'pin code', 'postal code', 'zip code', 'zip', 'postal', 'zip / postal code'],
  'education.college': ['college', 'college name', 'institution', 'institution name', 'university', 'university name', 'institute', 'school name', 'school', 'undergraduate school', 'school or university'],
  'education.degree': ['degree', 'qualification', 'highest qualification', 'program', 'degree level', 'highest degree', 'education level'],
  'education.department': ['department', 'branch', 'stream', 'specialization', 'course', 'field of study', 'major', 'branch of study'],
  'education.cgpa': ['cgpa', 'gpa', 'grade point average', 'grade', 'percentage', 'marks', 'academic score', 'current cgpa', 'cumulative gpa', 'gpa score'],
  'education.graduationYear': ['graduation year', 'year of graduation', 'passing year', 'expected graduation', 'completion year', 'grad year'],
  'education.year': ['academic year', 'current year', 'year of study', 'year'],
  'education.tenthSchool': ['10th school', 'tenth school', 'sslc school', 'secondary school', '10th institution', 'matriculation school', 'class 10 school', 'x school'],
  'education.tenthPercentage': ['10th percentage', 'tenth percentage', '10th marks', 'tenth marks', 'sslc marks', '10th grade', 'class 10 percentage', 'x marks'],
  'education.twelfthSchool': ['12th school', 'twelfth school', 'hsc school', 'higher secondary school', 'junior college', 'class 12 school', 'xii school', 'puc college'],
  'education.twelfthPercentage': ['12th percentage', 'twelfth percentage', '12th marks', 'twelfth marks', 'hsc marks', '12th grade', 'class 12 percentage', 'xii marks'],
  'education.collegeJoiningYear': ['college joining year', 'year of joining', 'admission year', 'start year of college', 'college start year'],
  'education.collegeGraduationYear': ['college graduation year', 'expected graduation year', 'graduation year of college', 'end year of college'],
  'education.major': ['major', 'college major', 'primary major', 'specialization major'],
  'education.minor': ['minor', 'college minor', 'secondary major'],
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
  'preferences.preferredRole': ['preferred role', 'desired role', 'job role', 'target role', 'desired job title', 'role applied for', 'position of interest'],
  'preferences.noticePeriod': [
    'notice period', 'expected notice period', 'availability notice period',
    'availability / notice period', 'how soon can you join', 'joining time',
    'notice duration', 'joining notice', 'availability', 'earliest start date',
  ],
  'preferences.workMode': ['work mode', 'work type', 'preferred work mode', 'preferred workplace'],
  'preferences.previousWorkMode': ['previous work mode', 'prior work mode', 'past work mode'],
  'preferences.preferredWorkMode': ['preferred work mode', 'work mode preference', 'desired work mode', 'hybrid/remote/onsite'],
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
